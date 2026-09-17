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
        handle: ".wall-task_select, .wall-task_grip",
        filter:
          "[data-action=edit], [data-action=toggle], [data-action=delete-task]",
        preventOnFilter: false,
        animation: reduced ? 0 : 150,
        delay: 300,
        delayOnTouchOnly: true,
        touchStartThreshold: 8,
        fallbackTolerance: 6,
        forceFallback: true,
        fallbackOnBody: false,
        emptyInsertThreshold: 24,
        sort: list.dataset.drop === "group",
        disabled: root.dataset.mode === "focused",
        onStart: (event) => handlers.start(event.item),
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
  return () => instances.forEach((instance) => instance.destroy());
}
