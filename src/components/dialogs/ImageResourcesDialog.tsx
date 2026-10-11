import { useRef, useState } from "react";
import { useEditorContext } from "../../context/EditorContext";
import { assetUsage } from "../../hooks/useImageResources";
import { ManagementDialog } from "./ManagementDialog";
export function ImageResourcesDialog() {
  const {
    project,
    current,
    patch,
    change,
    uploadImage,
    removeAsset,
    collectImages,
    notify,
    setDialog,
  } = useEditorContext();
  const input = useRef<HTMLInputElement>(null);
  const replace = useRef<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  return (
    <ManagementDialog title="圖片資源管理">
      <div className="resource-toolbar">
        <button
          className="primary-btn"
          disabled={busy}
          onClick={() => {
            replace.current = undefined;
            input.current?.click();
          }}
        >
          上傳圖片
        </button>
        <button disabled={busy} onClick={collectImages}>
          收集現有圖片
        </button>
        <input
          aria-label="搜尋圖片"
          placeholder="搜尋圖片名稱"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <p className="muted">
        PNG、JPEG、WebP、GIF，每張最多 3 MB，最多 100
        張。相同圖片上傳時共用資源。JSON 匯出包含圖片。
      </p>
      <p>
        {project.assets?.length ?? 0} 張圖片資源{busy ? " · 上傳中…" : ""}
      </p>
      <input
        hidden
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple={!replace.current}
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          const id = replace.current;
          e.target.value = "";
          setBusy(true);
          for (const file of id ? files.slice(0, 1) : files)
            await uploadImage(file, undefined, id);
          setBusy(false);
        }}
      />
      <div className="resource-grid">
        {project.assets
          ?.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
          .map((a) => (
            <article className="resource-card" key={a.id}>
              <img src={a.data} alt={a.name} />
              <input
                aria-label={`圖片名稱 ${a.name}`}
                defaultValue={a.name}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (!name || name.length > 200) {
                    e.target.value = a.name;
                    notify("圖片名稱需為 1–200 字", true);
                    return;
                  }
                  if (name !== a.name)
                    change((p) => {
                      p.assets!.find((item) => item.id === a.id)!.name = name;
                    });
                }}
              />
              <small>
                {assetUsage(project, a.id)} 個元件引用 · 約{" "}
                {Math.ceil((a.data.length * 0.75) / 1024)} KB
              </small>
              <div>
                <button
                  disabled={busy || current?.kind !== "image" || current.locked}
                  onClick={() => {
                    patch({ imageAssetId: a.id, image: undefined });
                    setDialog(null);
                  }}
                >
                  套用圖片
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    replace.current = a.id;
                    input.current?.click();
                  }}
                >
                  更換圖片
                </button>
                <button disabled={busy} onClick={() => removeAsset(a.id)}>
                  刪除圖片
                </button>
              </div>
            </article>
          ))}
      </div>
      {!project.assets?.length && (
        <p className="muted">尚無圖片資源；上傳圖片或收集現有元件圖片。</p>
      )}
    </ManagementDialog>
  );
}
