import { CommunicationDialog } from "./CommunicationDialog";
import { ModbusMappingFields } from "./ModbusMappingFields";
import { validMapping } from "../../services/communicationRules";
import { VersionHistoryDialog } from "./VersionHistoryDialog";
import { AlarmManagementDialog } from "./AlarmManagementDialog";
import { ImageResourcesDialog } from "./ImageResourcesDialog";
import { ElementPropertiesDialog } from "./ElementPropertiesDialog";
import { PiZeroDeployDialog } from "./PiZeroDeployDialog";
import { AlertCircle, Check, ChevronRight, FolderOpen, X } from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { type Variable } from "../../model";
import { ColorField, Field, NumberField } from "../ui/Controls";
import { ScreenStructureFields } from "../editor/ScreenStructureFields";
import { isPopup } from "../../services/screenRules";
export function ProjectDialogs() {
  const {
    project,
    screen,
    revision,
    grid,
    setLeftTab,
    dialog,
    setDialog,
    rows,
    loading,
    variableDraft,
    setVariableDraft,
    notify,
    change,
    editScreen,
    openProject,
    check,
  } = useEditorContext();
  if (dialog === "versions") return <VersionHistoryDialog />;
  if (dialog === "communication") return <CommunicationDialog />;
  if (dialog === "alarms") return <AlarmManagementDialog />;
  if (dialog === "assets") return <ImageResourcesDialog />;
  if (dialog === "element") return <ElementPropertiesDialog />;
  if (dialog === "pizero") return <PiZeroDeployDialog />;
  return (
    dialog && (
      <div className="modal-backdrop" onClick={() => setDialog(null)}>
        <section
          role="dialog"
          aria-modal="true"
          aria-label={
            {
              projects: "開啟專案",
              project: "專案設定",
              screen: "畫面設定",
              variable: "變數設定",
              help: "操作說明",
              check: "專案檢查",
            }[dialog]
          }
          className="modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>
              {
                {
                  projects: "開啟專案",
                  project: "專案設定",
                  screen: "畫面設定",
                  variable: "變數設定",
                  help: "操作說明",
                  check: "專案檢查",
                }[dialog]
              }
            </h2>
            <button aria-label="關閉對話框" onClick={() => setDialog(null)}>
              <X size={19} />
            </button>
          </div>
          <div className="modal-body">
            {dialog === "projects" &&
              (loading ? (
                <p>讀取中…</p>
              ) : rows.length ? (
                <div className="project-list">
                  {rows.map((row) => (
                    <button
                      key={row.id}
                      onClick={() => void openProject(row.id)}
                    >
                      <FolderOpen size={22} />
                      <span>
                        <b>{row.name}</b>
                        <small>
                          {new Date(row.updated_at).toLocaleString("zh-TW")} ·
                          版本 {row.revision}
                        </small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="modal-empty">
                  <FolderOpen size={32} />
                  <p>尚未儲存任何專案</p>
                  <span>關閉此視窗後，按「儲存」建立第一個專案。</span>
                </div>
              ))}
            {dialog === "project" && (
              <>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={project.autoSave ?? false}
                    onChange={(e) =>
                      change((p) => {
                        p.autoSave = e.target.checked;
                      })
                    }
                  />
                  啟用自動儲存
                </label>
                <p className="muted">
                  編輯停止 2
                  秒後儲存；關閉設定視窗後開始。儲存失敗時暫停，避免覆蓋他人版本。
                </p>
                <Field label="專案名稱">
                  <input
                    value={project.name}
                    onChange={(e) => change((p) => (p.name = e.target.value))}
                  />
                </Field>
                <Field label="專案說明">
                  <textarea
                    value={project.description}
                    onChange={(e) =>
                      change((p) => (p.description = e.target.value))
                    }
                  />
                </Field>
                <Field label="起始畫面">
                  <select
                    value={project.startScreenId}
                    onChange={(e) =>
                      change((p) => (p.startScreenId = e.target.value))
                    }
                  >
                    {project.screens
                      .filter((s) => !isPopup(s))
                      .map((s) => (
                        <option value={s.id} key={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <p className="info-box">
                  格式版本 1 · SQLite 本機儲存 · JSON 匯入／匯出
                </p>
              </>
            )}
            {dialog === "screen" && (
              <>
                <ScreenStructureFields />
                <Field label="畫面名稱">
                  <input
                    value={screen.name}
                    onChange={(e) =>
                      editScreen((s) => (s.name = e.target.value))
                    }
                  />
                </Field>
                <div className="property-grid">
                  <Field label="寬度">
                    <NumberField
                      value={screen.width}
                      min={100}
                      max={4096}
                      onChange={(v) => editScreen((s) => (s.width = v))}
                    />
                  </Field>
                  <Field label="高度">
                    <NumberField
                      value={screen.height}
                      min={100}
                      max={4096}
                      onChange={(v) => editScreen((s) => (s.height = v))}
                    />
                  </Field>
                </div>
                <Field label="背景顏色">
                  <ColorField
                    value={screen.background}
                    onChange={(v) => editScreen((s) => (s.background = v))}
                  />
                </Field>
              </>
            )}
            {dialog === "variable" && variableDraft && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (
                    !variableDraft.name.trim() ||
                    project.variables.some(
                      (v) =>
                        v.id !== variableDraft.id &&
                        v.name === variableDraft.name.trim(),
                    )
                  ) {
                    notify("變數名稱不能空白或重複", true);
                    return;
                  }
                  if (
                    variableDraft.modbus &&
                    !validMapping(variableDraft.modbus, variableDraft.type)
                  ) {
                    notify("標籤位址設定無效", true);
                    return;
                  }
                  change((p) => {
                    const i = p.variables.findIndex(
                      (v) => v.id === variableDraft.id,
                    );
                    if (i < 0)
                      p.variables.push({
                        ...variableDraft,
                        name: variableDraft.name.trim(),
                      });
                    else
                      p.variables[i] = {
                        ...variableDraft,
                        name: variableDraft.name.trim(),
                      };
                  });
                  setDialog(null);
                  setLeftTab("variables");
                  notify("變數設定已更新");
                }}
              >
                <Field label="變數名稱">
                  <input
                    required
                    value={variableDraft.name}
                    onChange={(e) =>
                      setVariableDraft({
                        ...variableDraft,
                        name: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="資料型別">
                  <select
                    value={variableDraft.type}
                    onChange={(e) => {
                      const type = e.target.value as Variable["type"];
                      setVariableDraft({
                        ...variableDraft,
                        type,
                        modbus: undefined,
                        initial:
                          type === "number"
                            ? 0
                            : type === "boolean"
                              ? false
                              : "",
                      });
                    }}
                  >
                    <option value="number">數值（number）</option>
                    <option value="boolean">布林（boolean）</option>
                    <option value="string">文字（string）</option>
                  </select>
                </Field>
                <Field label="分類">
                  <input
                    placeholder="例如：設備狀態"
                    value={variableDraft.category ?? ""}
                    onChange={(e) =>
                      setVariableDraft({
                        ...variableDraft,
                        category: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="初始值">
                  {variableDraft.type === "boolean" ? (
                    <select
                      value={String(variableDraft.initial)}
                      onChange={(e) =>
                        setVariableDraft({
                          ...variableDraft,
                          initial: e.target.value === "true",
                        })
                      }
                    >
                      <option value="false">False / 關閉</option>
                      <option value="true">True / 開啟</option>
                    </select>
                  ) : (
                    <input
                      type={variableDraft.type === "number" ? "number" : "text"}
                      step="any"
                      required={variableDraft.type === "number"}
                      value={String(variableDraft.initial)}
                      onChange={(e) =>
                        setVariableDraft({
                          ...variableDraft,
                          initial:
                            variableDraft.type === "number"
                              ? Number(e.target.value)
                              : e.target.value,
                        })
                      }
                    />
                  )}
                </Field>
                <ModbusMappingFields
                  variable={variableDraft}
                  devices={project.devices ?? []}
                  onChange={(modbus) =>
                    setVariableDraft({ ...variableDraft, modbus })
                  }
                />
                <button className="primary-btn full" type="submit">
                  儲存變數設定
                </button>
              </form>
            )}
            {dialog === "check" && (
              <>
                <p className="check-summary">
                  {check().length ? (
                    <>
                      <AlertCircle size={20} />
                      {check().length} 個項目需要處理
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      專案檢查通過，可以執行
                    </>
                  )}
                </p>
                {check().map((msg, i) => (
                  <div className="check-item" key={i}>
                    <AlertCircle size={14} />
                    {msg}
                  </div>
                ))}
                {!check().length && (
                  <p className="muted">
                    已檢查變數綁定、資料型別、畫面範圍與切換目標。
                  </p>
                )}
              </>
            )}
            {dialog === "help" && (
              <>
                <p>
                  ViewGP <b>v0.2.0</b> · 瀏覽器畫面規劃工具
                </p>
                <ol className="help-steps">
                  <li>從左側加入元件，拖曳定位或調整四角控制點。</li>
                  <li>在右側設定外觀、綁定變數及按鈕動作。</li>
                  <li>
                    按「儲存」保存至 SQLite；使用「檔案」匯入／匯出 JSON。
                  </li>
                  <li>按「預覽」或「執行專案」測試互動，右側可修改模擬值。</li>
                </ol>
                <div className="shortcut-list">
                  {[
                    ["儲存", "Ctrl / ⌘ S"],
                    ["復原", "Ctrl / ⌘ Z"],
                    ["重做", "Ctrl / ⌘ Shift Z"],
                    ["複製 / 貼上", "Ctrl / ⌘ C / V"],
                    ["刪除", "Delete"],
                    ["多選", "Shift + 點選"],
                    ["微調位置", "方向鍵（Shift：10 px）"],
                    ["離開執行模式", "Esc"],
                  ].map(([label, key]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <kbd>{key}</kbd>
                    </div>
                  ))}
                </div>
                <p className="info-box">
                  預設為離線模擬。在「通訊設備與標籤」設定 Modbus TCP／RTU
                  並切換設備連線後，即可讀寫後端可存取的設備。
                </p>
              </>
            )}
          </div>
          {dialog !== "variable" && (
            <div className="modal-footer">
              <button className="primary-btn" onClick={() => setDialog(null)}>
                完成
              </button>
            </div>
          )}
        </section>
      </div>
    )
  );
}
