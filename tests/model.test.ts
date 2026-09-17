import test from "node:test";
import assert from "node:assert/strict";
import {
  initialWall,
  parseWall,
  reduceWall,
  tasksIn,
} from "../src/components/Wall/model.ts";
import { readWall, writeWall } from "../src/components/Wall/storage.ts";

const create = (id = "a") =>
  reduceWall(initialWall(), {
    type: "create",
    id,
    title: "Mi tarea",
    groupId: "group-1",
  });

test("crear exige un grupo real y nunca convierte Focus en grupo", () => {
  for (const groupId of ["", "focus", "inexistente"]) {
    assert.throws(() =>
      reduceWall(initialWall(), {
        type: "create",
        id: "a",
        title: "Tarea",
        groupId,
      }),
    );
  }
  assert.throws(() =>
    reduceWall(initialWall(), { type: "focus", id: "draft" }),
  );
});

test("un borrador no es una tarea y sobrevive a la serializacion", () => {
  const wall = reduceWall(initialWall(), {
    type: "draft",
    title: "  Sin colocar  ",
  });
  assert.equal(wall.tasks.length, 0);
  assert.deepEqual(parseWall(JSON.stringify(wall)), wall);
  assert.equal(
    reduceWall(wall, {
      type: "create",
      id: "a",
      title: wall.draft!.title,
      groupId: "group-1",
    }).draft,
    null,
  );
});

test("Focus conserva grupo y orden, completar lo cierra", () => {
  const before = create();
  const focused = reduceWall(before, { type: "focus", id: "a" });
  assert.deepEqual(focused.tasks, before.tasks);
  const done = reduceWall(focused, { type: "toggle", id: "a" });
  assert.equal(done.focusedTaskId, null);
  assert.throws(() => reduceWall(done, { type: "focus", id: "a" }));
  assert.equal(
    reduceWall(done, { type: "toggle", id: "a" }).tasks[0].status,
    "pending",
  );
});

test("mover y reordenar no duplica tareas ni modifica el estado anterior", () => {
  const before = reduceWall(create(), {
    type: "create",
    id: "b",
    title: "Otra",
    groupId: "group-1",
  });
  const after = reduceWall(before, {
    type: "move",
    id: "b",
    groupId: "group-1",
    index: 0,
  });
  assert.deepEqual(
    tasksIn(after, "group-1").map((task) => task.id),
    ["b", "a"],
  );
  assert.deepEqual(
    tasksIn(before, "group-1").map((task) => task.id),
    ["a", "b"],
  );
  assert.equal(
    reduceWall(after, { type: "move", id: "a", groupId: "group-2" }).tasks
      .length,
    2,
  );
});

test("un grupo con tareas hechas no se puede eliminar", () => {
  const wall = reduceWall(create(), { type: "toggle", id: "a" });
  assert.throws(() =>
    reduceWall(wall, { type: "delete-group", id: "group-1" }),
  );
  assert.equal(
    reduceWall(wall, { type: "delete-group", id: "group-2" }).groups.length,
    2,
  );
});

test("se conserva un tablero sin grupos, sin reinicializarlo", () => {
  let wall = initialWall();
  for (const group of wall.groups)
    wall = reduceWall(wall, { type: "delete-group", id: group.id });
  const loaded = readWall({
    getItem: () => JSON.stringify(wall),
    setItem() {},
  });
  assert.equal(loaded.wall.groups.length, 0);
  assert.equal(loaded.blocked, false);
});

test("datos corruptos y versiones desconocidas se bloquean sin escribir", () => {
  for (const raw of [
    "{",
    '{"schemaVersion":2}',
    JSON.stringify({ ...create(), groups: [] }),
  ]) {
    let writes = 0;
    const result = readWall({
      getItem: () => raw,
      setItem() {
        writes++;
      },
    });
    assert.equal(result.blocked, true);
    assert.equal(writes, 0);
  }
  assert.throws(() =>
    parseWall(
      JSON.stringify({
        ...create(),
        tasks: [create().tasks[0], create().tasks[0]],
      }),
    ),
  );
});

test("un fallo al guardar se comunica al controlador", () => {
  assert.equal(
    writeWall(
      {
        getItem: () => null,
        setItem() {
          throw new Error("Quota");
        },
      },
      create(),
    ),
    false,
  );
});

test("eliminar limpia Focus, conserva las demas tareas y permite borrar el grupo vacio", () => {
  const original = reduceWall(create(), {
    type: "create",
    id: "b",
    title: "Otra tarea",
    groupId: "group-1",
  });
  const focused = reduceWall(original, { type: "focus", id: "a" });
  const deleted = reduceWall(focused, { type: "delete-task", id: "a" });
  assert.equal(deleted.focusedTaskId, null);
  assert.deepEqual(
    deleted.tasks.map((task) => task.id),
    ["b"],
  );
  assert.equal(deleted.tasks[0].order, 0);
  assert.equal(focused.tasks.length, 2);
  assert.deepEqual(parseWall(JSON.stringify(deleted)), deleted);
  const completed = reduceWall(deleted, { type: "toggle", id: "b" });
  const empty = reduceWall(completed, { type: "delete-task", id: "b" });
  assert.equal(
    reduceWall(empty, { type: "delete-group", id: "group-1" }).groups.length,
    2,
  );
});

test("texto vacio e IDs repetidos se rechazan", () => {
  assert.throws(() =>
    reduceWall(create(), { type: "edit", id: "a", title: " " }),
  );
  assert.throws(() =>
    reduceWall(create(), {
      type: "create",
      id: "a",
      title: "Otra",
      groupId: "group-2",
    }),
  );
  assert.throws(() =>
    reduceWall(initialWall(), { type: "add-group", id: "g", name: "  HOY  " }),
  );
});
