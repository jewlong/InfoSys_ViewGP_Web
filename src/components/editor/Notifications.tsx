import { AlertCircle, Check, X } from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
export function Notifications() {
  const { notice, setNotice } = useEditorContext();
  return (
    notice && (
      <div role="status" className={"toast " + (notice.error ? "error" : "")}>
        {notice.error ? <AlertCircle size={17} /> : <Check size={17} />}
        <span>{notice.text}</span>
        <button onClick={() => setNotice(null)}>
          <X size={14} />
        </button>
      </div>
    )
  );
}
