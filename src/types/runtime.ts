import type { AlarmRule } from "../model";
export type TrendPoint = { time: number; value: number };
export type AlarmEvent = {
  id: string;
  elementId?: string;
  areaId?: string;
  areaName?: string;
  bit?: number;
  group?: string;
  ruleId: string;
  message: string;
  severity: AlarmRule["severity"];
  value: number | boolean;
  raisedAt: number;
  clearedAt?: number;
  acknowledgedAt?: number;
  clearedReason?:
    "condition" | "masked" | "disabled" | "invalidValue" | "sessionEnded";
};
export type AlarmSession = { id: string; startedAt: number };
