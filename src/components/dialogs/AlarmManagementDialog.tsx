import { useEffect, useRef, useState } from "react";
import { useEditorContext } from "../../context/EditorContext";
import {
  uid,
  type AlarmArea,
  type AlarmRule,
  type WordAlarmRule,
} from "../../model";
import { globalAlarmProblems } from "../../services/globalAlarms";
import {
  listAlarmHistory,
  type AlarmHistoryPage,
} from "../../services/alarmHistory";
import { Field, NumberField } from "../ui/Controls";
import { ManagementDialog } from "./ManagementDialog";
import { AlarmEventTable } from "./AlarmEventTable";

export function AlarmManagementDialog() {
  const editor = useEditorContext();
  const {
    project,
    change,
    running,
    revision,
    alarmEvents,
    acknowledgeAlarm,
    alarmRuntimeProblems,
    alarmHistoryError,
    alarmHistoryPending,
    retryAlarmHistory,
  } = editor;
  const [tab, setTab] = useState<"settings" | "live" | "history">(
    running ? "live" : "settings",
  );
  const [areaId, setAreaId] = useState(project.alarmAreas?.[0]?.id ?? "");
  const areas = project.alarmAreas ?? [];
  const area = areas.find((item) => item.id === areaId) ?? areas[0];
  const [page, setPage] = useState<AlarmHistoryPage>({
    items: [],
    total: 0,
    offset: 0,
    limit: 50,
  });
  const [filters, setFilters] = useState({
    search: "",
    severity: "",
    group: "",
    from: "",
    to: "",
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  useEffect(() => {
    if (tab === "history" && revision > 0) void load(0);
  }, [tab, project.id, revision]);
  async function load(offset: number) {
    const token = ++request.current;
    setBusy(true);
    setError("");
    try {
      const from = filters.from ? new Date(filters.from).getTime() : undefined;
      const to = filters.to ? new Date(filters.to).getTime() : undefined;
      if (
        (from !== undefined && !Number.isFinite(from)) ||
        (to !== undefined && !Number.isFinite(to)) ||
        (from !== undefined && to !== undefined && from > to)
      )
        throw new Error("請設定有效的開始／結束時間");
      await retryAlarmHistory();
      const data = await listAlarmHistory(project.id, {
        offset,
        limit: 50,
        search: filters.search,
        severity: filters.severity,
        group: filters.group,
        ...(from !== undefined ? { from } : {}),
        ...(to !== undefined ? { to } : {}),
      });
      if (token === request.current) setPage(data);
    } catch (e) {
      if (token === request.current) setError(String(e));
    } finally {
      if (token === request.current) setBusy(false);
    }
  }
  function patchArea(patch: Partial<AlarmArea>) {
    if (!area) return;
    change((p) =>
      Object.assign(
        p.alarmAreas!.find((item) => item.id === area.id)!,
        patch,
      ),
    );
  }
  function patchRule(id: string, patch: Partial<WordAlarmRule>) {
    patchArea({
      rules: area!.rules.map((rule) =>
        rule.id === id ? { ...rule, ...patch } : rule,
      ),
    });
  }
  function addArea() {
    const id = uid(),
      word = uid(),
      mask = uid(),
      name = `警報區 ${areas.length + 1}`;
    change((p) => {
      p.variables.push(
        { id: word, name: `${name} Word`, type: "number", initial: 0 },
        { id: mask, name: `${name} 遮罩`, type: "number", initial: 0 },
      );
      p.alarmAreas = [
        ...(p.alarmAreas ?? []),
        {
          id,
          name,
          variableId: word,
          maskVariableId: mask,
          group: "",
          enabled: true,
          updateIntervalMs: 1000,
          rules: [
            {
              id: uid(),
              bit: 0,
              message: `${name} · Bit 0`,
              severity: "warning",
            },
          ],
        },
      ];
      p.alarmTicker ??= { enabled: true, position: "top", intervalMs: 3000 };
    });
    setAreaId(id);
  }
  const ticker = project.alarmTicker ?? {
    enabled: false,
    position: "top" as const,
    intervalMs: 3000,
  };
  return (
    <ManagementDialog title="全域警報管理與歷史">
      <div className="alarm-management-tabs">
        {(
          [
            ["settings", "警報設定"],
            ["live", "即時警報"],
            ["history", "歷史紀錄"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="alarm-storage-status" role="status">
        {revision === 0
          ? "專案尚未儲存，警報紀錄暫存於本次模擬。請先儲存專案以啟用歷史存檔。"
          : alarmHistoryError
            ? `歷史保存失敗：${alarmHistoryError}`
            : alarmHistoryPending
              ? `正在保存警報歷史（${alarmHistoryPending} 項待送）`
              : "警報歷史已同步至 SQLite"}
        {alarmHistoryError && (
          <button onClick={() => void retryAlarmHistory()}>重試保存</button>
        )}
      </p>
      {tab === "settings" && (
        <>
          {running && <p>停止模擬後可修改警報設定。</p>}
          <fieldset disabled={running} className="alarm-settings">
            <legend>專案警報跑馬燈</legend>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={ticker.enabled}
                onChange={(e) =>
                  change((p) => {
                    p.alarmTicker = { ...ticker, enabled: e.target.checked };
                  })
                }
              />
              啟用警報跑馬燈
            </label>
            <div className="property-grid">
              <Field label="跑馬燈位置">
                <select
                  value={ticker.position}
                  onChange={(e) =>
                    change((p) => {
                      p.alarmTicker = {
                        ...ticker,
                        position: e.target.value as "top" | "bottom",
                      };
                    })
                  }
                >
                  <option value="top">上方</option>
                  <option value="bottom">下方</option>
                </select>
              </Field>
              <Field label="警報輪播間隔">
                <NumberField
                  value={ticker.intervalMs}
                  min={1000}
                  max={60000}
                  suffix="ms"
                  onChange={(value) =>
                    change((p) => {
                      p.alarmTicker = {
                        ...ticker,
                        intervalMs: Math.round(value),
                      };
                    })
                  }
                />
              </Field>
            </div>
          </fieldset>
          <div className="alarm-area-toolbar">
            <Field label="警報區">
              <select
                value={area?.id ?? ""}
                onChange={(e) => setAreaId(e.target.value)}
              >
                <option value="" disabled>
                  尚無警報區
                </option>
                {areas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <button
              className="secondary-btn"
              disabled={running || areas.length >= 100}
              onClick={addArea}
            >
              新增警報區
            </button>
            {area && (
              <button
                disabled={running}
                onClick={() => {
                  if (
                    window.confirm(`刪除「${area.name}」？既有警報歷史仍保留。`)
                  ) {
                    change((p) => {
                      p.alarmAreas = p.alarmAreas!.filter(
                        (a) => a.id !== area.id,
                      );
                    });
                    setAreaId("");
                  }
                }}
              >
                刪除警報區
              </button>
            )}
          </div>
          {area && (
            <fieldset disabled={running} className="alarm-settings">
              <legend>{area.name}</legend>
              <div className="property-grid">
                <Field label="警報區名稱">
                  <input
                    maxLength={200}
                    value={area.name}
                    onChange={(e) => patchArea({ name: e.target.value })}
                  />
                </Field>
                <Field label="警報群組">
                  <input
                    maxLength={200}
                    value={area.group}
                    onChange={(e) => patchArea({ group: e.target.value })}
                  />
                </Field>
                <Field label="警報 Word">
                  <select
                    value={area.variableId}
                    onChange={(e) => patchArea({ variableId: e.target.value })}
                  >
                    <option value="">請選擇</option>
                    {project.variables
                      .filter((v) => v.type === "number")
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="遮罩 Word">
                  <select
                    value={area.maskVariableId ?? ""}
                    onChange={(e) =>
                      patchArea({ maskVariableId: e.target.value || undefined })
                    }
                  >
                    <option value="">不使用遮罩</option>
                    {project.variables
                      .filter((v) => v.type === "number")
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="警報檢查週期">
                  <NumberField
                    value={area.updateIntervalMs}
                    min={100}
                    max={60000}
                    suffix="ms"
                    onChange={(value) =>
                      patchArea({ updateIntervalMs: Math.round(value) })
                    }
                  />
                </Field>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={area.enabled}
                    onChange={(e) => patchArea({ enabled: e.target.checked })}
                  />
                  啟用警報區
                </label>
              </div>
              <p className="muted">
                Word 範圍 0～65535；遮罩位元為 1 時抑制對應警報。例如 Word=4
                觸發 Bit 2，遮罩=4 抑制 Bit
                2。移除遮罩且條件仍成立時會新增一筆警報。
              </p>
              {area.rules.map((rule) => (
                <div className="word-alarm-rule" key={rule.id}>
                  <Field label={`位元 ${rule.bit} 索引`}>
                    <select
                      value={rule.bit}
                      onChange={(e) =>
                        patchRule(rule.id, { bit: Number(e.target.value) })
                      }
                    >
                      {Array.from({ length: 16 }, (_, bit) => (
                        <option
                          key={bit}
                          value={bit}
                          disabled={
                            bit !== rule.bit &&
                            area.rules.some((r) => r.bit === bit)
                          }
                        >
                          Bit {bit}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={`位元 ${rule.bit} 訊息`}>
                    <input
                      maxLength={2000}
                      value={rule.message}
                      onChange={(e) =>
                        patchRule(rule.id, { message: e.target.value })
                      }
                    />
                  </Field>
                  <Field label={`位元 ${rule.bit} 等級`}>
                    <select
                      value={rule.severity}
                      onChange={(e) =>
                        patchRule(rule.id, {
                          severity: e.target.value as AlarmRule["severity"],
                        })
                      }
                    >
                      <option value="info">資訊</option>
                      <option value="warning">警告</option>
                      <option value="critical">嚴重</option>
                    </select>
                  </Field>
                  <label>
                    <input
                      type="checkbox"
                      checked={rule.enabled !== false}
                      onChange={(e) =>
                        patchRule(rule.id, { enabled: e.target.checked })
                      }
                    />
                    啟用
                  </label>
                  <button
                    onClick={() =>
                      patchArea({
                        rules: area.rules.filter((r) => r.id !== rule.id),
                      })
                    }
                    aria-label={`刪除位元 ${rule.bit}`}
                  >
                    刪除
                  </button>
                </div>
              ))}
              <button
                className="secondary-btn"
                disabled={area.rules.length >= 16}
                onClick={() => {
                  const bit = Array.from({ length: 16 }, (_, n) => n).find(
                    (n) => !area.rules.some((r) => r.bit === n),
                  )!;
                  patchArea({
                    rules: [
                      ...area.rules,
                      {
                        id: uid(),
                        bit,
                        message: `${area.name} · Bit ${bit}`,
                        severity: "warning",
                      },
                    ],
                  });
                }}
              >
                新增位元警報
              </button>
            </fieldset>
          )}
          {globalAlarmProblems(project).map((message) => (
            <p key={message} role="alert">
              {message}
            </p>
          ))}
        </>
      )}
      {tab === "live" && (
        <>
          <p>
            {running
              ? "跨畫面持續監看；確認只表示已閱讀，不會解除條件。"
              : "啟動預覽或執行後開始監看。"}
          </p>
          {alarmRuntimeProblems.map((message) => (
            <p role="alert" key={message}>
              {message}
            </p>
          ))}
          <AlarmEventTable
            events={alarmEvents}
            onAcknowledge={running ? acknowledgeAlarm : undefined}
          />
        </>
      )}
      {tab === "history" && (
        <>
          {revision === 0 ? (
            <p>請先儲存專案以查詢歷史。</p>
          ) : (
            <>
              <form
                className="alarm-history-filters"
                onSubmit={(e) => {
                  e.preventDefault();
                  void load(0);
                }}
              >
                <Field label="歷史訊息搜尋">
                  <input
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                  />
                </Field>
                <Field label="歷史等級">
                  <select
                    value={filters.severity}
                    onChange={(e) =>
                      setFilters({ ...filters, severity: e.target.value })
                    }
                  >
                    <option value="">全部</option>
                    <option value="info">資訊</option>
                    <option value="warning">警告</option>
                    <option value="critical">嚴重</option>
                  </select>
                </Field>
                <Field label="歷史群組">
                  <input
                    maxLength={200}
                    value={filters.group}
                    onChange={(e) =>
                      setFilters({ ...filters, group: e.target.value })
                    }
                  />
                </Field>
                <Field label="開始時間">
                  <input
                    type="datetime-local"
                    value={filters.from}
                    onChange={(e) =>
                      setFilters({ ...filters, from: e.target.value })
                    }
                  />
                </Field>
                <Field label="結束時間">
                  <input
                    type="datetime-local"
                    value={filters.to}
                    onChange={(e) =>
                      setFilters({ ...filters, to: e.target.value })
                    }
                  />
                </Field>
                <button className="primary-btn" disabled={busy} type="submit">
                  查詢／重新整理
                </button>
              </form>
              {error && <p role="alert">{error}</p>}
              {busy && <p>讀取歷史中…</p>}
              <AlarmEventTable events={page.items} />
              <div className="alarm-history-pagination">
                <span>
                  共 {page.total} 筆 · 第{" "}
                  {Math.floor(page.offset / page.limit) + 1} 頁
                </span>
                <button
                  disabled={busy || page.offset === 0}
                  onClick={() =>
                    void load(Math.max(0, page.offset - page.limit))
                  }
                >
                  上一頁
                </button>
                <button
                  disabled={
                    busy || page.offset + page.items.length >= page.total
                  }
                  onClick={() => void load(page.offset + page.limit)}
                >
                  下一頁
                </button>
              </div>
            </>
          )}
        </>
      )}
    </ManagementDialog>
  );
}
