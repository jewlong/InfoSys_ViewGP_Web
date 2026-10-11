import { useRuntimeData } from "./useRuntimeData";
import { evaluateAction, inputError, parseNumber } from "../services/dataRules";
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
  const [epoch, setEpoch] = useState(0);
  const runtimeData = useRuntimeData(project, values, running, epoch);
  function resetSimulation() {
    setValues(initialValues(project));
    setEpoch((value) => value + 1);
  }
  function action(e: Element) {
    if (!running) return;
    if (e.enabledId && !values[e.enabledId]) return;
    const result = evaluateAction(e, project, values);
    if ("error" in result) {
      notify(result.error, true);
      return;
    }
    if ("screenId" in result) setScreenId(result.screenId);
    else setValues((old) => ({ ...old, [result.variableId]: result.value }));
    setLogs((l) => [`${e.name} · 動作：${e.action}`, ...l].slice(0, 50));
  }
  function input(e: Element, raw: string): string | undefined {
    if (!running || (e.enabledId && !values[e.enabledId])) return "元件未啟用";
    const variable = project.variables.find((v) => v.id === e.variableId);
    if (variable?.type !== "number") return "需綁定有效數值變數";
    const error = inputError(e, raw);
    if (error) return error;
    setValues((old) => ({ ...old, [variable.id]: parseNumber(raw)! }));
    setLogs((old) => [`${e.name} · 輸入：${raw}`, ...old].slice(0, 50));
    return undefined;
  }
  return {
    mode,
    setMode,
    running,
    values,
    setValues,
    action,
    input,
    resetSimulation,
    ...runtimeData,
  };
}
