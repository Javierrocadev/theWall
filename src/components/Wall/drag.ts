import Sortable from "sortablejs";

type DragHandlers = {
  start: (item: HTMLElement) => void;
  end: (
    item: HTMLElement,
    destination: HTMLElement,
    index: number | undefined,
    valid: boolean,
  ) => void;
  canDrop: (destination: HTMLElement, item: HTMLElement) => boolean;
};

export function connectDrag(root: HTMLElement, handlers: DragHandlers) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let origin: { x: number; y: number } | undefined;
  const rememberPointer = (event: PointerEvent) => {
    origin = { x: event.clientX, y: event.clientY };
  };
  root.addEventListener("pointerdown", rememberPointer, true);
  const instances = Array.from(
    root.querySelectorAll<HTMLElement>("[data-drop]"),
  ).map(
    (list) =>
      new Sortable(list, {
        group: {
          name: "thewall",
          pull: true,
          put: (_to, _from, item) => handlers.canDrop(list, item),
        },
        draggable: ".wall-task_wrap",
        handle: ".wall-task_wrap",
        filter:
          "[data-action=edit], [data-action=toggle], [data-action=delete-task], [data-action=focus-task]",
        preventOnFilter: false,
        animation: reduced ? 0 : 150,
        delay: 300,
        delayOnTouchOnly: true,
        touchStartThreshold: 8,
        fallbackTolerance: 6,
        forceFallback: true,
        fallbackOnBody: true,
        emptyInsertThreshold: 24,
        sort: list.dataset.drop === "group",
        disabled: root.dataset.mode === "focused",
        onStart: (event) => {
          const ghost = Sortable.ghost;
          if (ghost) {
            const styles = getComputedStyle(event.item);
            for (const property of styles) {
              if (property.startsWith("--")) {
                ghost.style.setProperty(property, styles.getPropertyValue(property));
              }
            }
            ghost.style.font = styles.font;
            if (origin) {
              ghost.style.left = `${origin.x - parseFloat(ghost.style.width) / 2}px`;
              ghost.style.top = `${origin.y - parseFloat(ghost.style.height) / 2}px`;
            }
          }
          handlers.start(event.item);
        },
        onMove: (event) => handlers.canDrop(event.to, event.dragged),
        onEnd: (event) => {
          const original = (
            event as Sortable.SortableEvent & {
              originalEvent?: MouseEvent | TouchEvent;
            }
          ).originalEvent;
          const point =
            original && "changedTouches" in original
              ? original.changedTouches[0]
              : original;
          const under = point
            ? document.elementFromPoint(point.clientX, point.clientY)
            : null;
          const zone = under?.closest<HTMLElement>(
            "[data-group-id], [data-focus-zone]",
          );
          const valid =
            !!zone &&
            (event.to.dataset.drop === "focus"
              ? zone.hasAttribute("data-focus-zone")
              : zone.dataset.groupId === event.to.dataset.groupId);
          handlers.end(event.item, event.to, event.newDraggableIndex, valid);
        },
      }),
  );
  return () => {
    root.removeEventListener("pointerdown", rememberPointer, true);
    instances.forEach((instance) => instance.destroy());
  };
}
