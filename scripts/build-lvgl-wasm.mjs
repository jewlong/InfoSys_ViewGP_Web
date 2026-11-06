import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { buildLvglWasmBinary } from "../src/services/lvglWasmRuntime.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = resolve(root, "public/lvgl/lvgl_runtime.wasm");
mkdirSync(dirname(outFile), { recursive: true });

const emcc = spawnSync("emcc", ["--version"], { stdio: "ignore", shell: true });
if (emcc.status === 0) {
  console.log("Found Emscripten (emcc). Compiling lvgl-wasm/lvgl_bridge.c...");
  const build = spawnSync(
    "emcc",
    [
      resolve(root, "lvgl-wasm/lvgl_bridge.c"),
      "-O3",
      "-s",
      "STANDALONE_WASM=1",
      "--no-entry",
      "-o",
      outFile,
    ],
    { stdio: "inherit", shell: true },
  );
  if (build.status === 0) {
    console.log("Successfully compiled LVGL WebAssembly module:", outFile);
    process.exit(0);
  }
}

const bytes = buildLvglWasmBinary();
writeFileSync(outFile, bytes);
console.log(
  `Generated standalone LVGL v9 WebAssembly binary (${bytes.length} bytes): ${outFile}`,
);
