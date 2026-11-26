import { spawn, type ChildProcess } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const defaultTarget = process.env.VIEWX_API_URL || "http://localhost:5000";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "viewx-auto-backend",
      configureServer(server) {
        const proxyConfig = server.config.server.proxy?.["/api"];
        const target =
          typeof proxyConfig === "string"
            ? proxyConfig
            : proxyConfig?.target || defaultTarget;
        if (target !== "http://localhost:5000") return;

        let child: ChildProcess | null = null;
        void fetch("http://localhost:5000/api/health")
          .then((r) => {
            if (!r.ok) throw new Error("not ready");
          })
          .catch(() => {
            child = spawn(
              process.env.VIEWX_DOTNET_PATH || "dotnet",
              [
                "run",
                "--project",
                "server/ViewX.Server.csproj",
                "--no-launch-profile",
                "--",
                "--urls",
                "http://localhost:5000",
              ],
              { stdio: "inherit", windowsHide: true },
            );
            child.on("error", () => {
              child = null;
            });
          });

        server.httpServer?.once("close", () => {
          if (child && child.exitCode === null) {
            child.kill();
          }
        });
      },
    },
  ],
  server: {
    proxy: {
      "/api": {
        target: defaultTarget,
        changeOrigin: false,
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            if ("writeHead" in res && !res.headersSent) {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error:
                    "後端 C# 儲存服務正在啟動或尚未連線（http://localhost:5000），請稍候幾秒再試",
                }),
              );
            }
          });
        },
      },
    },
  },
});
