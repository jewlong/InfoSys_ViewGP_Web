import type { Project, Variable } from "../model";

export interface SystemVariable {
  id: string;
  name: string;
  type: Variable["type"];
  description: string;
  readOnly: true;
}

export const SYSTEM_VARIABLES: SystemVariable[] = [
  {
    id: "$SYS.TIME",
    name: "系統時間 (HH:mm:ss)",
    type: "string",
    description: "即時時鐘時間",
    readOnly: true,
  },
  {
    id: "$SYS.DATE",
    name: "系統日期 (yyyy-MM-dd)",
    type: "string",
    description: "即時時鐘日期",
    readOnly: true,
  },
  {
    id: "$SYS.DATETIME",
    name: "系統日期時間",
    type: "string",
    description: "即時完整日期與時間",
    readOnly: true,
  },
  {
    id: "$SYS.CURRENT_SCREEN",
    name: "目前畫面名稱",
    type: "string",
    description: "當前顯示的畫面名稱",
    readOnly: true,
  },
  {
    id: "$SYS.SCREEN_COUNT",
    name: "畫面總數",
    type: "number",
    description: "專案規劃畫面總數量",
    readOnly: true,
  },
  {
    id: "$SYS.ACTIVE_ALARMS",
    name: "目前警報筆數",
    type: "number",
    description: "發生中未解除的警報數量",
    readOnly: true,
  },
  {
    id: "$SYS.BUZZER",
    name: "蜂鳴器狀態",
    type: "boolean",
    description: "警報音或觸控蜂鳴旗標",
    readOnly: true,
  },
  {
    id: "$SYS.TICK_1S",
    name: "1秒脈衝 (1s Pulse)",
    type: "boolean",
    description: "每秒交替 true/false 脈衝接點",
    readOnly: true,
  },
  {
    id: "$SYS.TICK_500MS",
    name: "0.5秒脈衝 (500ms Pulse)",
    type: "boolean",
    description: "每 500ms 交替脈衝接點",
    readOnly: true,
  },
];

export function isSystemVariable(id?: string): boolean {
  return typeof id === "string" && id.startsWith("$SYS.");
}

export function getSystemVariable(id: string): SystemVariable | undefined {
  return SYSTEM_VARIABLES.find((s) => s.id === id);
}

export function computeSystemValues(
  project: Project,
  currentScreenId?: string,
  activeAlarmsCount = 0,
): Record<string, unknown> {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  const timeStr = `${hours}:${minutes}:${seconds}`;
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const currentScreen = project.screens.find((s) => s.id === currentScreenId);
  const currentScreenName = currentScreen?.name ?? project.screens[0]?.name ?? "";

  const tick1s = Math.floor(now.getTime() / 1000) % 2 === 0;
  const tick500ms = Math.floor(now.getTime() / 500) % 2 === 0;

  return {
    "$SYS.TIME": timeStr,
    "$SYS.DATE": dateStr,
    "$SYS.DATETIME": `${dateStr} ${timeStr}`,
    "$SYS.CURRENT_SCREEN": currentScreenName,
    "$SYS.SCREEN_COUNT": project.screens.length,
    "$SYS.ACTIVE_ALARMS": activeAlarmsCount,
    "$SYS.BUZZER": activeAlarmsCount > 0,
    "$SYS.TICK_1S": tick1s,
    "$SYS.TICK_500MS": tick500ms,
  };
}
