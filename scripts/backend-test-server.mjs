import { spawn } from "node:child_process";
import { resolve } from "node:path";
// Run the built C# assembly directly so tests own and terminate the actual server.
export async function startBackend(databasePath, port, options = {}) {
  const dll =
    options.assembly || resolve("server/bin/Debug/net10.0/ViewX.Server.dll");
  const child = spawn(
    process.env.VIEWX_DOTNET_PATH || "dotnet",
    [dll, "--urls", `http://127.0.0.1:${port}`],
    {
      cwd: options.workingDirectory || resolve("server"),
      env: {
        ...process.env,
        VIEWX_DB_PATH: databasePath,
        ASPNETCORE_ENVIRONMENT: "Production",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout.on("data", (c) => (output += c));
  child.stderr.on("data", (c) => (output += c));
  let spawnError;
  child.on("error", (e) => (spawnError = e));
  const base = `http://127.0.0.1:${port}`;
  const close = async () => {
    if (child.exitCode !== null || spawnError) return;
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill("SIGTERM");
    const timeout = setTimeout(() => child.kill("SIGKILL"), 5000);
    await exited;
    clearTimeout(timeout);
  };
  try {
    for (let i = 0; i < 150; i++) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null)
        throw new Error(`C# server exited ${child.exitCode}: ${output}`);
      try {
        const r = await fetch(base + "/api/health");
        if (r.ok && (await r.json()).status === "ok") return { base, close };
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("C# server startup timeout: " + output);
  } catch (e) {
    await close();
    throw e;
  }
}
