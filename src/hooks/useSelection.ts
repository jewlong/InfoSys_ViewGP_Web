import {
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";
import type { Element, Project, Screen } from "../model";
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
  const dragRef = useRef<{
    x: number;
    y: number;
    ids: string[];
    snapshot: Project;
    changed: boolean;
  } | null>(null);
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
    setProject(p);
  }
  function endDrag() {
    const d = dragRef.current;
    if (d?.changed) {
      recordSnapshot(d.snapshot);
    }
    dragRef.current = null;
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
  return { selected, setSelected, down, move, endDrag, beginResize };
}
