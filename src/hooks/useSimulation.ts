import { useState, type Dispatch, type SetStateAction } from "react";
import type { Element, Project } from "../model";
import { initialValues } from "../utils/project";
type Options = {
  project: Project;
  setScreenId: Dispatch<SetStateAction<string>>;
  notify: (text: string, error?: boolean) => void;
  setLogs: Dispatch<SetStateAction<string[]>>;
};
export function useSimulation({
  project,
  setScreenId,
  notify,
  setLogs,
}: Options) {
  const [mode, setMode] = useState<"edit" | "preview" | "run">("edit");
  const running = mode !== "edit";
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    initialValues(project),
  );
  function action(e: Element) {
    if (!running) return;
    if (e.enabledId && !values[e.enabledId]) return;
    if (e.action === "screen" && e.kind === "button") {
      if (e.targetScreenId) setScreenId(e.targetScreenId);
      return;
    }
    const variable = project.variables.find((v) => v.id === e.variableId);
    if (!variable) {
      notify("元件未綁定變數", true);
      return;
    }
    setValues((old) => {
      let value: unknown = old[variable.id];
      if (e.kind === "switch" || e.action === "toggle") {
        if (variable.type !== "boolean") return old;
        value = !value;
      } else if (e.action === "increment") {
        if (
          variable.type !== "number" ||
          !Number.isFinite(Number(e.actionValue))
        )
          return old;
        value = Number(value) + Number(e.actionValue);
      } else {
        value =
          variable.type === "number"
            ? Number(e.actionValue)
            : variable.type === "boolean"
              ? e.actionValue === "true"
              : e.actionValue;
        if (variable.type === "number" && !Number.isFinite(value)) return old;
      }
      return { ...old, [variable.id]: value };
    });
    setLogs((l) => [`${e.name} · 動作：${e.action}`, ...l].slice(0, 50));
  }
  return { mode, setMode, running, values, setValues, action };
}
