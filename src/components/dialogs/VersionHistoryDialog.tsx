import { useEffect, useRef, useState } from "react";
import { screenElements } from "../../services/screenRules";
import { useEditorContext } from "../../context/EditorContext";
import * as api from "../../services/projectApi";
import type { Project } from "../../model";
import { initialValues } from "../../utils/project";
import { WidgetRenderer } from "../widgets/WidgetRenderer";
import { ManagementDialog } from "./ManagementDialog";
export function VersionHistoryDialog() {
  const editor = useEditorContext();
  const { project, revision, dirty } = editor;
  const [rows, setRows] = useState<api.VersionRow[]>([]);
  const [preview, setPreview] = useState<{
    project: Project;
    revision: number;
  }>();
  const [screenId, setScreenId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  useEffect(() => {
    let active = true;
    void api
      .listVersions(project.id)
      .then((result) => {
        if (active) setRows(result);
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
      request.current++;
    };
  }, [project.id]);
  async function select(source: number) {
    const token = ++request.current;
    setBusy(true);
    setError("");
    setPreview(undefined);
    try {
      const data = await api.getVersion(project.id, source);
      if (token === request.current) {
        setPreview(data);
        setScreenId(data.project.startScreenId);
      }
    } catch (e) {
      if (token === request.current) setError(String(e));
    } finally {
      if (token === request.current) setBusy(false);
    }
  }
  async function restore() {
    if (!preview || busy || editor.saving) return;
    if (
      !window.confirm(
        `還原至版本 ${preview.revision}？${dirty ? "未儲存變更將被取代。" : ""}還原會建立新版本，保留歷史紀錄。`,
      )
    )
      return;
    setBusy(true);
    try {
      await editor.restore(preview.revision);
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }
  const screen = preview?.project.screens.find((s) => s.id === screenId);
  const scale = screen
    ? Math.min(1, 640 / screen.width, 350 / screen.height)
    : 1;
  return (
    <ManagementDialog title="版本紀錄與還原">
      <p className="muted">
        目前版本 {revision}。選取歷史版本可預覽畫面；還原會建立新版本。
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="version-layout">
        <div className="version-list">
          {rows.map((row) => (
            <button
              disabled={busy}
              key={row.revision}
              className={preview?.revision === row.revision ? "active" : ""}
              onClick={() => void select(row.revision)}
            >
              版本 {row.revision}
              <small>{new Date(row.createdAt).toLocaleString("zh-TW")}</small>
            </button>
          ))}
        </div>
        <div>
          {busy && <p>讀取／還原中…</p>}
          {preview && (
            <>
              <h3>
                {preview.project.name} · 版本 {preview.revision}
              </h3>
              <p>
                {preview.project.screens.length} 個畫面 ·{" "}
                {preview.project.variables.length} 個變數 ·{" "}
                {preview.project.assets?.length ?? 0} 張圖片
              </p>
              <label>
                預覽畫面
                <select
                  aria-label="預覽畫面"
                  value={screenId}
                  onChange={(e) => setScreenId(e.target.value)}
                >
                  {preview.project.screens.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              {screen && (
                <div
                  inert
                  className="version-preview"
                  style={{
                    width: screen.width * scale,
                    height: screen.height * scale,
                  }}
                >
                  <div
                    style={{
                      width: screen.width,
                      height: screen.height,
                      transform: `scale(${scale})`,
                      transformOrigin: "top left",
                      background: screen.background,
                      position: "relative",
                    }}
                  >
                    {screenElements(preview.project, screen.id)
                      .map(({ element }) => element)
                      .filter((e) => e.visible)
                      .map((e) => (
                        <div
                          key={e.id}
                          style={{
                            position: "absolute",
                            left: e.x,
                            top: e.y,
                            width: e.width,
                            height: e.height,
                          }}
                        >
                          <WidgetRenderer
                            element={e}
                            assets={preview.project.assets}
                            values={initialValues(preview.project)}
                            running={false}
                            onAction={() => {}}
                            onInput={() => undefined}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}
              <button
                className="primary-btn"
                disabled={busy || editor.saving}
                onClick={() => void restore()}
              >
                還原此版本
              </button>
            </>
          )}
        </div>
      </div>
    </ManagementDialog>
  );
}
