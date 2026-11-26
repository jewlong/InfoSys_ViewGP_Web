import type { CommunicationDevice } from "../model";

export type ConnectionTestResult = {
  ok: boolean;
  latencyMs: number;
  message: string;
};

export async function testDeviceConnection(
  device: CommunicationDevice,
): Promise<ConnectionTestResult> {
  const response = await fetch("/api/communication/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(device),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error ?? "設備連線測試失敗");
  return data as ConnectionTestResult;
}
