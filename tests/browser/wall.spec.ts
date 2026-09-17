import { test, expect, type Page } from "@playwright/test";

const root = (page: Page) => page.locator("[data-wall]");
const group = (page: Page, id: number) =>
  page.locator(`section[data-group-id="group-${id}"]`);
const saved = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("thewall:data")!));

async function add(
  page: Page,
  title = "Preparar el proyecto",
  destination = "Hoy",
) {
  await page.getByRole("textbox", { name: "Nueva tarea" }).fill(title);
  await page.getByRole("button", { name: "Crear tarea", exact: true }).click();
  await page
    .getByRole("button", { name: `Colocar en ${destination}`, exact: true })
    .click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(root(page)).toHaveAttribute("data-mounted", "true");
});

test("crear exige grupo, editar, completar y reabrir persisten", async ({
  page,
}) => {
  await page
    .getByRole("textbox", { name: "Nueva tarea" })
    .fill("Primera tarea");
  await page.getByRole("button", { name: "Crear tarea", exact: true }).click();
  await expect(root(page)).toHaveAttribute("data-mode", "placing-new");
  await expect(page.locator("[data-action=focus]")).toBeDisabled();
  expect((await saved(page)).tasks).toHaveLength(0);
  await page
    .getByRole("button", { name: "Colocar en Hoy", exact: true })
    .click();
  await page.getByRole("button", { name: "Editar tarea", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Texto de la tarea" })
    .fill("Tarea editada");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(group(page, 2)).toContainText("Tarea editada");
  await page.reload();
  await expect(group(page, 2)).toContainText("Tarea editada");
  await page
    .getByRole("button", { name: "Completar tarea", exact: true })
    .click();
  await page.locator("[data-action=completed]").click();
  await expect(page.getByText("Tarea editada", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Borrar Hoy", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Reabrir tarea", exact: true })
    .click();
  await page.locator("[data-action=pending]").click();
  await expect(group(page, 2)).toContainText("Tarea editada");
});

test("eliminar tareas pendientes y hechas persiste y libera el grupo", async ({
  page,
}, info) => {
  await add(page, "Tarea para borrar");
  await page
    .getByRole("button", { name: "Eliminar tarea", exact: true })
    .click();
  await expect(root(page)).toHaveAttribute("data-mode", "board");
  await expect(page.locator("[data-total-pending]")).toHaveText("0");
  await page.reload();
  expect((await saved(page)).tasks).toHaveLength(0);
  await add(page, "Tarea completada para borrar");
  await page
    .getByRole("button", { name: "Completar tarea", exact: true })
    .click();
  await page.locator("[data-action=completed]").click();
  await page.screenshot({
    path: `test-results/${info.project.name}-delete-control.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Eliminar tarea", exact: true })
    .click();
  await expect(page.locator("[data-total-completed]")).toHaveText("0");
  await expect(
    page.getByRole("button", { name: "Borrar Hoy", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Borrar Hoy", exact: true }).click();
  await page.reload();
  expect((await saved(page)).tasks).toHaveLength(0);
  await expect(group(page, 2)).toHaveCount(0);
});

test("eliminar en Focus restaura el tablero y no deja una referencia guardada", async ({
  page,
}) => {
  await add(page);
  await page
    .getByRole("button", { name: "Mover: Preparar el proyecto", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Eliminar tarea", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Traer al foco", exact: true })
    .click();
  await page
    .locator("[data-focus-list]")
    .getByRole("button", { name: "Eliminar tarea", exact: true })
    .click();
  await expect(root(page)).toHaveAttribute("data-mode", "board");
  await expect(
    page.getByRole("textbox", { name: "Nueva tarea" }),
  ).toBeVisible();
  expect((await saved(page)).focusedTaskId).toBeNull();
  await page.reload();
  await expect(root(page)).toHaveAttribute("data-mode", "board");
  expect((await saved(page)).tasks).toHaveLength(0);
});

test("mover por clic y Focus mantienen una sola tarea con su grupo", async ({
  page,
}) => {
  await add(page);
  await page
    .getByRole("button", { name: "Mover: Preparar el proyecto", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Colocar en Urgente", exact: true })
    .click();
  await group(page, 1)
    .getByRole("button", { name: "Mover: Preparar el proyecto", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Traer al foco", exact: true })
    .click();
  await expect(root(page)).toHaveAttribute("data-mode", "focused");
  await expect(page.locator("[data-board]")).toBeHidden();
  await expect(page.locator("[data-focus-list]")).toContainText(
    "Preparar el proyecto",
  );
  expect((await saved(page)).tasks).toHaveLength(1);
  expect((await saved(page)).tasks[0].groupId).toBe("group-1");
  await page.reload();
  await expect(root(page)).toHaveAttribute("data-mode", "focused");
  await page
    .getByRole("button", { name: "Salir de Focus", exact: true })
    .click();
  await expect(group(page, 1)).toContainText("Preparar el proyecto");
});

test("Focus oculta creacion, conserva el borrador y completar restaura el tablero", async ({
  page,
}) => {
  await add(page);
  await page.getByRole("textbox", { name: "Nueva tarea" }).fill("Otro asunto");
  await page
    .getByRole("button", { name: "Mover: Preparar el proyecto", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Traer al foco", exact: true })
    .click();
  await expect(root(page)).toHaveAttribute("data-mode", "focused");
  await expect(page.locator("[data-composer]")).toBeHidden();
  await expect(page.locator(".wall_composer-heading")).toBeHidden();
  await expect(page.locator(".wall_create")).toBeHidden();
  await page
    .locator("[data-focus-list]")
    .getByRole("button", { name: "Completar tarea", exact: true })
    .click();
  await expect(root(page)).toHaveAttribute("data-mode", "board");
  await expect(page.getByRole("textbox", { name: "Nueva tarea" })).toHaveValue(
    "Otro asunto",
  );
  await expect(
    page.getByRole("button", { name: "Crear tarea", exact: true }),
  ).toBeVisible();
});

test("borrador se restaura y texto HTML no se interpreta", async ({ page }) => {
  await page.getByRole("textbox", { name: "Nueva tarea" }).fill("Sin colocar");
  await page.getByRole("button", { name: "Crear tarea", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Nueva tarea" })).toHaveValue(
    "Sin colocar",
  );
  await add(page, '<img src=x onerror="window.hacked=true">');
  await expect(group(page, 2).locator("[data-task-text]")).toHaveText(
    '<img src=x onerror="window.hacked=true">',
  );
  expect(await page.evaluate(() => "hacked" in window)).toBe(false);
});

test("borrar grupos vacios y crear sin grupos conserva la tarea", async ({
  page,
}) => {
  for (const name of ["Urgente", "Hoy", "Cuando no haya nada"])
    await page
      .getByRole("button", { name: `Borrar ${name}`, exact: true })
      .click();
  await page.reload();
  await expect(page.locator("section[data-group-id]")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Nueva tarea" }).fill("Nueva idea");
  await page.getByRole("button", { name: "Crear tarea", exact: true }).click();
  await page.getByRole("textbox", { name: "Nombre del grupo" }).fill("Ideas");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page
    .getByRole("button", { name: "Colocar en Ideas", exact: true })
    .click();
  expect((await saved(page)).tasks[0].title).toBe("Nueva idea");
});

test("teclado selecciona, coloca y cancela", async ({ page }) => {
  await add(page);
  await page
    .getByRole("button", { name: "Mover: Preparar el proyecto", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(root(page)).toHaveAttribute("data-mode", "placing-existing");
  await page.keyboard.press("Escape");
  await expect(root(page)).toHaveAttribute("data-mode", "board");
  await page
    .getByRole("button", { name: "Mover: Preparar el proyecto", exact: true })
    .focus();
  await page.keyboard.press("Space");
  await page
    .getByRole("button", { name: "Colocar en Urgente", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  expect((await saved(page)).tasks[0].groupId).toBe("group-1");
});

test("arrastrar una tarea con SortableJS cambia de grupo", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "El gesto tactil se verifica en su prueba especifica.",
  );
  await add(page);
  const handle = page.getByRole("button", {
    name: "Mover: Preparar el proyecto",
    exact: true,
  });
  const from = (await handle.boundingBox())!;
  await page.mouse.move(from.x + 25, from.y + 20);
  await page.mouse.down();
  await page.waitForTimeout(350);
  await expect(page.locator(".is-held")).toHaveCount(1);
  await page.mouse.move(from.x + 45, from.y + 25, { steps: 4 });
  await page.waitForTimeout(400);
  const to = (await group(page, 1).locator("[data-drop]").boundingBox())!;
  await page.mouse.move(to.x + to.width / 2, to.y + 40, { steps: 20 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect
    .poll(async () => (await saved(page)).tasks[0].groupId)
    .toBe("group-1");
  expect((await saved(page)).tasks).toHaveLength(1);
});

test("pulsacion larga tactil activa shake sin colocar accidentalmente", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile", "Solo emulacion tactil.");
  await add(page);
  const button = page.getByRole("button", {
    name: "Mover: Preparar el proyecto",
    exact: true,
  });
  await button.scrollIntoViewIfNeeded();
  const box = (await button.boundingBox())!;
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + 20, y: box.y + 20 }],
  });
  await page.waitForTimeout(350);
  await expect(root(page)).toHaveAttribute("data-mode", "placing-existing");
  await expect(page.locator(".is-held")).toHaveCount(1);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(root(page)).toHaveAttribute("data-mode", "placing-existing");
  expect((await saved(page)).tasks[0].groupId).toBe("group-2");
});

test("arrastre fuera de destino y Escape no confirman movimientos", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Prueba de raton.");
  await add(page);
  const start = async () => {
    const box = (await page
      .getByRole("button", { name: "Mover: Preparar el proyecto", exact: true })
      .boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 40, box.y + 30, { steps: 4 });
    await page.waitForTimeout(400);
  };
  await start();
  await page.mouse.move(10, 10, { steps: 10 });
  await page.mouse.up();
  await expect(root(page)).toHaveAttribute("data-mode", "placing-existing");
  expect((await saved(page)).tasks[0].groupId).toBe("group-2");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  await start();
  const target = (await group(page, 1).locator("[data-drop]").boundingBox())!;
  await page.mouse.move(target.x + 30, target.y + 30, { steps: 10 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(root(page)).toHaveAttribute("data-mode", "board");
  await expect(page.locator(".sortable-fallback")).toHaveCount(0);
  expect((await saved(page)).tasks[0].groupId).toBe("group-2");
});

test("arrastrar el borrador lo confirma una sola vez", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Prueba de raton.");
  await page
    .getByRole("textbox", { name: "Nueva tarea" })
    .fill("Un borrador arrastrable");
  await page.getByRole("button", { name: "Crear tarea", exact: true }).click();
  const from = (await page
    .locator("[data-draft-list] [data-action=select]")
    .boundingBox())!;
  const to = (await group(page, 1).locator("[data-drop]").boundingBox())!;
  await page.mouse.move(from.x + 20, from.y + 20);
  await page.mouse.down();
  await page.mouse.move(to.x + 35, to.y + 35, { steps: 25 });
  await page.waitForTimeout(250);
  await page.mouse.up();
  await expect.poll(async () => (await saved(page)).tasks.length).toBe(1);
  expect((await saved(page)).tasks[0].groupId).toBe("group-1");
});

test("arrastre tactil hacia Focus", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "Prueba tactil.");
  await add(page, "Tarea tactil", "Urgente");
  const handle = page.getByRole("button", {
    name: "Mover: Tarea tactil",
    exact: true,
  });
  await handle.scrollIntoViewIfNeeded();
  const start = (await handle.boundingBox())!;
  const x = start.x + 25;
  const y = start.y + 20;
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await page.waitForTimeout(360);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x + 15, y: y - 10 }],
  });
  await page.waitForTimeout(400);
  const target = (await page.locator("[data-focus-zone]").boundingBox())!;
  for (let step = 1; step <= 12; step++) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: x + ((target.x + target.width / 2 - x) * step) / 12,
          y: y + ((target.y + target.height * 0.7 - y) * step) / 12,
        },
      ],
    });
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(200);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(root(page)).toHaveAttribute("data-mode", "focused");
  expect((await saved(page)).tasks).toHaveLength(1);
  expect((await saved(page)).tasks[0].groupId).toBe("group-1");
});

test("ancho compacto y tablet conservan controles y texto", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Cobertura adicional de tamanos.");
  await add(
    page,
    "Un texto largo que sigue siendo legible en cualquier pantalla",
  );
  for (const width of [360, 768]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Crear tarea", exact: true }),
    ).toBeInViewport();
    if (width === 360) {
      const field = (await page
        .getByRole("textbox", { name: "Nueva tarea" })
        .boundingBox())!;
      expect(field.width).toBeGreaterThan(230);
    }
    await page.screenshot({
      path: `test-results/width-${width}.png`,
      fullPage: true,
    });
  }
});

test("vistas sin desbordamiento, recursos cargados y capturas", async ({
  page,
}, info) => {
  await page.screenshot({
    path: `test-results/${info.project.name}-empty.png`,
    fullPage: true,
  });
  await add(page, "Preparar la primera version de theWall", "Urgente");
  await add(page, "Una cosa por hacer, sin prisa pero sin pausa.");
  await add(page, "x".repeat(120), "Cuando no haya nada");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".wall_brand img")
      .evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${info.project.name}-board.png`,
    fullPage: true,
  });
  await group(page, 1).locator("[data-action=select]").click();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `test-results/${info.project.name}-placing.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Traer al foco", exact: true })
    .click();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `test-results/${info.project.name}-focus.png`,
    fullPage: true,
  });
  await expect(page.locator("[data-composer]")).toBeHidden();
  await expect(
    page.locator("[data-focus-list] [data-task-text]"),
  ).toBeInViewport();
});

test("movimiento reducido desactiva shake y datos corruptos no se sobrescriben", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await add(page);
  await page
    .locator(".wall-task_wrap")
    .evaluate((node) => node.classList.add("is-held"));
  expect(
    await page
      .locator(".wall-task_body")
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe("none");
  await page.evaluate(() => localStorage.setItem("thewall:data", "{broken"));
  // Navigate away without the app's pagehide persistence replacing the fixture.
  await page.addInitScript(() =>
    localStorage.setItem("thewall:data", "{broken"),
  );
  await page.reload();
  await expect(page.locator("[data-warning]")).toBeVisible();
  await add(page, "Temporal");
  expect(await page.evaluate(() => localStorage.getItem("thewall:data"))).toBe(
    "{broken",
  );
});
