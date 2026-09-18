export type Task = {
  id: string;
  title: string;
  groupId: string;
  status: "pending" | "completed";
  order: number;
};

export type Group = { id: string; name: string; order: number };
export type Wall = {
  schemaVersion: 1;
  tasks: Task[];
  groups: Group[];
  focusedTaskId: string | null;
  draft: { title: string } | null;
};

export type Mode =
  | { kind: "board" }
  | { kind: "focused" }
  | { kind: "placing-new"; previousFocus: string | null }
  | { kind: "placing-existing"; taskId: string; previousFocus: string | null };

export type Action =
  | {
      type: "create";
      id: string;
      title: string;
      groupId: string;
      index?: number;
    }
  | { type: "edit"; id: string; title: string }
  | { type: "move"; id: string; groupId: string; index?: number }
  | { type: "toggle"; id: string }
  | { type: "delete-task"; id: string }
  | { type: "focus"; id: string | null }
  | { type: "add-group"; id: string; name: string }
  | { type: "edit-group"; id: string; name: string }
  | { type: "delete-group"; id: string }
  | { type: "draft"; title: string };

export function initialWall(): Wall {
  return {
    schemaVersion: 1,
    tasks: [],
    groups: ["Urgente", "Hoy", "Cuando no haya nada"].map((name, order) => ({
      id: `group-${order + 1}`,
      name,
      order,
    })),
    focusedTaskId: null,
    draft: null,
  };
}

export function tasksIn(
  wall: Wall,
  groupId: string,
  status: Task["status"] = "pending",
) {
  return wall.tasks
    .filter((task) => task.groupId === groupId && task.status === status)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

function titleOf(value: string, max = 500) {
  const result = value.trim();
  if (!result || result.length > max)
    throw new Error(`Escribe entre 1 y ${max} caracteres.`);
  return result;
}

export function reduceWall(current: Wall, action: Action): Wall {
  const wall = structuredClone(current);
  const findTask = (id: string) => {
    const task = wall.tasks.find((item) => item.id === id);
    if (!task) throw new Error("Esta tarea ya no existe.");
    return task;
  };
  const place = (task: Task, groupId: string, index?: number) => {
    if (!wall.groups.some((group) => group.id === groupId))
      throw new Error("Elige un grupo existente.");
    const siblings = tasksIn(wall, groupId, task.status).filter(
      (item) => item.id !== task.id,
    );
    task.groupId = groupId;
    siblings.splice(
      index === undefined
        ? siblings.length
        : Math.max(0, Math.min(index, siblings.length)),
      0,
      task,
    );
    siblings.forEach((item, order) => {
      item.order = order;
    });
  };
  switch (action.type) {
    case "create": {
      if (wall.tasks.some((task) => task.id === action.id))
        throw new Error("La tarea ya existe.");
      const task: Task = {
        id: action.id,
        title: titleOf(action.title),
        groupId: action.groupId,
        status: "pending",
        order: 0,
      };
      place(task, action.groupId, action.index);
      wall.tasks.push(task);
      wall.draft = null;
      wall.focusedTaskId = null;
      break;
    }
    case "edit":
      findTask(action.id).title = titleOf(action.title);
      break;
    case "move":
      place(findTask(action.id), action.groupId, action.index);
      break;
    case "toggle": {
      const task = findTask(action.id);
      task.status = task.status === "pending" ? "completed" : "pending";
      place(task, task.groupId);
      if (wall.focusedTaskId === task.id) wall.focusedTaskId = null;
      break;
    }
    case "delete-task": {
      const task = findTask(action.id);
      wall.tasks = wall.tasks.filter((item) => item.id !== task.id);
      tasksIn(wall, task.groupId, task.status).forEach((item, order) => {
        item.order = order;
      });
      if (wall.focusedTaskId === task.id) wall.focusedTaskId = null;
      break;
    }
    case "focus":
      if (action.id !== null && findTask(action.id).status !== "pending")
        throw new Error("Solo puedes enfocar tareas pendientes.");
      wall.focusedTaskId = action.id;
      break;
    case "add-group": {
      const name = titleOf(action.name, 64);
      if (
        wall.groups.some(
          (group) =>
            group.id === action.id ||
            group.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
        )
      ) {
        throw new Error("Ya existe un grupo con ese nombre.");
      }
      wall.groups.push({ id: action.id, name, order: wall.groups.length });
      break;
    }
    case "edit-group": {
      const group = wall.groups.find((group) => group.id === action.id);
      if (!group) throw new Error("El grupo ya no existe.");
      const name = titleOf(action.name, 64);
      if (wall.groups.some((other) =>
        other.id !== action.id &&
        other.name.toLocaleLowerCase() === name.toLocaleLowerCase()
      )) throw new Error("Ya existe un grupo con ese nombre.");
      group.name = name;
      break;
    }
    case "delete-group":
      if (wall.tasks.some((task) => task.groupId === action.id))
        throw new Error("Este grupo todavia contiene tareas.");
      wall.groups = wall.groups.filter((group) => group.id !== action.id);
      wall.groups.forEach((group, order) => {
        group.order = order;
      });
      break;
    case "draft":
      wall.draft = action.title ? { title: action.title.slice(0, 500) } : null;
      break;
  }
  return wall;
}

export function parseWall(raw: string): Wall {
  const data: unknown = JSON.parse(raw);
  const record = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;
  const text = (value: unknown, max: number): value is string =>
    typeof value === "string" && !!value.trim() && value.length <= max;
  const position = (value: unknown) =>
    Number.isSafeInteger(value) && Number(value) >= 0;
  if (
    !record(data) ||
    data.schemaVersion !== 1 ||
    !Array.isArray(data.groups) ||
    !Array.isArray(data.tasks)
  )
    throw new Error("Formato desconocido.");
  const groupIds = new Set<string>();
  const taskIds = new Set<string>();
  for (const group of data.groups) {
    if (
      !record(group) ||
      !text(group.id, 100) ||
      !text(group.name, 64) ||
      !position(group.order) ||
      groupIds.has(group.id)
    )
      throw new Error("Grupos invalidos.");
    groupIds.add(group.id);
  }
  for (const task of data.tasks) {
    if (
      !record(task) ||
      !text(task.id, 100) ||
      !text(task.title, 500) ||
      typeof task.groupId !== "string" ||
      !groupIds.has(task.groupId) ||
      !["pending", "completed"].includes(String(task.status)) ||
      !position(task.order) ||
      taskIds.has(task.id)
    )
      throw new Error("Tareas invalidas.");
    taskIds.add(task.id);
  }
  if (
    data.draft !== null &&
    (!record(data.draft) ||
      typeof data.draft.title !== "string" ||
      data.draft.title.length > 500)
  )
    throw new Error("Borrador invalido.");
  if (
    data.focusedTaskId !== null &&
    !data.tasks.some(
      (task) => task.id === data.focusedTaskId && task.status === "pending",
    )
  )
    throw new Error("Focus invalido.");
  return data as Wall;
}
