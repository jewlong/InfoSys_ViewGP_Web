import type { Project } from "../model.ts";
import { computeSystemValues } from "../services/systemVariables.ts";
export const clone = <T>(value: T): T => structuredClone(value);
export const initialValues = (project: Project, currentScreenId?: string) => ({
  ...computeSystemValues(project, currentScreenId),
  ...Object.fromEntries(project.variables.map((v) => [v.id, v.initial])),
});
