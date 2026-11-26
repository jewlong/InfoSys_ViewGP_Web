import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";
import type { Element, Project, Screen } from "../model";
import {
  computeAlignmentGuides,
  type AlignmentGuide,
} from "../utils/alignmentGuides";
import { clone } from "../utils/project";
type Options = {
  project: Project;
  screen: Screen;
  running: boolean;
  zoom: number;
  snap: boolean;
  setProject: Dispatch<SetStateAction<Project>>;
  recordSnapshot: (project: Project) => void;
};
export function useSelection({
  project,
  screen,
  running,
  zoom,
  snap,
  setProject,
  recordSnapshot,
}: Options) {
  const [selected, setSelected] = useState<string[]>([]);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const dragRef = useRef<{
    x: number;
    y: number;
    ids: string[];
    snapshot: Project;
    changed: boolean;
  } | null>(null);
  const [marquee, setMarquee] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const marqueeRef = useRef<{
    x: number;
    y: number;
    base: string[];
    pointerId: number;
    target: HTMLDivElement;
  } | null>(null);
  function cancelMarquee() {
    const drag = marqueeRef.current;
    if (!drag) return;
    marqueeRef.current = null;
    if (drag.target.hasPointerCapture(drag.pointerId))
      drag.target.releasePointerCapture(drag.pointerId);
    setSelected(drag.base);
    setMarquee(null);
  }
  useEffect(() => {
    cancelMarquee();
  }, [screen.id, running]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && marqueeRef.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancelMarquee();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
  function canvasPoint(ev: ReactPointerEvent<HTMLDivElement>) {
    const rect = ev.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(screen.width, (ev.clientX - rect.left) / zoom)),
      y: Math.max(0, Math.min(screen.height, (ev.clientY - rect.top) / zoom)),
    };
  }
  function beginMarquee(ev: ReactPointerEvent<HTMLDivElement>) {
    if (running || ev.button !== 0 || ev.target !== ev.currentTarget) return;
    ev.preventDefault();
    const point = canvasPoint(ev);
    marqueeRef.current = {
      ...point,
      base: ev.shiftKey ? [...selected] : [],
      pointerId: ev.pointerId,
      target: ev.currentTarget,
    };
    if (!ev.shiftKey) setSelected([]);
    setMarquee({ ...point, width: 0, height: 0 });
    ev.currentTarget.setPointerCapture(ev.pointerId);
  }
  function moveMarquee(ev: ReactPointerEvent<HTMLDivElement>) {
    const drag = marqueeRef.current;
    if (!drag || ev.pointerId !== drag.pointerId) return;
    const point = canvasPoint(ev);
    const box = {
      x: Math.min(point.x, drag.x),
      y: Math.min(point.y, drag.y),
      width: Math.abs(point.x - drag.x),
      height: Math.abs(point.y - drag.y),
    };
    setMarquee(box);
    if (box.width < 2 || box.height < 2) {
      setSelected(drag.base);
      return;
    }
    const enclosed = screen.elements.filter(
      (e) =>
        e.visible &&
        e.x >= box.x &&
        e.y >= box.y &&
        e.x + e.width <= box.x + box.width &&
        e.y + e.height <= box.y + box.height,
    );
    // Keep group selection consistent with clicking a grouped component.
    const groups = new Set(enclosed.map((e) => e.groupId).filter(Boolean));
    setSelected(
      Array.from(
        new Set([
          ...drag.base,
          ...screen.elements
            .filter(
              (e) =>
                e.visible &&
                (enclosed.some((item) => item.id === e.id) ||
                  (e.groupId && groups.has(e.groupId))),
            )
            .map((e) => e.id),
        ]),
      ),
    );
  }
  function endMarquee(ev: ReactPointerEvent<HTMLDivElement>) {
    if (marqueeRef.current?.pointerId !== ev.pointerId) return;
    moveMarquee(ev);
    const drag = marqueeRef.current!;
    marqueeRef.current = null;
    if (drag.target.hasPointerCapture(drag.pointerId))
      drag.target.releasePointerCapture(drag.pointerId);
    setMarquee(null);
  }
  function down(ev: ReactPointerEvent, e: Element) {
    if (running || ev.button !== 0) return;
    ev.stopPropagation();
    const group = e.groupId
      ? screen.elements.filter((i) => i.groupId === e.groupId).map((i) => i.id)
      : [e.id];
    const ids = ev.shiftKey
      ? Array.from(new Set([...selected, ...group]))
      : selected.includes(e.id)
        ? selected
        : group;
    setSelected(ids);
    if (e.locked) return;
    dragRef.current = {
      x: ev.clientX,
      y: ev.clientY,
      ids,
      snapshot: clone(project),
      changed: false,
    };
    ev.currentTarget.setPointerCapture(ev.pointerId);
  }
  function move(ev: ReactPointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = (ev.clientX - d.x) / zoom,
      dy = (ev.clientY - d.y) / zoom;
    if (Math.abs(dx) + Math.abs(dy) < 2 && !d.changed) return;
    d.changed = true;
    const p = clone(d.snapshot),
      s = p.screens.find((s) => s.id === screen.id)!;
    const movable = s.elements.filter((e) => d.ids.includes(e.id) && !e.locked);
    if (!movable.length) return;
    let offsetX = snap ? Math.round(dx / 10) * 10 : dx,
      offsetY = snap ? Math.round(dy / 10) * 10 : dy;
    const minX = Math.min(...movable.map((e) => e.x)),
      maxX = Math.max(...movable.map((e) => e.x + e.width)),
      minY = Math.min(...movable.map((e) => e.y)),
      maxY = Math.max(...movable.map((e) => e.y + e.height));
    offsetX = Math.max(-minX, Math.min(s.width - maxX, offsetX));
    offsetY = Math.max(-minY, Math.min(s.height - maxY, offsetY));
    movable.forEach((e) => {
      e.x = Math.round(e.x + offsetX);
      e.y = Math.round(e.y + offsetY);
    });
    const others = s.elements.filter(
      (e) => e.visible && !d.ids.includes(e.id),
    );
    const { guides } = computeAlignmentGuides(
      movable,
      others,
      s.width,
      s.height,
    );
    setAlignmentGuides(guides);
    setProject(p);
  }
  function endDrag() {
    const d = dragRef.current;
    if (d?.changed) {
      recordSnapshot(d.snapshot);
    }
    dragRef.current = null;
    setAlignmentGuides([]);
  }
  function beginResize(
    ev: ReactPointerEvent<HTMLSpanElement>,
    e: Element,
    c: string,
  ) {
    ev.stopPropagation();
    if (running || ev.button !== 0 || e.locked) return;
    const startX = ev.clientX,
      startY = ev.clientY,
      snapshot = clone(project);
    ev.currentTarget.setPointerCapture(ev.pointerId);
    const target = ev.currentTarget;
    let changed = false;
    const handleMove = (ev: PointerEvent) => {
      changed = true;
      const dx = (ev.clientX - startX) / zoom,
        dy = (ev.clientY - startY) / zoom;
      const p = clone(snapshot),
        item = p.screens
          .find((s) => s.id === screen.id)!
          .elements.find((i) => i.id === e.id)!;
      const west = c.includes("w"),
        north = c.includes("n");
      const w = Math.max(
          16,
          Math.min(
            west ? e.x + e.width : screen.width - e.x,
            e.width + (west ? -dx : dx),
          ),
        ),
        h = Math.max(
          8,
          Math.min(
            north ? e.y + e.height : screen.height - e.y,
            e.height + (north ? -dy : dy),
          ),
        );
      item.width = Math.round(w);
      item.height = Math.round(h);
      if (west) item.x = Math.round(e.x + e.width - w);
      if (north) item.y = Math.round(e.y + e.height - h);
      setProject(p);
    };
    const finish = () => {
      target.removeEventListener("pointermove", handleMove);
      target.removeEventListener("pointerup", finish);
      target.removeEventListener("pointercancel", finish);
      if (changed) {
        recordSnapshot(snapshot);
      }
    };
    target.addEventListener("pointermove", handleMove);
    target.addEventListener("pointerup", finish);
    target.addEventListener("pointercancel", finish);
  }
  return {
    selected,
    setSelected,
    down,
    move,
    endDrag,
    beginResize,
    marquee,
    beginMarquee,
    moveMarquee,
    endMarquee,
    cancelMarquee,
    alignmentGuides,
  };
}
