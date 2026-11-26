import { useEditorContext } from "../../context/EditorContext";
import {
  canInherit,
  isPopup,
  parentScreenId,
} from "../../services/screenRules";
import { Field } from "../ui/Controls";

export function ScreenStructureFields() {
  const { project, screen, setScreenType, setParentScreen, editScreen } =
    useEditorContext();
  return (
    <>
      <Field label="畫面類別">
        <select
          value={isPopup(screen) ? "popup" : "normal"}
          onChange={(e) => setScreenType(e.target.value as "normal" | "popup")}
        >
          <option value="normal">一般畫面</option>
          <option value="popup">對話盒（Popup）</option>
        </select>
      </Field>
      {isPopup(screen) && (
        <>
          <Field label="對話盒寫入模式">
            <select
              value={screen.popupCommitMode ?? "immediate"}
              onChange={(e) =>
                editScreen((s) => {
                  if (e.target.value === "transactional")
                    s.popupCommitMode = "transactional";
                  else delete s.popupCommitMode;
                })
              }
            >
              <option value="immediate">即時寫入（預設）</option>
              <option value="transactional">按「確定」後批次寫入</option>
            </select>
          </Field>
          <Field label="背景互動">
            <select
              value={screen.popupModal === false ? "nonmodal" : "modal"}
              onChange={(e) =>
                editScreen((s) => {
                  if (e.target.value === "nonmodal") s.popupModal = false;
                  else delete s.popupModal;
                })
              }
            >
              <option value="modal">模態：鎖定背景（預設）</option>
              <option value="nonmodal">非模態：背景可操作</option>
            </select>
          </Field>
          <p className="appearance-hint">
            批次寫入模式下，JOG 點動按鈕仍即時動作；其餘設值先暫存，按「確定」才寫入變數。
          </p>
        </>
      )}
      <Field label="繼承畫面（共通母片）">
        <select
          value={parentScreenId(screen) ?? ""}
          onChange={(e) => setParentScreen(e.target.value)}
        >
          <option value="">不繼承</option>
          {project.screens
            .filter((s) => canInherit(project, screen.id, s.id))
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {isPopup(s) ? "（對話盒）" : ""}
              </option>
            ))}
        </select>
      </Field>
      <p className="appearance-hint">
        父畫面元件位於底層，請到父畫面編輯；修改會同步至所有子畫面。子畫面保留自己的尺寸與背景。
      </p>
    </>
  );
}
