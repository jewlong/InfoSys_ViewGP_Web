import type { Element } from "../model";

export type AlignmentGuide = {
  axis: "x" | "y";
  position: number;
  start: number;
  end: number;
};

// Returns guide lines and the snap offset that moves the group onto the closest guide.
export function computeAlignmentGuides(
  moving: Element[],
  others: Element[],
  screenWidth: number,
  screenHeight: number,
  threshold = 4,
) {
  const empty = { guides: [] as AlignmentGuide[], snapDeltaX: 0, snapDeltaY: 0 };
  if (!moving.length) return empty;
  const box = {
    left: Math.min(...moving.map((e) => e.x)),
    right: Math.max(...moving.map((e) => e.x + e.width)),
    top: Math.min(...moving.map((e) => e.y)),
    bottom: Math.max(...moving.map((e) => e.y + e.height)),
  };
  const mx = [box.left, (box.left + box.right) / 2, box.right];
  const my = [box.top, (box.top + box.bottom) / 2, box.bottom];
  const tx = [screenWidth / 2];
  const ty = [screenHeight / 2];
  for (const o of others) {
    tx.push(o.x, o.x + o.width / 2, o.x + o.width);
    ty.push(o.y, o.y + o.height / 2, o.y + o.height);
  }
  const best = (source: number[], targets: number[]) => {
    let delta: number | undefined;
    let position = 0;
    for (const s of source)
      for (const t of targets) {
        const d = t - s;
        if (
          Math.abs(d) <= threshold &&
          (delta === undefined || Math.abs(d) < Math.abs(delta))
        ) {
          delta = d;
          position = t;
        }
      }
    return delta === undefined ? undefined : { delta, position };
  };
  const bx = best(mx, tx);
  const by = best(my, ty);
  const guides: AlignmentGuide[] = [];
  if (bx)
    guides.push({ axis: "x", position: bx.position, start: 0, end: screenHeight });
  if (by)
    guides.push({ axis: "y", position: by.position, start: 0, end: screenWidth });
  return { guides, snapDeltaX: bx?.delta ?? 0, snapDeltaY: by?.delta ?? 0 };
}
