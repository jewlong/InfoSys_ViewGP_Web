import { useRef } from "react";
import { uid, type Project } from "../model";
export const assetUsage = (project: Project, id: string) =>
  project.screens
    .flatMap((s) => s.elements)
    .filter((e) => e.imageAssetId === id).length;
export function useImageResources(
  project: Project,
  change: (fn: (p: Project) => void) => void,
  running: boolean,
  notify: (text: string, error?: boolean) => void,
) {
  const latest = useRef({ project, change, running });
  latest.current = { project, change, running };
  async function uploadImage(
    file: File,
    targetId?: string,
    replaceId?: string,
  ) {
    const projectId = latest.current.project.id;
    try {
      if (file.size > 3 * 1024 * 1024) throw new Error("圖片不可超過 3 MB");
      if (
        !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
          file.type,
        )
      )
        throw new Error("僅支援 PNG、JPEG、WebP、GIF");
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("圖片讀取失敗"));
        reader.readAsDataURL(file);
      });
      await new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("圖片內容無法解碼"));
        image.src = data;
      });
      const state = latest.current;
      if (state.project.id !== projectId || state.running)
        throw new Error("專案已切換或正在執行，請重新上傳");
      if (replaceId && !state.project.assets?.some((a) => a.id === replaceId))
        throw new Error("圖片資源已移除");
      const target = state.project.screens
        .flatMap((s) => s.elements)
        .find((e) => e.id === targetId);
      if (targetId && (!target || target.kind !== "image" || target.locked))
        throw new Error("圖片元件已移除或鎖定");
      const existing = state.project.assets?.find((a) => a.data === data);
      if (!replaceId && !existing && (state.project.assets?.length ?? 0) >= 100)
        throw new Error("最多 100 張圖片資源");
      state.change((p) => {
        p.assets ??= [];
        let id = replaceId ?? existing?.id;
        if (replaceId) p.assets.find((a) => a.id === replaceId)!.data = data;
        else if (!id) {
          id = uid();
          p.assets.push({ id, name: file.name.slice(0, 200) || "圖片", data });
        }
        if (targetId) {
          const element = p.screens
            .flatMap((s) => s.elements)
            .find((e) => e.id === targetId)!;
          element.imageAssetId = id;
          delete element.image;
        }
      });
      notify(replaceId ? "圖片已更換，引用元件同步更新" : "圖片已加入資源庫");
    } catch (error) {
      notify(error instanceof Error ? error.message : "圖片上傳失敗", true);
    }
  }
  function removeAsset(id: string) {
    if (assetUsage(project, id)) {
      notify("此圖片仍被元件引用，請先移除或更換元件圖片", true);
      return;
    }
    change((p) => {
      p.assets = p.assets?.filter((a) => a.id !== id);
    });
  }
  function collectImages() {
    const sources = new Set(
      project.screens
        .flatMap((s) => s.elements)
        .filter((e) => e.kind === "image" && e.image && !e.imageAssetId)
        .map((e) => e.image!),
    );
    if (
      (project.assets?.length ?? 0) +
        [...sources].filter(
          (data) => !project.assets?.some((a) => a.data === data),
        ).length >
        100 ||
      [...sources].some(
        (data) =>
          data.length > 4 * 1024 * 1024 + 30 ||
          !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}(?![\s\S])/.test(
            data,
          ),
      )
    ) {
      notify("現有圖片超過資源限制", true);
      return;
    }
    change((p) => {
      p.assets ??= [];
      for (const e of p.screens.flatMap((s) => s.elements)) {
        if (e.kind !== "image" || !e.image || e.imageAssetId) continue;
        let asset = p.assets.find((a) => a.data === e.image);
        if (!asset) {
          asset = {
            id: uid(),
            name: e.name.slice(0, 200) || "圖片",
            data: e.image,
          };
          p.assets.push(asset);
        }
        e.imageAssetId = asset.id;
        delete e.image;
      }
    });
    notify("現有圖片已收集至資源庫");
  }
  return { uploadImage, removeAsset, collectImages };
}
