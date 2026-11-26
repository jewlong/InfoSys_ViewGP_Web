import type { Project } from "../model";

export type ScreenDiff = {
  name: string;
  addedElements: number;
  removedElements: number;
  changedElements: number;
};
export type ProjectDiffSummary = {
  screens: { added: string[]; removed: string[]; modified: ScreenDiff[] };
  variables: { added: string[]; removed: string[]; modified: string[] };
  devices: { added: string[]; removed: string[]; modified: string[] };
  totalChanges: number;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function diffById<T extends { id: string }>(
  base: T[] = [],
  target: T[] = [],
  label: (item: T) => string,
) {
  const baseMap = new Map(base.map((i) => [i.id, i]));
  const targetMap = new Map(target.map((i) => [i.id, i]));
  return {
    added: target.filter((i) => !baseMap.has(i.id)).map(label),
    removed: base.filter((i) => !targetMap.has(i.id)).map(label),
    modified: target
      .filter((i) => baseMap.has(i.id) && !same(baseMap.get(i.id), i))
      .map(label),
  };
}

export function diffProjects(
  base: Project,
  target: Project,
): ProjectDiffSummary {
  const screens = diffById(base.screens, target.screens, (s) => s.name);
  const baseScreens = new Map(base.screens.map((s) => [s.id, s]));
  const modified: ScreenDiff[] = [];
  for (const screen of target.screens) {
    const before = baseScreens.get(screen.id);
    if (!before) continue;
    const elements = diffById(before.elements, screen.elements, (e) => e.name);
    const { elements: _a, ...beforeMeta } = before;
    const { elements: _b, ...afterMeta } = screen;
    if (
      elements.added.length ||
      elements.removed.length ||
      elements.modified.length ||
      !same(beforeMeta, afterMeta)
    )
      modified.push({
        name: screen.name,
        addedElements: elements.added.length,
        removedElements: elements.removed.length,
        changedElements: elements.modified.length,
      });
  }
  const variables = diffById(base.variables, target.variables, (v) => v.name);
  const devices = diffById(base.devices, target.devices, (d) => d.name);
  const totalChanges =
    screens.added.length +
    screens.removed.length +
    modified.reduce(
      (n, s) => n + s.addedElements + s.removedElements + s.changedElements + 0,
      0,
    ) +
    variables.added.length +
    variables.removed.length +
    variables.modified.length +
    devices.added.length +
    devices.removed.length +
    devices.modified.length;
  return {
    screens: { added: screens.added, removed: screens.removed, modified },
    variables,
    devices,
    totalChanges,
  };
}
