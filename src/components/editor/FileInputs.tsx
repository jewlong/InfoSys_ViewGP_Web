import { useEditorContext } from "../../context/EditorContext";
export function FileInputs() {
  const { current, importRef, imageRef, notify, editScreen, importProject } =
    useEditorContext();
  return (
    <>
      <input
        ref={importRef}
        hidden
        type="file"
        accept=".json,.viewx"
        onChange={(e) => {
          void importProject(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={imageRef}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (file.size > 3 * 1024 * 1024) {
            notify("圖片不可超過 3 MB", true);
            return;
          }
          if (
            !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
              file.type,
            )
          ) {
            notify("僅支援 PNG、JPEG、WebP、GIF", true);
            return;
          }
          const target = current?.id;
          const reader = new FileReader();
          reader.onload = () => {
            editScreen((s) => {
              const item = s.elements.find((i) => i.id === target);
              if (item) item.image = String(reader.result);
            });
          };
          reader.readAsDataURL(file);
        }}
      />
    </>
  );
}
