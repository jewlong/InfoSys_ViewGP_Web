import { useRuntimeData } from "./useRuntimeData";
import { evaluateAction, inputError, parseNumber } from "../services/dataRules";
import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Element, Project } from "../model";
import { initialValues } from "../utils/project";
import { openPopup, screenElements } from "../services/screenRules";
type Options = {
  project: Project;
  screenId: string;
  setScreenId: Dispatch<SetStateAction<string>>;
  notify: (text: string, error?: boolean) => void;
  setLogs: Dispatch<SetStateAction<string[]>>;
};
export function useSimulation({
  project,
  screenId,
  setScreenId,
  notify,
  setLogs,
}: Options) {
  const [mode, updateMode] = useState<"edit" | "preview" | "run">("edit");
  const [popupIds, updatePopupIds] = useState<string[]>([]);
  const popupRef = useRef<string[]>([]);
  function setPopups(ids: string[]) {
    popupRef.current = ids;
    updatePopupIds(ids);
  }
  function setMode(next: "edit" | "preview" | "run") {
    if (next === "edit") setPopups([]);
    updateMode(next);
  }
  function showPopup(id: string) {
    const next = openPopup(project, popupRef.current, id);
    if (!next) {
      notify("對話盒不存在、已開啟或超過 16 層", true);
      return;
    }
    setPopups(next);
  }
  function closePopup() {
    setPopups(popupRef.current.slice(0, -1));
  }
  function canOperate(e: Element, sourceScreenId: string): boolean {
    const activeId = popupRef.current.at(-1) ?? screenId;
    return (
      activeId === sourceScreenId &&
      screenElements(project, activeId).some(
        ({ element }) => element.id === e.id,
      ) &&
      e.visible &&
      (!e.conditionId || Boolean(values[e.conditionId]))
    );
  }
  const running = mode !== "edit";
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    initialValues(project),
  );
  const [epoch, setEpoch] = useState(0);
  const runtimeData = useRuntimeData(project, values, running, epoch);
  function resetSimulation() {
    setPopups([]);
    setValues(initialValues(project));
    setEpoch((value) => value + 1);
  }
  function action(e: Element, sourceScreenId: string) {
    if (!running || !canOperate(e, sourceScreenId)) return;
    if (e.enabledId && !values[e.enabledId]) return;
    const result = evaluateAction(e, project, values);
    if ("error" in result) {
      notify(result.error, true);
      return;
    }
    if ("popupId" in result) showPopup(result.popupId);
    else if ("closePopup" in result) closePopup();
    else if ("screenId" in result) {
      setPopups([]);
      setScreenId(result.screenId);
    } else setValues((old) => ({ ...old, [result.variableId]: result.value }));
    setLogs((l) => [`${e.name} · 動作：${e.action}`, ...l].slice(0, 50));
  }
  function input(
    e: Element,
    raw: string,
    sourceScreenId: string,
  ): string | undefined {
    if (
      !running ||
      !canOperate(e, sourceScreenId) ||
      (e.enabledId && !values[e.enabledId])
    )
      return "元件未啟用";
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
    popupIds,
    showPopup,
    closePopup,
    ...runtimeData,
  };
}
