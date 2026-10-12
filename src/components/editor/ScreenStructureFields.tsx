import { useEditorContext } from "../../context/EditorContext";
import { canInherit, isPopup } from "../../services/screenRules";
import { Field } from "../ui/Controls";

export function ScreenStructureFields() {
  const { project, screen, setScreenType, setParentScreen } =
    useEditorContext();
  return (
    <>
      <Field label="畫面類別">
        <select
          value={screen.type ?? "normal"}
          onChange={(e) => setScreenType(e.target.value as "normal" | "popup")}
        >
          <option value="normal">一般畫面</option>
          <option value="popup">對話盒（Popup）</option>
        </select>
      </Field>
      <Field label="繼承畫面（共通母片）">
        <select
          value={screen.parentScreenId ?? ""}
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
