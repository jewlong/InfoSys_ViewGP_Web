import { useRuntimeData } from "./useRuntimeData";
import { evaluateAction, inputError, parseNumber } from "../services/dataRules";
import { computeSystemValues } from "../services/systemVariables";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { Element, Project } from "../model";
import { initialValues } from "../utils/project";

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
  const [mode, setMode] = useState<"edit" | "preview" | "run">("edit");
  const running = mode !== "edit";
  const [screenHistory, setScreenHistory] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    initialValues(project, screenId),
  );
  const [epoch, setEpoch] = useState(0);
  const [activeDialogId, setActiveDialogId] = useState<string | null>(null);
  const runtimeData = useRuntimeData(project, values, running, epoch);

  useEffect(() => {
    if (!running) return;
    const updateSys = () => {
      setValues((old) => ({
        ...old,
        ...computeSystemValues(
          project,
          screenId,
          runtimeData.alarmEvents.filter((a) => !a.clearedAt).length,
        ),
      }));
    };
    updateSys();
    const timer = window.setInterval(updateSys, 250);
    return () => window.clearInterval(timer);
  }, [running, project, screenId, runtimeData.alarmEvents]);

  function resetSimulation() {
    setValues(initialValues(project, screenId));
    setScreenHistory([]);
    setActiveDialogId(null);
    setEpoch((value) => value + 1);
  }

  function closeActiveDialog() {
    setActiveDialogId(null);
  }

  function action(e: Element) {
    if (!running) return;
    if (e.enabledId && !values[e.enabledId]) return;
    const result = evaluateAction(e, project, values);
    if ("error" in result) {
      notify(result.error, true);
      return;
    }
    if ("actionType" in result) {
      if (result.actionType === "previousScreen") {
        if (screenHistory.length > 0) {
          const prev = screenHistory[screenHistory.length - 1];
          setScreenHistory((hist) => hist.slice(0, -1));
          setScreenId(prev);
          setActiveDialogId(null);
          setLogs((l) => [`${e.name} · 回上一畫面`, ...l].slice(0, 50));
        } else {
          notify("已無上一畫面記錄", false);
        }
      } else if (result.actionType === "openDialog") {
        setActiveDialogId(result.dialogId);
        setLogs((l) => [`${e.name} · 開啟對話盒`, ...l].slice(0, 50));
      } else if (result.actionType === "closeDialog") {
        setActiveDialogId(null);
        setLogs((l) => [`${e.name} · 關閉對話盒`, ...l].slice(0, 50));
      }
      return;
    }
    if ("screenId" in result) {
      setScreenHistory((hist) => [...hist, screenId]);
      setScreenId(result.screenId);
      setActiveDialogId(null);
    } else if ("variableId" in result) {
      setValues((old) => ({ ...old, [result.variableId]: result.value }));
    }
    setLogs((l) => [`${e.name} · 動作：${e.action}`, ...l].slice(0, 50));
  }

  function momentaryAction(e: Element, down: boolean) {
    if (!running) return;
    if (e.enabledId && !values[e.enabledId]) return;
    if (!e.variableId) return;
    setValues((old) => ({ ...old, [e.variableId!]: down }));
    setLogs((l) => [`${e.name} · 點動：${down ? "ON" : "OFF"}`, ...l].slice(0, 50));
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
    activeDialogId,
    closeActiveDialog,
    action,
    momentaryAction,
    input,
    resetSimulation,
    ...runtimeData,
  };
}
