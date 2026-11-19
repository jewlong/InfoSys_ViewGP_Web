import { useMemo, useState } from "react";
import { AlertCircle, Check, Download, RefreshCw, Upload, X } from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import {
  downloadPiZeroProject,
  fetchPiZeroStatus,
  PI_ZERO_LIMITS,
  pushProjectToPiZero,
  validateForPiZero,
} from "../../services/piZeroExport";

const HOST_STORAGE_KEY = "viewgp.pizero.host";

export function PiZeroDeployDialog() {
  const { project, setDialog, notify } = useEditorContext();
  const report = useMemo(() => validateForPiZero(project), [project]);
  const [host, setHost] = useState(
    () => localStorage.getItem(HOST_STORAGE_KEY) || "192.168.1.100",
  );
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusOut, setStatusOut] = useState("");

  const canDownload = report.errors.length === 0;
  const canOta =
    report.errors.length === 0 &&
    report.jsonBytes <= PI_ZERO_LIMITS.otaMaxBytes;

  async function onTestConn() {
    if (!host.trim()) return;
    localStorage.setItem(HOST_STORAGE_KEY, host.trim());
    setBusy(true);
    setStatusOut("連線查詢中…");
    try {
      const data = await fetchPiZeroStatus(host);
      setStatusOut(JSON.stringify(data, null, 2));
    } catch (e) {
      setStatusOut(`連線失敗：${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function onPush() {
    if (!host.trim() || !canOta) return;
    localStorage.setItem(HOST_STORAGE_KEY, host.trim());
    setBusy(true);
    setStatusOut("上傳並觸發 Pi Zero 熱重載中…");
    try {
      const res = await pushProjectToPiZero(project, host, token);
      if (res.ok) {
        notify("已推送至 Pi Zero 並觸發熱重載");
        setStatusOut(`推送成功 (HTTP ${res.status})：${res.text}`);
      } else {
        notify(`推送失敗 (HTTP ${res.status})`, true);
        setStatusOut(`推送失敗 (HTTP ${res.status})：${res.text}`);
      }
    } catch (e) {
      notify(`推送失敗：${String(e)}`, true);
      setStatusOut(`推送失敗：${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => setDialog(null)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="匯出與部署至 Pi Zero"
        className="modal"
        style={{ maxWidth: 680 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>匯出 / 部署至 Pi Zero (project.json)</h2>
          <button aria-label="關閉對話框" onClick={() => setDialog(null)}>
            <X size={19} />
          </button>
        </div>
        <div className="modal-body" style={{ display: "grid", gap: 14 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
              fontSize: 12,
              background: "rgba(15,23,42,0.45)",
              padding: 10,
              borderRadius: 6,
            }}
          >
            <div>
              畫面：{report.stats.screens}/{PI_ZERO_LIMITS.maxScreens}
            </div>
            <div>
              元件：{report.stats.elements}/{PI_ZERO_LIMITS.maxTotalElements}
            </div>
            <div>
              變數：{report.stats.variables}/{PI_ZERO_LIMITS.maxVariables}
            </div>
            <div>
              設備：{report.stats.devices}/{PI_ZERO_LIMITS.maxDevices}
            </div>
            <div>
              圖片：{report.stats.assets}/{PI_ZERO_LIMITS.maxAssets}
            </div>
            <div>
              趨勢：{report.stats.trends}/{PI_ZERO_LIMITS.maxTrends}
            </div>
            <div>
              警報區：{report.stats.alarmAreas}/{PI_ZERO_LIMITS.maxAlarmAreas}
            </div>
            <div>大小：{(report.jsonBytes / 1024).toFixed(1)} KB</div>
          </div>

          {report.errors.length === 0 && report.warnings.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#4ade80" }}>
              <Check size={16} />
              <span>所有容量、格式與外觀屬性均完全相容於 Pi Zero 執行端。</span>
            </div>
          ) : (
            <div style={{ maxHeight: 190, overflow: "auto", display: "grid", gap: 6 }}>
              {report.errors.map((item, idx) => (
                <div
                  key={`e-${idx}`}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: "rgba(239,68,68,0.16)",
                    border: "1px solid rgba(239,68,68,0.4)",
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#fca5a5" }}>
                    <AlertCircle size={14} />
                    <b>[錯誤] {item.location}</b>：{item.message}
                  </div>
                  <div style={{ opacity: 0.85, marginTop: 2 }}>建議：{item.fix}</div>
                </div>
              ))}
              {report.warnings.map((item, idx) => (
                <div
                  key={`w-${idx}`}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: "rgba(245,158,11,0.14)",
                    border: "1px solid rgba(245,158,11,0.35)",
                    fontSize: 12,
                  }}
                >
                  <div style={{ color: "#fcd34d" }}>
                    <b>[警告] {item.location}</b>：{item.message}
                  </div>
                  <div style={{ opacity: 0.85, marginTop: 2 }}>說明：{item.fix}</div>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 6,
              borderTop: "1px solid rgba(148,163,184,0.2)",
            }}
          >
            <span style={{ fontSize: 12, opacity: 0.85 }}>
              SD 卡離線部署：下載後直接複製至 MicroSD 根目錄覆蓋 project.json
            </span>
            <button
              disabled={!canDownload}
              onClick={() => {
                downloadPiZeroProject(project);
                notify("已下載 Pi Zero 專用 project.json");
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Download size={15} />
              下載 project.json
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
              paddingTop: 10,
              borderTop: "1px solid rgba(148,163,184,0.2)",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              Wi-Fi 現場熱更新（Pi Zero Port 8080）
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="Pi Zero IP（例如 192.168.1.100）"
              />
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ops_token（若 wifi.txt 未設可留空）"
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                disabled={busy || !host.trim()}
                onClick={() => void onTestConn()}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <RefreshCw size={14} />
                查詢 Pi Zero 狀態
              </button>
              <button
                disabled={busy || !canOta || !host.trim()}
                onClick={() => void onPush()}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Upload size={14} />
                一鍵推送並熱重載
              </button>
            </div>
            {statusOut && (
              <pre
                style={{
                  maxHeight: 140,
                  overflow: "auto",
                  fontSize: 11,
                  padding: 8,
                  borderRadius: 6,
                  background: "rgba(2,6,23,0.7)",
                  margin: 0,
                }}
              >
                {statusOut}
              </pre>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
