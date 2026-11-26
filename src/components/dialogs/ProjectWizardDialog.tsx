import { useState } from "react";
import { ChevronRight, Check, Plus } from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { validateProject } from "../../model";
import { createProjectFromTemplate } from "../../services/projectTemplates";
import { Field, NumberField } from "../ui/Controls";

type WizardStep = 1 | 2 | 3 | 4;

const TEMPLATES: { id: "blank" | "pump" | "alarm" | "trend"; label: string; desc: string }[] = [
  { id: "blank", label: "空白標準專案", desc: "建立空白畫面，自由規劃元件與變數" },
  { id: "pump", label: "泵浦與馬達監控", desc: "含運轉狀態、溫度／壓力儀表、JOG 點動、交易式參數設定" },
  { id: "alarm", label: "全域警報監控中心", desc: "含 16-bit 警報 Word、遮罩變數、跑馬燈與警報清單" },
  { id: "trend", label: "產線多曲線趨勢與產量統計", desc: "含趨勢圖、產量看板與資料紀錄" },
];

export function ProjectWizardDialog() {
  const {
    resetProject,
    change,
    notify,
    setDialog,
  } = useEditorContext();
  const [step, setStep] = useState<WizardStep>(1);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [autoSave, setAutoSave] = useState(true);
  const [templateId, setTemplateId] = useState<"blank" | "pump" | "alarm" | "trend">("blank");
  const [transport, setTransport] = useState<"offline" | "tcp" | "rtu">("offline");
  const [tcpHost, setTcpHost] = useState("127.0.0.1");
  const [tcpPort, setTcpPort] = useState(502);
  const [rtuPort, setRtuPort] = useState("COM1");
  const [rtuBaud, setRtuBaud] = useState(9600);
  const [error, setError] = useState("");

  function next() {
    setError("");
    if (step === 1 && !name.trim()) {
      setError("請輸入專案名稱");
      return;
    }
    setStep((s) => (s === 4 ? 4 : (s + 1) as WizardStep));
  }

  function prev() {
    setError("");
    setStep((s) => (s === 1 ? 1 : (s - 1) as WizardStep));
  }

  function finish() {
    setError("");
    const proj = createProjectFromTemplate({
      name: name.trim(),
      description: desc.trim(),
      templateId,
      width,
      height,
      autoSave,
      transport,
      tcpHost,
      tcpPort,
      rtuPort,
      rtuBaud,
    });
    if (!validateProject(proj)) {
      setError("產生的專案未通過驗證");
      return;
    }
    change((p) => {
      Object.assign(p, proj);
    });
    resetProject(proj);
    notify(`專案「${name.trim()}」已建立`);
    setDialog(null);
  }

  return (
    <div className="modal-backdrop" onClick={() => setDialog(null)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="新增專案精靈"
        className="modal wizard-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>新增專案精靈</h2>
          <button aria-label="關閉對話框" onClick={() => setDialog(null)}>
            <span>×</span>
          </button>
        </div>
        <div className="modal-body wizard-steps">
          <div className="wizard-progress">
            {[
              { label: "1. 專案設定", done: step > 1, active: step === 1 },
              { label: "2. 選擇範本", done: step > 2, active: step === 2 },
              { label: "3. 通訊設定", done: step > 3, active: step === 3 },
              { label: "4. 建立專案", done: false, active: step === 4 },
            ].map((item, i) => (
              <div
                key={i}
                className={`wizard-step ${item.done ? "done" : ""} ${
                  item.active ? "active" : ""
                }`}
              >
                {item.done ? <Check size={14} /> : i + 1}
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {step === 1 && (
            <>
              <Field label="專案名稱">
                <input
                  aria-label="專案名稱"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：一號廠泵浦監控"
                />
              </Field>
              <Field label="專案說明">
                <textarea
                  aria-label="專案說明"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </Field>
              <div className="property-grid">
                <Field label="畫面寬度">
                  <NumberField
                    value={width}
                    min={400}
                    max={4096}
                    onChange={(v) => setWidth(v)}
                  />
                </Field>
                <Field label="畫面高度">
                  <NumberField
                    value={height}
                    min={300}
                    max={4096}
                    onChange={(v) => setHeight(v)}
                  />
                </Field>
              </div>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                />
                啟用自動儲存（編輯停止後 2 秒寫入）
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <p className="muted">選擇內建工控範本作為專案起點</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    className={`template-card ${
                      templateId === t.id ? "selected" : ""
                    }`}
                    onClick={() => setTemplateId(t.id)}
                  >
                    <span style={{ fontWeight: 600 }}>{t.label}</span>
                    <p className="muted" style={{ fontSize: 11 }}>
                      {t.desc}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="通訊模式">
                <select
                  aria-label="通訊模式"
                  value={transport}
                  onChange={(e) =>
                    setTransport(e.target.value as "offline" | "tcp" | "rtu")
                  }
                >
                  <option value="offline">離線模擬（無設備連線）</option>
                  <option value="tcp">Modbus TCP</option>
                  <option value="rtu">COM / Modbus RTU</option>
                </select>
              </Field>
              {transport === "tcp" && (
                <>
                  <Field label="IP / 主機名稱">
                    <input
                      aria-label="TCP 主機"
                      value={tcpHost}
                      onChange={(e) => setTcpHost(e.target.value)}
                    />
                  </Field>
                  <Field label="TCP Port">
                    <NumberField
                      value={tcpPort}
                      min={1}
                      max={65535}
                      onChange={(v) => setTcpPort(v)}
                    />
                  </Field>
                </>
              )}
              {transport === "rtu" && (
                <>
                  <Field label="後端串列埠">
                    <input
                      aria-label="串列埠"
                      value={rtuPort}
                      onChange={(e) => setRtuPort(e.target.value)}
                    />
                  </Field>
                  <Field label="鮑率">
                    <select
                      aria-label="鮑率"
                      value={rtuBaud}
                      onChange={(e) => setRtuBaud(Number(e.target.value))}
                    >
                      {[1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200].map(
                        (n) => (
                          <option key={n}>{n}</option>
                        ),
                      )}
                    </select>
                  </Field>
                </>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <p>請確認專案設定：</p>
              <div className="property-grid">
                <Field label="專案名稱">
                  <span>{name}</span>
                </Field>
                <Field label="畫面尺寸">
                  <span>{width} × {height}</span>
                </Field>
                <Field label="範本">
                  <span>
                    {TEMPLATES.find((t) => t.id === templateId)?.label}
                  </span>
                </Field>
                <Field label="通訊">
                  <span>{transport === "offline" ? "離線模擬" : transport}</span>
                </Field>
                <Field label="自動儲存">
                  <span>{autoSave ? "是（2 秒間隔）" : "否"}</span>
                </Field>
              </div>
              {error && <p role="alert">{error}</p>}
            </>
          )}
        </div>
        <div className="modal-footer wizard-footer">
          {step > 1 && (
            <button className="secondary-btn" onClick={prev}>
              <ChevronRight size={14} rotate={180} /> 上一步
            </button>
          )}
          {step < 4 ? (
            <button className="primary-btn" onClick={next}>
              下一步 <ChevronRight size={14} />
            </button>
          ) : (
            <button className="primary-btn" onClick={finish}>
              <Plus size={14} /> 建立專案
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
