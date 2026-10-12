import type { Element, Project, Screen } from "../model.ts";
import { computeSystemValues } from "../services/systemVariables.ts";
export const clone = <T>(value: T): T => structuredClone(value);
export const initialValues = (project: Project, currentScreenId?: string) => ({
  ...computeSystemValues(project, currentScreenId),
  ...Object.fromEntries(project.variables.map((v) => [v.id, v.initial])),
});

export function resolveInheritedElements(
  screen: Screen,
  screens: Screen[],
): Element[] {
  const visited = new Set<string>([screen.id]);
  const inherited: Element[] = [];
  let currentId = screen.inheritsScreenId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const master = screens.find((s) => s.id === currentId);
    if (!master) break;
    inherited.unshift(...master.elements);
    currentId = master.inheritsScreenId;
  }
  return inherited;
}

