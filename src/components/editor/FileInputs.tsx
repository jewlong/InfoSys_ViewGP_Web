import { useEditorContext } from "../../context/EditorContext";
export function FileInputs() {
  const { current, importRef, imageRef, uploadImage, importProject } =
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
          await uploadImage(file, current?.id);
        }}
      />
    </>
  );
}
