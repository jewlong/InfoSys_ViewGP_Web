import type { AlarmRule } from "../model";
export type TrendPoint = { time: number; value: number };
export type AlarmEvent = {
  id: string;
  elementId: string;
  ruleId: string;
  message: string;
  severity: AlarmRule["severity"];
  value: number | boolean;
  raisedAt: number;
  clearedAt?: number;
  acknowledgedAt?: number;
};
