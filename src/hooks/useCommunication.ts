import { useEffect, useRef, useState } from "react";
import type { Project } from "../model";
import {
  communicationRequest,
  startCommunication,
  stopCommunication,
  type CommunicationSnapshot,
} from "../services/communication";
import { mappingWriteError } from "../services/communicationRules";

export function useCommunication(
  project: Project,
  active: boolean,
  epoch: number,
  notify: (message: string, error?: boolean) => void,
) {
  const [snapshot, setSnapshot] = useState<CommunicationSnapshot>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState<string[]>([]);
  const sessionRef = useRef<string | undefined>(undefined);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const lifecycle = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    setSnapshot(undefined);
    setError(undefined);
    setPending([]);
    if (!active) return;
    let closed = false,
      timer: number | undefined,
      id: string | undefined;
    const pagehide = (event: PageTransitionEvent) => {
      if (!event.persisted && id)
        navigator.sendBeacon(
          `/api/communication/sessions/${id}/end`,
          new Blob(["{}"], { type: "application/json" }),
        );
    };
    window.addEventListener("pagehide", pagehide);
    const poll = async () => {
      if (closed || !id) return;
      try {
        const current = await communicationRequest<CommunicationSnapshot>(
          `sessions/${id}`,
        );
        if (!closed) {
          setSnapshot(current);
          setError(undefined);
        }
      } catch (e) {
        if (!closed) {
          setError(e instanceof Error ? e.message : "通訊失敗");
          setSnapshot((old) =>
            old
              ? {
                  ...old,
                  tags: Object.fromEntries(
                    Object.entries(old.tags).map(([key, s]) => [
                      key,
                      { ...s, quality: "bad", error: "無法取得通訊資料" },
                    ]),
                  ),
                }
              : old,
          );
        }
      } finally {
        if (!closed) timer = window.setTimeout(poll, 500);
      }
    };
    const previousLifecycle = lifecycle.current;
    const starting = (async () => {
      await previousLifecycle;
      if (closed) return;
      try {
        const current = await startCommunication(project);
        id = current.sessionId;
        if (closed) return;
        sessionRef.current = id;
        setSnapshot(current);
        void poll();
      } catch (e) {
        if (!closed) {
          const message = e instanceof Error ? e.message : "無法開始通訊";
          setError(message);
          notify(message, true);
        }
      }
    })();
    return () => {
      closed = true;
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", pagehide);
      if (sessionRef.current === id) sessionRef.current = undefined;
      // Finish queued releases and close the old serial port before a restart opens it.
      const writes = queue.current;
      lifecycle.current = starting
        .then(() => writes)
        .then(async () => {
          if (id) await stopCommunication(id).catch(() => {});
        });
    };
  }, [project, active, epoch]);
  function writeError(variableId: string, value: unknown): string | undefined {
    const m = project.variables.find((v) => v.id === variableId)?.modbus;
    if (!m) return undefined;
    return (
      mappingWriteError(m, value) ??
      (snapshotRef.current?.tags[variableId]?.quality !== "good" ||
      !sessionRef.current
        ? "設備資料尚未有效，無法寫入"
        : undefined)
    );
  }
  function write(variableId: string, value: unknown) {
    const message = writeError(variableId, value),
      id = sessionRef.current;
    if (message || !id) {
      notify(message ?? "通訊尚未連線", true);
      return;
    }
    setPending((old) => [...old, variableId]);
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        try {
          await communicationRequest(
            `sessions/${id}/write`,
            {
              variableId,
              value,
            },
            30000,
          );
          if (sessionRef.current === id) {
            const current = await communicationRequest<CommunicationSnapshot>(
              `sessions/${id}`,
            );
            setSnapshot(current);
          }
        } catch (e) {
          if (sessionRef.current === id)
            notify(e instanceof Error ? e.message : "設備寫入未能確認", true);
        } finally {
          setPending((old) => {
            const next = [...old],
              index = next.indexOf(variableId);
            if (index >= 0) next.splice(index, 1);
            return next;
          });
        }
      });
  }
  return {
    communicationSnapshot: snapshot,
    communicationError:
      error ??
      (snapshot?.devices
        .filter((d) => d.state === "error")
        .map(
          (d) =>
            (project.devices?.find((device) => device.id === d.id)?.name ??
              d.id) +
            "：" +
            d.error,
        )
        .join("；") ||
        undefined),
    communicationPending: pending,
    writeDevice: write,
    deviceWriteError: writeError,
  };
}
