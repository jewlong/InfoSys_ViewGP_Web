import { useEffect, useState } from "react";
import type { Notice } from "../types/editor";
export function useNotifications() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [logs, setLogs] = useState<string[]>([
    "編輯器就緒。可點選左側元件加入畫面。",
  ]);
  function notify(text: string, error = false) {
    setNotice({ text, error });
    setLogs((l) =>
      [`${new Date().toLocaleTimeString("zh-TW")}  ${text}`, ...l].slice(0, 50),
    );
  }
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  return { notice, setNotice, logs, setLogs, notify };
}
