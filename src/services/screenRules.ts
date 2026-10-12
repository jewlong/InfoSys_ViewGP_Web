import type { Element, Project, Screen } from "../model.ts";

export function isPopup(screen: Screen): boolean {
  return screen.type === "popup";
}

// Resolve references at render time: inherited elements never become child data.
export function screenElements(
  project: Project,
  screenId: string,
): {
  element: Element;
  ownerScreenId: string;
}[] {
  const screens = new Map(project.screens.map((s) => [s.id, s]));
  const chain: Screen[] = [];
  const visited = new Set<string>();
  let screen = screens.get(screenId);
  while (screen && !visited.has(screen.id)) {
    visited.add(screen.id);
    chain.push(screen);
    screen = screen.parentScreenId
      ? screens.get(screen.parentScreenId)
      : undefined;
  }
  return chain
    .reverse()
    .flatMap((s) =>
      s.elements.map((element) => ({ element, ownerScreenId: s.id })),
    );
}

export function canInherit(
  project: Project,
  childId: string,
  parentId: string,
): boolean {
  const screens = new Map(project.screens.map((s) => [s.id, s]));
  if (!screens.has(childId) || !screens.has(parentId)) return false;
  const seen = new Set([childId]);
  let id: string | undefined = parentId;
  while (id) {
    if (seen.has(id)) return false;
    seen.add(id);
    const screen = screens.get(id);
    if (!screen) return false;
    id = screen.parentScreenId;
  }
  return true;
}

export function screenProblems(project: Project): string[] {
  const errors: string[] = [];
  const start = project.screens.find((s) => s.id === project.startScreenId);
  if (!start || isPopup(start)) errors.push("起始畫面必須是有效的一般畫面");
  for (const s of project.screens) {
    if (s.type !== undefined && !["normal", "popup"].includes(s.type))
      errors.push(`${s.name}：無效的畫面類別`);
    if (
      s.parentScreenId !== undefined &&
      (typeof s.parentScreenId !== "string" ||
        !canInherit(project, s.id, s.parentScreenId))
    )
      errors.push(`${s.name}：繼承畫面不存在或形成循環`);
  }
  return errors;
}

export function screenReferences(project: Project, id: string): string[] {
  return project.screens.flatMap((s) => [
    ...(s.parentScreenId === id ? [`${s.name}（繼承）`] : []),
    ...s.elements
      .filter(
        (e) =>
          e.kind === "button" &&
          ["screen", "popup"].includes(e.action) &&
          e.targetScreenId === id,
      )
      .map((e) => `${s.name} / ${e.name}`),
  ]);
}

export function openPopup(
  project: Project,
  stack: string[],
  id: string,
): string[] | undefined {
  if (
    !project.screens.some((s) => s.id === id && isPopup(s)) ||
    stack.includes(id) ||
    stack.length >= 16
  )
    return undefined;
  return [...stack, id];
}
