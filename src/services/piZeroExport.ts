import type { Project } from "../model";

export const PI_ZERO_LIMITS = {
  schemaVersion: 1,
  maxScreens: 32,
  maxVariables: 256,
  maxTotalElements: 768,
  maxDevices: 16,
  maxAssets: 32,
  maxTrends: 16,
  maxAlarmAreas: 32,
  maxWordRulesPerArea: 16,
  maxLocalAlarmRules: 128,
  maxIdBytes: 47,
  maxNameBytes: 47,
  maxTextBytes: 127,
  maxAlarmMsgBytes: 95,
  otaMaxBytes: 2 * 1024 * 1024,
  sdMaxBytes: 8 * 1024 * 1024,
} as const;

export type PiZeroIssue = {
  severity: "error" | "warning";
  location: string;
  message: string;
  fix: string;
};

export type PiZeroValidationReport = {
  errors: PiZeroIssue[];
  warnings: PiZeroIssue[];
  jsonBytes: number;
  stats: {
    screens: number;
    elements: number;
    variables: number;
    devices: number;
    assets: number;
    trends: number;
    alarmAreas: number;
    localAlarmRules: number;
  };
};

const utf8Bytes = (s: string) => new TextEncoder().encode(s).length;

export function validateForPiZero(project: Project): PiZeroValidationReport {
  const errors: PiZeroIssue[] = [];
  const warnings: PiZeroIssue[] = [];
  const jsonText = JSON.stringify(project, null, 2);
  const jsonBytes = utf8Bytes(jsonText);

  const screens = project.screens.length;
  const variables = project.variables.length;
  const devices = project.devices?.length ?? 0;
  const assets = project.assets?.length ?? 0;
  const alarmAreas = project.alarmAreas?.length ?? 0;
  let elements = 0;
  let trends = 0;
  let localAlarmRules = 0;

  if (project.schemaVersion !== PI_ZERO_LIMITS.schemaVersion) {
    errors.push({
      severity: "error",
      location: "專案根層級",
      message: `schemaVersion 為 ${project.schemaVersion}，Pi Zero 僅支援版本 ${PI_ZERO_LIMITS.schemaVersion}`,
      fix: "請確認使用相容的專案格式版本 1。",
    });
  }

  if (screens > PI_ZERO_LIMITS.maxScreens) {
    errors.push({
      severity: "error",
      location: "畫面清單",
      message: `畫面數量 ${screens} 超過 Pi Zero 上限 ${PI_ZERO_LIMITS.maxScreens}`,
      fix: "請精簡或合併畫面至 32 個以內。",
    });
  }
  if (variables > PI_ZERO_LIMITS.maxVariables) {
    errors.push({
      severity: "error",
      location: "變數清單",
      message: `變數數量 ${variables} 超過 Pi Zero 上限 ${PI_ZERO_LIMITS.maxVariables}`,
      fix: "請移除未使用的變數至 256 個以內。",
    });
  }
  if (devices > PI_ZERO_LIMITS.maxDevices) {
    errors.push({
      severity: "error",
      location: "通訊設備",
      message: `Modbus 設備數 ${devices} 超過 Pi Zero 上限 ${PI_ZERO_LIMITS.maxDevices}`,
      fix: "請縮減設備數量至 16 台以內。",
    });
  }
  if (assets > PI_ZERO_LIMITS.maxAssets) {
    errors.push({
      severity: "error",
      location: "圖片資源",
      message: `圖片資產數 ${assets} 超過 Pi Zero 上限 ${PI_ZERO_LIMITS.maxAssets}`,
      fix: "請刪除未使用的圖片資產至 32 張以內。",
    });
  }
  if (alarmAreas > PI_ZERO_LIMITS.maxAlarmAreas) {
    errors.push({
      severity: "error",
      location: "全域警報區",
      message: `Word 警報區數 ${alarmAreas} 超過 Pi Zero 上限 ${PI_ZERO_LIMITS.maxAlarmAreas}`,
      fix: "請合併警報區至 32 組以內。",
    });
  }
  if (jsonBytes > PI_ZERO_LIMITS.sdMaxBytes) {
    errors.push({
      severity: "error",
      location: "project.json 檔案大小",
      message: `檔案大小 ${(jsonBytes / 1024 / 1024).toFixed(2)} MiB 超過 SD 載入上限 8 MiB`,
      fix: "請壓縮或減少內嵌圖片資產。",
    });
  } else if (jsonBytes > PI_ZERO_LIMITS.otaMaxBytes) {
    warnings.push({
      severity: "warning",
      location: "project.json 檔案大小",
      message: `檔案大小 ${(jsonBytes / 1024 / 1024).toFixed(2)} MiB 超過 Wi-Fi 熱更新上限 2 MiB（僅支援 SD 卡部署）`,
      fix: "若需透過 Wi-Fi 熱更新，請將圖片壓縮使 JSON 低於 2 MiB。",
    });
  }

  for (const a of project.assets ?? []) {
    if (!/^data:image\/(png|jpeg);base64,/.test(a.data)) {
      warnings.push({
        severity: "warning",
        location: `圖片資產「${a.name}」`,
        message: "Pi Zero 目前僅支援 PNG 與 JPEG 圖片解碼（不支援 WebP / GIF）",
        fix: "請將該圖片轉存為 PNG 或 JPEG 後重新匯入。",
      });
    }
  }

  for (const v of project.variables) {
    if (utf8Bytes(v.id) > PI_ZERO_LIMITS.maxIdBytes) {
      warnings.push({
        severity: "warning",
        location: `變數「${v.name}」`,
        message: `變數 ID 長度超過 ${PI_ZERO_LIMITS.maxIdBytes} bytes，Pi Zero 載入時會截斷`,
        fix: "請縮短變數 ID。",
      });
    }
  }

  for (const area of project.alarmAreas ?? []) {
    for (const r of area.rules) {
      if (utf8Bytes(r.message) > PI_ZERO_LIMITS.maxAlarmMsgBytes) {
        warnings.push({
          severity: "warning",
          location: `全域警報「${area.name}」bit ${r.bit}`,
          message: `警報訊息超過 ${PI_ZERO_LIMITS.maxAlarmMsgBytes} bytes，會被截斷`,
          fix: "請將警報訊息精簡至 30 個中文字以內。",
        });
      }
    }
  }

  for (const s of project.screens) {
    elements += s.elements.length;
    for (const el of s.elements) {
      const loc = `畫面「${s.name}」/ 元件「${el.name || el.id}」`;
      if (el.kind === "trend") trends++;
      if (el.kind === "alarm" && el.alarmRules?.length) {
        localAlarmRules += el.alarmRules.length;
        for (const r of el.alarmRules) {
          if (utf8Bytes(r.message) > PI_ZERO_LIMITS.maxAlarmMsgBytes) {
            warnings.push({
              severity: "warning",
              location: loc,
              message: `元件警報訊息「${r.message.slice(0, 16)}…」超過 ${PI_ZERO_LIMITS.maxAlarmMsgBytes} bytes`,
              fix: "請縮短警報訊息文字。",
            });
          }
        }
      }
      if (utf8Bytes(el.text) > PI_ZERO_LIMITS.maxTextBytes) {
        warnings.push({
          severity: "warning",
          location: loc,
          message: `文字內容超過 ${PI_ZERO_LIMITS.maxTextBytes} bytes，Pi Zero 顯示時會截斷`,
          fix: "請精簡文字長度。",
        });
      }
      if (el.image && !/^data:image\/(png|jpeg);base64,/.test(el.image)) {
        warnings.push({
          severity: "warning",
          location: loc,
          message: "內嵌圖片非 PNG/JPEG，Pi Zero 無法解碼",
          fix: "請改用 PNG 或 JPEG 格式圖片。",
        });
      }
      const unsupported: string[] = [];
      if (el.fontFamily) unsupported.push("fontFamily");
      if (el.fontWeight === "bold") unsupported.push("fontWeight(bold)");
      if (el.italic) unsupported.push("italic");
      if (el.imagePosition && el.imagePosition !== "center")
        unsupported.push("imagePosition");
      if (el.buttonHoverBackground || el.buttonHoverColor)
        unsupported.push("buttonHover*");
      if (el.tableDiagonal) unsupported.push("tableDiagonal");
      if (el.borderStyle === "dashed" || el.borderStyle === "dotted")
        unsupported.push(`borderStyle(${el.borderStyle})`);
      if (unsupported.length) {
        warnings.push({
          severity: "warning",
          location: loc,
          message: `Pi Zero 執行端未完全支援外觀屬性：${unsupported.join(", ")}`,
          fix: "Pi Zero 將忽略或近似呈現這些樣式，不影響功能運作。",
        });
      }
    }
  }

  if (elements > PI_ZERO_LIMITS.maxTotalElements) {
    errors.push({
      severity: "error",
      location: "全專案元件",
      message: `元件總數 ${elements} 超過 Pi Zero 上限 ${PI_ZERO_LIMITS.maxTotalElements}`,
      fix: "請精簡元件總數至 768 個以內。",
    });
  }
  if (trends > PI_ZERO_LIMITS.maxTrends) {
    errors.push({
      severity: "error",
      location: "趨勢圖元件",
      message: `趨勢圖數量 ${trends} 超過 Pi Zero 背景取樣上限 ${PI_ZERO_LIMITS.maxTrends}`,
      fix: "請將趨勢圖總數控制在 16 個以內。",
    });
  }
  if (localAlarmRules > PI_ZERO_LIMITS.maxLocalAlarmRules) {
    errors.push({
      severity: "error",
      location: "元件級警報規則",
      message: `元件級警報規則總數 ${localAlarmRules} 超過上限 ${PI_ZERO_LIMITS.maxLocalAlarmRules}`,
      fix: "請改用全域 Word 警報或精簡規則至 128 條以內。",
    });
  }

  return {
    errors,
    warnings,
    jsonBytes,
    stats: {
      screens,
      elements,
      variables,
      devices,
      assets,
      trends,
      alarmAreas,
      localAlarmRules,
    },
  };
}

export function downloadPiZeroProject(project: Project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "project.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function normalizeHost(raw: string): string {
  const trimmed = raw.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  return trimmed.includes(":") ? trimmed : `${trimmed}:8080`;
}

export async function fetchPiZeroStatus(host: string): Promise<unknown> {
  const base = normalizeHost(host);
  const res = await fetch(`http://${base}/api/status`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function pushProjectToPiZero(
  project: Project,
  host: string,
  token?: string,
): Promise<{ ok: boolean; status: number; text: string }> {
  const base = normalizeHost(host);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token && token.trim()) {
    headers["X-Ops-Token"] = token.trim();
  }
  const res = await fetch(`http://${base}/api/project`, {
    method: "POST",
    headers,
    body: JSON.stringify(project),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}
