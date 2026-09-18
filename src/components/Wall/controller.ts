import {
  initialWall,
  parseWall,
  reduceWall,
  tasksIn,
  type Action,
  type Mode,
  type Task,
} from "./model.ts";
import { readWall, STORAGE_KEY, writeWall } from "./storage.ts";
import { connectDrag } from "./drag.ts";

export function mountWall(root: HTMLElement) {
  if (root.dataset.mounted) return;
  root.dataset.mounted = "true";
  const get = <T extends Element = HTMLElement>(
    selector: string,
    parent: ParentNode = root,
  ) => parent.querySelector<T>(selector)!;
  const all = <T extends Element = HTMLElement>(selector: string) =>
    Array.from(root.querySelectorAll<T>(selector));
  const input = get<HTMLInputElement>("[data-composer-input]");
  const dialog = get<HTMLDialogElement>("[data-dialog]");
  const dialogInput = get<HTMLInputElement>("[data-dialog-input]");
  const groups = get("[data-groups]");
  const focusList = get("[data-focus-list]");
  const draftList = get("[data-draft-list]");
  const storage = {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
  };
  const loaded = readWall(storage);
  let wall = loaded.wall;
  let blocked = loaded.blocked;
  let mode: Mode = wall.focusedTaskId ? { kind: "focused" } : { kind: "board" };
  let view: Task["status"] = "pending";
  let destroyDrag: (() => void) | undefined;
  let dragging = false;
  let cancelledDrag = false;
  let suppressedUntil = 0;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let draftTimer: ReturnType<typeof setTimeout> | undefined;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let pointer: {
    x: number;
    y: number;
    item: HTMLElement;
    held: boolean;
  } | null = null;
  let editor:
    | { kind: "task"; id: string }
    | { kind: "group"; resumeCreate: boolean }
    | null = null;
  let boardScroll = 0;
  let incoming: string | null | undefined;
  const placing = () =>
    mode.kind === "placing-new" || mode.kind === "placing-existing";
  const selection = () =>
    mode.kind === "placing-existing"
      ? mode.taskId
      : mode.kind === "placing-new"
        ? "draft"
        : null;
  const taskFor = (id: string) => wall.tasks.find((task) => task.id === id);

  function warning(message: string) {
    const element = get("[data-warning]");
    element.textContent = message;
    element.hidden = !message;
  }

  function announce(message: string, visible = false) {
    get("[data-announcement]").textContent = message;
    if (visible) {
      const toast = get("[data-toast]");
      toast.textContent = message;
      toast.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.hidden = true;
      }, 3200);
    }
  }

  function persist() {
    clearTimeout(draftTimer);
    const saved = !blocked && writeWall(storage, wall);
    if (!saved && !blocked)
      warning(
        "No se han podido guardar los cambios en este navegador. Conserva esta ventana abierta.",
      );
    if (saved) warning("");
  }

  function dispatch(action: Action) {
    try {
      wall = reduceWall(wall, action);
      persist();
      return true;
    } catch (error) {
      announce(
        error instanceof Error
          ? error.message
          : "No se pudo realizar la accion.",
        true,
      );
      return false;
    }
  }

  function clone(template: string) {
    return get<HTMLTemplateElement>(
      template,
    ).content.firstElementChild!.cloneNode(true) as HTMLElement;
  }

  function card(task: Task, draft = false) {
    const node = clone("[data-task-template]");
    node.dataset.taskId = task.id;
    node.classList.toggle("is-draft", draft);
    node.classList.toggle("is-completed", task.status === "completed");
    get("[data-task-text]", node).textContent = task.title;
    get("[data-action=select]", node).setAttribute(
      "aria-label",
      `Mover: ${task.title}`,
    );
    const toggle = get<HTMLButtonElement>("[data-action=toggle]", node);
    const label =
      task.status === "completed" ? "Reabrir tarea" : "Completar tarea";
    toggle.setAttribute("aria-label", label);
    toggle.title = label;
    get<SVGElement>("[data-pending-icon]", node).toggleAttribute(
      "hidden",
      task.status === "completed",
    );
    get<SVGElement>("[data-completed-icon]", node).toggleAttribute(
      "hidden",
      task.status !== "completed",
    );
    return node;
  }

  function focusTask(id: string | null) {
    const target = all("[data-task-id]").find(
      (item) => item.dataset.taskId === id && item.closest("[hidden]") === null,
    );
    if (target)
      get<HTMLButtonElement>("[data-action=select]", target).focus({
        preventScroll: true,
      });
    else input.focus({ preventScroll: true });
  }

  function completedTab() {
    return get<HTMLButtonElement>("[data-action=completed]");
  }

  function completionFlyer(id: string) {
    const source = all<HTMLElement>("[data-task-id]").find(
      (item) => item.dataset.taskId === id && item.closest("[hidden]") === null,
    );
    if (!source || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return null;
    const rect = source.getBoundingClientRect();
    const flyer = source.cloneNode(true) as HTMLElement;
    flyer.classList.remove("is-selected", "is-held", "sortable-ghost");
    flyer.classList.add("is-flying");
    flyer.removeAttribute("data-task-id");
    flyer.setAttribute("aria-hidden", "true");
    flyer.setAttribute("inert", "");
    Object.assign(flyer.style, {
      position: "fixed",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
    root.append(flyer);
    return {
      run() {
        const target = completedTab().getBoundingClientRect();
        const x = target.left + target.width / 2 - (rect.left + rect.width / 2);
        const y =
          target.top + target.height / 2 - (rect.top + rect.height / 2);
        flyer
          .animate(
            [
              {
                opacity: 1,
                transform: "translate3d(0, 0, 0) scale(1)",
              },
              {
                opacity: 0.8,
                offset: 0.55,
                transform: `translate3d(${x * 0.72}px, ${y * 0.82}px, 0) scale(0.62)`,
              },
              {
                opacity: 0,
                transform: `translate3d(${x}px, ${y}px, 0) scale(0.18)`,
              },
            ],
            {
              duration: 1000,
              easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
              fill: "forwards",
            },
          )
          .finished.catch(() => undefined)
          .finally(() => flyer.remove());
      },
      cancel() {
        flyer.remove();
      },
    };
  }

  function clearCompletionFlyers() {
    all(".wall-task_wrap.is-flying").forEach((flyer) => flyer.remove());
  }

  function syncUI() {
    root.dataset.mode = mode.kind;
    root.dataset.placing = String(placing());
    get("[data-board]").hidden = mode.kind === "focused";
    get("[data-placement]").hidden = !placing();
    input.disabled = mode.kind === "placing-new";
    get<HTMLButtonElement>(".wall_create").disabled = placing();
    get("[data-action=exit-focus]").hidden = mode.kind !== "focused";
    const eligible =
      mode.kind === "placing-existing" &&
      taskFor(mode.taskId)?.status === "pending";
    root.dataset.focusEligible = String(eligible);
    get<HTMLButtonElement>("[data-action=focus]").disabled = !eligible;
    get("[data-focus-zone]").setAttribute(
      "aria-disabled",
      String(!eligible && mode.kind !== "focused"),
    );
    get("[data-focus-caption]").textContent =
      mode.kind === "placing-new" ? "Primero, un grupo." : "Una cosa a la vez.";
    get("[data-focus-origin]").hidden = mode.kind !== "focused";
    get("[data-focus-origin]").textContent = wall.focusedTaskId
      ? (wall.groups.find(
          (group) => group.id === taskFor(wall.focusedTaskId!)?.groupId,
        )?.name ?? "")
      : "";
    all<HTMLButtonElement>("[data-action=place]").forEach((button) => {
      button.hidden = !placing();
    });
    all<HTMLButtonElement>(".wall_views button").forEach((button) => {
      button.disabled = placing();
    });
    all("[data-task-id]").forEach((node) => {
      const selected = node.dataset.taskId === selection();
      node.classList.toggle("is-selected", selected);
      get("[data-action=select]", node).setAttribute(
        "aria-pressed",
        String(selected),
      );
      node
        .querySelectorAll<HTMLButtonElement>(
          "[data-action=edit], [data-action=toggle], [data-action=delete-task]",
        )
        .forEach((button) => {
          button.disabled = placing();
        });
    });
    all<HTMLButtonElement>("[data-action=delete-group]").forEach((button) => {
      const groupId =
        button.closest<HTMLElement>("[data-group-id]")!.dataset.groupId;
      const occupied = wall.tasks.some((task) => task.groupId === groupId);
      button.disabled = occupied || placing();
      button.title = occupied ? "El grupo contiene tareas" : "Borrar grupo";
    });
  }

  function render() {
    if (dragging) {
      syncUI();
      return;
    }
    const active = document.activeElement as HTMLElement | null;
    const activeId =
      active?.closest<HTMLElement>("[data-task-id]")?.dataset.taskId;
    destroyDrag?.();
    groups.replaceChildren();
    focusList.replaceChildren();
    draftList.replaceChildren();
    for (const [index, group] of [...wall.groups]
      .sort((a, b) => a.order - b.order)
      .entries()) {
      const node = clone("[data-group-template]");
      node.dataset.groupId = group.id;
      get("[data-group-number]", node).textContent = String(index + 1).padStart(
        2,
        "0",
      );
      get("[data-group-name]", node).textContent = group.name;
      get("[data-action=place]", node).setAttribute(
        "aria-label",
        `Colocar en ${group.name}`,
      );
      get("[data-action=delete-group]", node).setAttribute(
        "aria-label",
        `Borrar ${group.name}`,
      );
      const list = get("[data-drop]", node);
      list.dataset.groupId = group.id;
      list.setAttribute("aria-label", group.name);
      const tasks = tasksIn(wall, group.id, view);
      get("[data-group-count]", node).textContent = String(
        tasks.length,
      ).padStart(2, "0");
      get("[data-group-empty]", node).hidden = tasks.length > 0;
      tasks.forEach((task) => list.append(card(task)));
      groups.append(node);
    }
    if (mode.kind === "focused" && wall.focusedTaskId) {
      const task = taskFor(wall.focusedTaskId);
      if (task) focusList.append(card(task));
    }
    if (mode.kind === "placing-new") {
      draftList.append(
        card(
          {
            id: "draft",
            title: wall.draft?.title ?? "",
            groupId: "",
            status: "pending",
            order: 0,
          },
          true,
        ),
      );
    }
    get("[data-no-groups]").hidden = wall.groups.length > 0;
    const pending = wall.tasks.filter(
      (task) => task.status === "pending",
    ).length;
    get("[data-pending-count]").textContent =
      `${pending} pendiente${pending === 1 ? "" : "s"}`;
    get("[data-total-pending]").textContent = String(pending);
    get("[data-total-completed]").textContent = String(
      wall.tasks.length - pending,
    );
    get("[data-footer-count]").textContent =
      `${wall.tasks.length} TAREA${wall.tasks.length === 1 ? "" : "S"} EN EL MURO`;
    get("[data-action=pending]").setAttribute(
      "aria-pressed",
      String(view === "pending"),
    );
    get("[data-action=completed]").setAttribute(
      "aria-pressed",
      String(view === "completed"),
    );
    syncUI();
    destroyDrag = connectDrag(root, {
      start(item) {
        dragging = true;
        cancelledDrag = false;
        if (item.dataset.taskId !== "draft") selectTask(item.dataset.taskId!);
        item.classList.add("is-held");
      },
      canDrop(destination, item) {
        if (cancelledDrag || mode.kind === "focused") return false;
        if (selection() && selection() !== item.dataset.taskId) return false;
        if (destination.dataset.drop === "group") return true;
        return (
          destination.dataset.drop === "focus" &&
          item.dataset.taskId !== "draft" &&
          taskFor(item.dataset.taskId!)?.status === "pending"
        );
      },
      end(_item, destination, index, valid) {
        suppressedUntil = performance.now() + 180;
        clearTimeout(holdTimer);
        pointer = null;
        setTimeout(() => {
          dragging = false;
          if (incoming !== undefined) {
            const raw = incoming;
            incoming = undefined;
            applyExternal(raw);
            return;
          }
          if (!cancelledDrag && valid) {
            if (destination.dataset.drop === "focus") enterFocus();
            else if (destination.dataset.drop === "group")
              placeIn(destination.dataset.groupId!, index);
          }
          cancelledDrag = false;
          render();
        }, 0);
      },
    });
    if (activeId && !dialog.open) focusTask(activeId);
  }

  function selectTask(id: string) {
    if (mode.kind === "placing-new" || !taskFor(id)) return;
    const wasFocused = mode.kind === "focused";
    mode = {
      kind: "placing-existing",
      taskId: id,
      previousFocus: wall.focusedTaskId,
    };
    if (wasFocused && !dragging) render();
    else syncUI();
    announce("Tarea seleccionada. Elige un destino.");
  }

  function placeIn(groupId: string, index?: number) {
    if (!placing()) return;
    const id = mode.kind === "placing-new" ? crypto.randomUUID() : selection()!;
    const action: Action =
      mode.kind === "placing-new"
        ? { type: "create", id, title: wall.draft?.title ?? "", groupId, index }
        : { type: "move", id, groupId, index };
    if (!dispatch(action)) return;
    dispatch({ type: "focus", id: null });
    input.value = wall.draft?.title ?? "";
    mode = { kind: "board" };
    render();
    focusTask(id);
    announce(
      `Tarea en ${wall.groups.find((group) => group.id === groupId)?.name}.`,
    );
  }

  function enterFocus() {
    if (
      mode.kind !== "placing-existing" ||
      taskFor(mode.taskId)?.status !== "pending"
    )
      return;
    const id = mode.taskId;
    boardScroll = window.scrollY;
    if (!dispatch({ type: "focus", id })) return;
    mode = { kind: "focused" };
    render();
    window.scrollTo({ top: 0, behavior: "instant" });
    focusTask(id);
    announce("Tarea en foco.");
  }

  function cancel() {
    if (mode.kind !== "placing-new" && mode.kind !== "placing-existing") return;
    const previous = mode.previousFocus;
    const id = selection();
    if (dragging) cancelledDrag = true;
    mode =
      previous && taskFor(previous)?.status === "pending"
        ? { kind: "focused" }
        : { kind: "board" };
    input.value = wall.draft?.title ?? "";
    render();
    if (!dragging) focusTask(id);
    announce("Colocacion cancelada.");
  }

  function create() {
    if (placing() || !input.value.trim()) return;
    dispatch({ type: "draft", title: input.value });
    if (!wall.groups.length) {
      openGroup(true);
      return;
    }
    view = "pending";
    mode = { kind: "placing-new", previousFocus: wall.focusedTaskId };
    render();
    get<HTMLButtonElement>("[data-action=place]").focus({
      preventScroll: true,
    });
    announce("Elige un grupo para la nueva tarea.");
  }

  function openGroup(resumeCreate = false) {
    editor = { kind: "group", resumeCreate };
    get("#wall-dialog-title").textContent = "Nuevo grupo";
    dialogInput.maxLength = 64;
    dialogInput.value = "";
    dialogInput.setAttribute("aria-label", "Nombre del grupo");
    get("[data-dialog-error]").hidden = true;
    dialog.showModal();
    dialogInput.focus();
  }

  root.addEventListener("click", (event) => {
    if (performance.now() < suppressedUntil || dragging) {
      event.preventDefault();
      return;
    }
    const target = event.target as Element;
    const button = target.closest<HTMLElement>("[data-action]");
    const action = button?.dataset.action;
    const id = target.closest<HTMLElement>("[data-task-id]")?.dataset.taskId;
    if (button instanceof HTMLButtonElement && button.disabled) return;
    if (action === "cancel") {
      cancel();
      return;
    }
    if (action === "close-dialog") {
      dialog.close();
      return;
    }
    if (action === "add-group") {
      openGroup();
      return;
    }
    if (action === "focus") {
      enterFocus();
      return;
    }
    if (action === "exit-focus") {
      const focused = wall.focusedTaskId;
      dispatch({ type: "focus", id: null });
      mode = { kind: "board" };
      render();
      window.scrollTo({ top: boardScroll, behavior: "instant" });
      focusTask(focused);
      return;
    }
    const groupId =
      target.closest<HTMLElement>("[data-group-id]")?.dataset.groupId;
    if (placing() && groupId) {
      placeIn(groupId);
      return;
    }
    if ((action === "select" || !action) && id && id !== "draft") {
      selectTask(id);
      return;
    }
    if (action === "toggle" && id) {
      const completing = taskFor(id)?.status === "pending";
      const flyer = completing ? completionFlyer(id) : null;
      if (!dispatch({ type: "toggle", id })) {
        flyer?.cancel();
        return;
      }
      if (!wall.focusedTaskId) mode = { kind: "board" };
      render();
      flyer?.run();
      announce(
        taskFor(id)?.status === "completed"
          ? "Tarea completada."
          : "Tarea reabierta.",
        true,
      );
      return;
    }
    if (action === "delete-task" && id) {
      if (!dispatch({ type: "delete-task", id })) return;
      if (!wall.focusedTaskId) mode = { kind: "board" };
      render();
      announce("Tarea eliminada.", true);
      return;
    }
    if (action === "edit" && id) {
      editor = { kind: "task", id };
      get("#wall-dialog-title").textContent = "Editar tarea";
      dialogInput.maxLength = 500;
      dialogInput.value = taskFor(id)!.title;
      dialogInput.setAttribute("aria-label", "Texto de la tarea");
      get("[data-dialog-error]").hidden = true;
      dialog.showModal();
      dialogInput.select();
      return;
    }
    if (action === "delete-group" && groupId) {
      if (dispatch({ type: "delete-group", id: groupId })) {
        render();
        get<HTMLButtonElement>("[data-action=add-group]").focus();
      }
      return;
    }
    if (action === "pending" || action === "completed") {
      clearCompletionFlyers();
      view = action === "pending" ? "pending" : "completed";
      render();
    }
  });

  get<HTMLFormElement>("[data-composer]").addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      create();
    },
  );
  input.addEventListener("input", () => {
    wall = reduceWall(wall, { type: "draft", title: input.value });
    clearTimeout(draftTimer);
    draftTimer = setTimeout(persist, 200);
  });
  get<HTMLFormElement>("[data-dialog-form]").addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      if (!editor) return;
      try {
        wall = reduceWall(
          wall,
          editor.kind === "task"
            ? { type: "edit", id: editor.id, title: dialogInput.value }
            : {
                type: "add-group",
                id: crypto.randomUUID(),
                name: dialogInput.value,
              },
        );
      } catch (error) {
        const element = get("[data-dialog-error]");
        element.textContent =
          error instanceof Error ? error.message : "No se pudo guardar.";
        element.hidden = false;
        return;
      }
      const resume = editor.kind === "group" && editor.resumeCreate;
      const editedId = editor.kind === "task" ? editor.id : null;
      persist();
      dialog.close();
      render();
      if (resume) create();
      else if (editedId) focusTask(editedId);
    },
  );

  root.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || mode.kind === "focused") return;
    const target = event.target as Element;
    if (!target.closest(".wall-task_select, .wall-task_grip")) return;
    const item = target.closest<HTMLElement>("[data-task-id]");
    if (
      !item ||
      item.dataset.taskId === "draft" ||
      (placing() && selection() !== item.dataset.taskId)
    )
      return;
    pointer = { x: event.clientX, y: event.clientY, item, held: false };
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      if (!pointer) return;
      pointer.held = true;
      selectTask(item.dataset.taskId!);
      item.classList.add("is-held");
    }, 280);
  });
  window.addEventListener("pointermove", (event) => {
    if (
      pointer &&
      !pointer.held &&
      Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 8
    )
      clearTimeout(holdTimer);
  });
  const release = () => {
    clearTimeout(holdTimer);
    if (pointer?.held) suppressedUntil = performance.now() + 180;
    if (!dragging)
      all(".is-held").forEach((item) => item.classList.remove("is-held"));
    pointer = null;
  };
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  window.addEventListener("blur", release);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dialog.open) {
      event.preventDefault();
      cancel();
    }
  });
  window.addEventListener("pagehide", persist);
  function applyExternal(raw: string | null) {
    try {
      const draft = wall.draft;
      wall = raw === null ? initialWall() : parseWall(raw);
      if (draft) wall.draft = draft;
      mode = wall.focusedTaskId ? { kind: "focused" } : { kind: "board" };
      blocked = false;
      input.value = wall.draft?.title ?? "";
      if (dialog.open) dialog.close();
      warning("");
      render();
      announce("Tablero actualizado desde otra ventana.", true);
    } catch {
      blocked = true;
      warning(
        "Los datos de otra ventana no se pueden leer. Tu tablero actual se conserva.",
      );
    }
  }
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    clearTimeout(draftTimer);
    if (dragging) {
      incoming = event.newValue;
      cancelledDrag = true;
    } else applyExternal(event.newValue);
  });

  input.value = wall.draft?.title ?? "";
  warning(loaded.message);
  render();
}
