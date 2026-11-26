import { useCommunication } from "./useCommunication";
import { useRuntimeData } from "./useRuntimeData";
import { evaluateAction, inputError, parseNumber } from "../services/dataRules";
import {
  useEffect,
  useRef,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Element, Project } from "../model";
import { initialValues } from "../utils/project";
import { openPopup, screenElements, isPopup } from "../services/screenRules";
import { computeSystemValues } from "../services/systemVariables";
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
  const [communicationMode, setCommunicationMode] = useState<
    "offline" | "online"
  >("offline");
  const [mode, updateMode] = useState<"edit" | "preview" | "run">("edit");
  const [popupIds, updatePopupIds] = useState<string[]>([]);
  // Staged values of transactional popups; only written to variables on confirmPopup.
  const [popupDrafts, setPopupDrafts] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const popupRef = useRef<string[]>([]);
  const [screenHistory, setScreenHistory] = useState<string[]>([]);
  const pressed = useRef<
    Map<string, { variableId: string; releaseValue: boolean }>
  >(new Map());
  function releaseMomentary() {
    const items = [...pressed.current.values()];
    pressed.current.clear();
    for (const item of items) writeValue(item.variableId, item.releaseValue);
  }
  function setPopups(ids: string[]) {
    releaseMomentary();
    popupRef.current = ids;
    updatePopupIds(ids);
    setPopupDrafts((old) =>
      Object.fromEntries(Object.entries(old).filter(([id]) => ids.includes(id))),
    );
  }
  function setMode(next: "edit" | "preview" | "run") {
    if (next === "edit") setPopups([]);
    updateMode(next);
  }
  function showPopup(id: string) {
    const next = openPopup(project, popupRef.current, id);
    if (!next) {
      notify(
        `對話盒不存在、已開啟或超過 ${project.maxPopupDepth ?? 16} 層`,
        true,
      );
      return;
    }
    setPopups(next);
  }
  function closePopup() {
    const top = popupRef.current.at(-1);
    if (top && Object.keys(popupDrafts[top] ?? {}).length)
      notify("已捨棄對話盒變更");
    setPopups(popupRef.current.slice(0, -1));
  }
  function isTransactional(sourceScreenId: string) {
    const s = project.screens.find((item) => item.id === sourceScreenId);
    return Boolean(s && isPopup(s) && s.popupCommitMode === "transactional");
  }
  function screenValues(sourceScreenId: string): Record<string, unknown> {
    return isTransactional(sourceScreenId)
      ? { ...values, ...popupDrafts[sourceScreenId] }
      : values;
  }
  function stageOrWrite(sourceScreenId: string, id: string, value: unknown) {
    if (!isTransactional(sourceScreenId)) return writeValue(id, value);
    setPopupDrafts((old) => ({
      ...old,
      [sourceScreenId]: { ...old[sourceScreenId], [id]: value },
    }));
  }
  function confirmPopup(sourceScreenId: string) {
    const draft = popupDrafts[sourceScreenId] ?? {};
    for (const [id, value] of Object.entries(draft)) writeValue(id, value);
    setPopups(popupRef.current.filter((id) => id !== sourceScreenId));
    notify("設定已套用，變數已寫入");
  }
  function canOperate(e: Element, sourceScreenId: string): boolean {
    const top = popupRef.current.at(-1);
    const activeId = top ?? screenId;
    const nonModal =
      project.screens.find((s) => s.id === top)?.popupModal === false &&
      (sourceScreenId === screenId || popupRef.current.includes(sourceScreenId));
    return (
      (activeId === sourceScreenId || nonModal) &&
      screenElements(project, sourceScreenId).some(
        ({ element }) => element.id === e.id,
      ) &&
      e.visible &&
      (!e.conditionId || Boolean(values[e.conditionId]))
    );
  }
  const running = mode !== "edit";
  const [localValues, setValues] = useState<Record<string, unknown>>(() =>
    initialValues(project),
  );
  const [epoch, setEpoch] = useState(0);
  const online = running && communicationMode === "online";
  const communication = useCommunication(project, online, epoch, notify);
  const values: Record<string, unknown> = useMemo(
    () =>
      online
        ? {
          ...localValues,
          ...Object.fromEntries(
            project.variables
              .filter((v) => v.modbus)
              .map((v) => [
                v.id,
                communication.communicationSnapshot?.tags[v.id]?.quality ===
                  "good"
                  ? communication.communicationSnapshot.tags[v.id].value
                  : undefined,
              ]),
          ),
        }
        : localValues,
    [
      online,
      localValues,
      project.variables,
      communication.communicationSnapshot,
    ],
  );
  const invalidVariableIds = online
    ? project.variables
      .filter(
        (v) =>
          v.modbus &&
          communication.communicationSnapshot?.tags[v.id]?.quality !== "good",
      )
      .map((v) => v.id)
    : [];
  const runtimeData = useRuntimeData(
    project,
    values,
    running,
    epoch,
    invalidVariableIds,
  );
  function writeValue(id: string, value: unknown) {
    if (online && project.variables.find((v) => v.id === id)?.modbus)
      communication.writeDevice(id, value);
    else setValues((old) => ({ ...old, [id]: value }));
  }
  function runtimeElementDisabled(e: Element) {
    const v = project.variables.find((v) => v.id === e.variableId);
    const writes =
      ["input", "switch", "slider", "arc", "spinbox", "dropdown"].includes(
        e.kind,
      ) ||
      (e.kind === "button" &&
        ![
          "screen",
          "previousScreen",
          "openDialog",
          "closeDialog",
          "popup",
          "closePopup",
          "confirmPopup",
        ].includes(e.action));
    return Boolean(
      online &&
      v?.modbus &&
      writes &&
      (v.modbus.access !== "readWrite" ||
        communication.communicationSnapshot?.tags[v.id]?.quality !== "good" ||
        (e.action !== "momentary" &&
          communication.communicationPending.includes(v.id))),
    );
  }
  useEffect(() => {
    if (!running) return;
    const update = () =>
      setValues((old) => ({
        ...old,
        ...computeSystemValues(
          project,
          screenId,
          runtimeData.alarmEvents.filter(
            (event) => event.clearedAt === undefined,
          ).length,
        ),
      }));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [running, project, screenId, runtimeData.alarmEvents]);
  useEffect(() => {
    const release = () => releaseRef.current();
    window.addEventListener("blur", release);
    return () => window.removeEventListener("blur", release);
  }, []);
  const releaseRef = useRef(releaseMomentary);
  releaseRef.current = releaseMomentary;
  function resetSimulation() {
    runtimeData.clearRuntimeData();
    setPopups([]);
    setScreenHistory([]);
    setValues(initialValues(project, screenId));
    setEpoch((value) => value + 1);
  }
  function action(e: Element, sourceScreenId: string) {
    if (!running || !canOperate(e, sourceScreenId)) return;
    if ((e.enabledId && !values[e.enabledId]) || runtimeElementDisabled(e))
      return;
    const result = evaluateAction(e, project, screenValues(sourceScreenId));
    if ("error" in result) {
      notify(result.error, true);
      return;
    }
    if ("confirmPopup" in result) {
      if (isTransactional(sourceScreenId)) confirmPopup(sourceScreenId);
      else closePopup();
      return;
    }
    if ("actionType" in result) {
      if (result.actionType === "openDialog") showPopup(result.dialogId);
      else if (result.actionType === "closeDialog") closePopup();
      else if (screenHistory.length) {
        setPopups([]);
        setScreenId(screenHistory.at(-1)!);
        setScreenHistory((old) => old.slice(0, -1));
      } else notify("已無上一畫面記錄");
      return;
    }
    if ("popupId" in result) showPopup(result.popupId);
    else if ("closePopup" in result) closePopup();
    else if ("screenId" in result) {
      setPopups([]);
      setScreenHistory((old) => [...old, screenId]);
      setScreenId(result.screenId);
    } else if (e.action === "momentary") writeValue(result.variableId, result.value);
    else stageOrWrite(sourceScreenId, result.variableId, result.value);
    setLogs((l) => [`${e.name} · 動作：${e.action}`, ...l].slice(0, 50));
  }
  function momentaryAction(e: Element, down: boolean, sourceScreenId: string) {
    if (!down) {
      const item = pressed.current.get(e.id);
      if (item) {
        pressed.current.delete(e.id);
        writeValue(item.variableId, item.releaseValue);
      }
      return;
    }
    if (
      !running ||
      !canOperate(e, sourceScreenId) ||
      (e.enabledId && !values[e.enabledId]) ||
      runtimeElementDisabled(e)
    )
      return;
    const result = evaluateAction(e, project, values);
    if (!("variableId" in result) || typeof result.value !== "boolean") return;
    const releaseValue = !result.value;
    pressed.current.set(e.id, { variableId: result.variableId, releaseValue });
    writeValue(result.variableId, result.value);
  }
  function input(
    e: Element,
    raw: string,
    sourceScreenId: string,
  ): string | undefined {
    if (
      !running ||
      !canOperate(e, sourceScreenId) ||
      (e.enabledId && !values[e.enabledId]) ||
      runtimeElementDisabled(e)
    )
      return "元件未啟用";
    const variable = project.variables.find((v) => v.id === e.variableId);
    if (variable?.type !== "number") return "需綁定有效數值變數";
    const error = inputError(e, raw);
    if (error) return error;
    if (online && variable.modbus) {
      const deviceError = communication.deviceWriteError(
        variable.id,
        parseNumber(raw)!,
      );
      if (deviceError) return deviceError;
    }
    stageOrWrite(sourceScreenId, variable.id, parseNumber(raw)!);
    setLogs((old) => [`${e.name} · 輸入：${raw}`, ...old].slice(0, 50));
    return undefined;
  }
  return {
    ...communication,
    communicationMode,
    setCommunicationMode,
    runtimeElementDisabled,
    runtimeDataInvalid: (e: Element) =>
      Boolean(
        online &&
        project.variables.some((v) => v.id === e.variableId && v.modbus) &&
        communication.communicationSnapshot?.tags[e.variableId!]?.quality !==
        "good",
      ),
    writeValue,
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
    popupDrafts,
    confirmPopup,
    screenValues,
    activeDialogId: popupIds.at(-1) ?? null,
    closeActiveDialog: closePopup,
    momentaryAction,
    ...runtimeData,
  };
}
