import type { Element, Project, Screen } from "../model.ts";

export function isPopup(screen: Screen): boolean {
  return screen.type === "popup" || screen.type === "dialog";
}

export function parentScreenId(screen: Screen): string | undefined {
  return screen.parentScreenId ?? screen.inheritsScreenId;
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
    screen = parentScreenId(screen)
      ? screens.get(parentScreenId(screen)!)
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
    id = parentScreenId(screen);
  }
  return true;
}

export function screenProblems(project: Project): string[] {
  const errors: string[] = [];
  const start = project.screens.find((s) => s.id === project.startScreenId);
  if (!start || isPopup(start)) errors.push("起始畫面必須是有效的一般畫面");
  for (const s of project.screens) {
    for (const id of [s.parentScreenId, s.inheritsScreenId]) {
      if (id !== undefined && (typeof id !== "string" || !id.length))
        errors.push(`${s.name}：繼承畫面格式錯誤`);
    }
    if (
      s.type !== undefined &&
      !["normal", "popup", "screen", "dialog"].includes(s.type)
    )
      errors.push(`${s.name}：無效的畫面類別`);
    if (
      parentScreenId(s) !== undefined &&
      (typeof parentScreenId(s) !== "string" ||
        !canInherit(project, s.id, parentScreenId(s)!))
    )
      errors.push(`${s.name}：繼承畫面不存在或形成循環`);
    if (
      s.parentScreenId !== undefined &&
      s.inheritsScreenId !== undefined &&
      s.parentScreenId !== s.inheritsScreenId
    )
      errors.push(`${s.name}：繼承畫面設定不一致`);
  }
  return errors;
}

export function screenReferences(project: Project, id: string): string[] {
  return project.screens.flatMap((s) => [
    ...(parentScreenId(s) === id ? [`${s.name}（繼承）`] : []),
    ...s.elements
      .filter(
        (e) =>
          e.kind === "button" &&
          ["screen", "popup", "openDialog"].includes(e.action) &&
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
    stack.length >= (project.maxPopupDepth ?? 16)
  )
    return undefined;
  return [...stack, id];
}
