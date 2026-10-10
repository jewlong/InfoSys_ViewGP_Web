import type { Project } from "../model";
export const clone = <T>(value: T): T => structuredClone(value);
export const initialValues = (project: Project) =>
  Object.fromEntries(project.variables.map((v) => [v.id, v.initial]));
