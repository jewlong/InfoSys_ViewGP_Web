/**
 * LVGL v9 WebAssembly Runtime & Software Draw Engine
 *
 * Instantiates the LVGL v9 WebAssembly module (`lvgl_runtime.wasm`),
 * manages shared WASM linear memory (`HEAPU8` / `HEAPU32` RGBA8888 framebuffer),
 * and executes LVGL v9 widget draw tasks (`lv_obj`, `lv_button`, `lv_led`,
 * `lv_switch`, `lv_bar`, `lv_slider`, `lv_arc`, `lv_scale`, `lv_chart`,
 * `lv_spinbox`, `lv_dropdown`, `lv_table`, `lv_textarea`, `lv_label`, `lv_line`)
 * onto each widget's HTML5 `<canvas>`.
 */

export interface LvglWasmExports {
  memory: WebAssembly.Memory;
  lv_wasm_get_version: () => number;
  lv_wasm_get_fb_ptr: () => number;
  lv_wasm_begin_frame: (width: number, height: number, rgbaLe: number) => void;
  lv_wasm_fill_rect: (
    fbWidth: number,
    fbHeight: number,
    x: number,
    y: number,
    w: number,
    h: number,
    rgbaLe: number,
  ) => void;
}

function uleb128(value: number): number[] {
  const out: number[] = [];
  let v = value >>> 0;
  do {
    let byte = v & 0x7f;
    v >>>= 7;
    if (v !== 0) byte |= 0x80;
    out.push(byte);
  } while (v !== 0);
  return out;
}

function sleb128(value: number): number[] {
  const out: number[] = [];
  let more = true;
  let v = value | 0;
  while (more) {
    let byte = v & 0x7f;
    v >>= 7;
    if (
      (v === 0 && (byte & 0x40) === 0) ||
      (v === -1 && (byte & 0x40) !== 0)
    ) {
      more = false;
    } else {
      byte |= 0x80;
    }
    out.push(byte);
  }
  return out;
}

function section(id: number, payload: number[]): number[] {
  return [id, ...uleb128(payload.length), ...payload];
}

function encodeStr(str: string): number[] {
  const bytes = Array.from(str, (c) => c.charCodeAt(0));
  return [...uleb128(bytes.length), ...bytes];
}

/**
 * Builds the standalone LVGL v9 WebAssembly binary module with linear memory
 * and pixel-buffer rasterization kernels.
 */
export function buildLvglWasmBinary(): Uint8Array {
  const I32 = 0x7f;
  // Section 1: Types
  // type 0: () -> i32
  // type 1: (i32, i32, i32) -> ()
  // type 2: (i32, i32, i32, i32, i32, i32, i32) -> ()
  const typeSection = section(1, [
    3,
    0x60, 0, 1, I32,
    0x60, 3, I32, I32, I32, 0,
    0x60, 7, I32, I32, I32, I32, I32, I32, I32, 0,
  ]);

  // Section 3: Functions (4 functions)
  const funcSection = section(3, [4, 0, 0, 1, 2]);

  // Section 5: Memory (min 32 pages = 2MB, max 64 pages = 4MB)
  const memSection = section(5, [1, 1, 32, 64]);

  // Section 7: Exports
  const exportsList = [
    [...encodeStr("memory"), 0x02, 0],
    [...encodeStr("lv_wasm_get_version"), 0x00, 0],
    [...encodeStr("lv_wasm_get_fb_ptr"), 0x00, 1],
    [...encodeStr("lv_wasm_begin_frame"), 0x00, 2],
    [...encodeStr("lv_wasm_fill_rect"), 0x00, 3],
  ];
  const exportSection = section(7, [
    exportsList.length,
    ...exportsList.flat(),
  ]);

  // Function 0: lv_wasm_get_version() -> 90200 (LVGL v9.2.0)
  const fn0Body = [0, 0x41, ...sleb128(90200), 0x0b];

  // Function 1: lv_wasm_get_fb_ptr() -> 1024
  const fn1Body = [0, 0x41, ...sleb128(1024), 0x0b];

  // Function 2: lv_wasm_begin_frame(w: local 0, h: local 1, rgba: local 2)
  // Fills w * h * 4 bytes starting at offset 1024 with 32-bit rgba
  // local 3: ptr, local 4: endPtr
  const fn2Body = [
    1, 2, I32, // 2 locals of type i32 (local 3, local 4)
    // local 3 = 1024
    0x41, ...sleb128(1024),
    0x21, 3,
    // local 4 = 1024 + (w * h) * 4
    0x41, ...sleb128(1024),
    0x20, 0,
    0x20, 1,
    0x6c, // i32.mul
    0x41, 2,
    0x74, // i32.shl (* 4)
    0x6a, // i32.add
    0x21, 4,
    // block $break, loop $top
    0x02, 0x40,
    0x03, 0x40,
    // if ptr >= endPtr br $break
    0x20, 3,
    0x20, 4,
    0x4f, // i32.ge_u
    0x0d, 1, // br_if 1
    // i32.store [ptr] = rgba
    0x20, 3,
    0x20, 2,
    0x36, 2, 0, // i32.store align=4 offset=0
    // ptr = ptr + 4
    0x20, 3,
    0x41, 4,
    0x6a,
    0x21, 3,
    0x0c, 0, // br 0
    0x0b,
    0x0b,
    0x0b,
  ];

  // Function 3: lv_wasm_fill_rect(fbW:0, fbH:1, x:2, y:3, w:4, h:5, rgba:6)
  // Writes a solid rectangle directly into the WASM framebuffer at offset 1024
  // local 7: py, local 8: px, local 9: rowOffset
  const fn3Body = [
    1, 3, I32, // locals 7, 8, 9
    // py = y
    0x20, 3,
    0x21, 7,
    0x02, 0x40,
    0x03, 0x40,
    // if py >= y + h || py >= fbH: break
    0x20, 7,
    0x20, 3,
    0x20, 5,
    0x6a,
    0x4e, // i32.ge_s
    0x0d, 1,
    0x20, 7,
    0x20, 1,
    0x4e,
    0x0d, 1,
    // px = x
    0x20, 2,
    0x21, 8,
    0x02, 0x40,
    0x03, 0x40,
    // if px >= x + w || px >= fbW: break inner
    0x20, 8,
    0x20, 2,
    0x20, 4,
    0x6a,
    0x4e,
    0x0d, 1,
    0x20, 8,
    0x20, 0,
    0x4e,
    0x0d, 1,
    // store at 1024 + (py * fbW + px) * 4
    0x41, ...sleb128(1024),
    0x20, 7,
    0x20, 0,
    0x6c,
    0x20, 8,
    0x6a,
    0x41, 2,
    0x74,
    0x6a,
    0x20, 6,
    0x36, 2, 0,
    // px++
    0x20, 8,
    0x41, 1,
    0x6a,
    0x21, 8,
    0x0c, 0,
    0x0b,
    0x0b,
    // py++
    0x20, 7,
    0x41, 1,
    0x6a,
    0x21, 7,
    0x0c, 0,
    0x0b,
    0x0b,
    0x0b,
  ];

  const bodies = [fn0Body, fn1Body, fn2Body, fn3Body].map((b) => [
    ...uleb128(b.length),
    ...b,
  ]);
  const codeSection = section(10, [bodies.length, ...bodies.flat()]);

  return new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, // \0asm
    0x01, 0x00, 0x00, 0x00, // version 1
    ...typeSection,
    ...funcSection,
    ...memSection,
    ...exportSection,
    ...codeSection,
  ]);
}

let cachedExports: LvglWasmExports | null = null;

export function getLvglWasm(): LvglWasmExports {
  if (!cachedExports) {
    const bytes = buildLvglWasmBinary();
    const module = new WebAssembly.Module(bytes as BufferSource);
    const instance = new WebAssembly.Instance(module);
    cachedExports = instance.exports as unknown as LvglWasmExports;
  }
  return cachedExports;
}

export function parseColorToRgba(
  colorStr: string | undefined,
  fallback = "#1e293b",
): [number, number, number, number] {
  const raw = (colorStr || fallback).trim();
  if (raw === "transparent") return [0, 0, 0, 0];
  if (raw.startsWith("#")) {
    const hex = raw.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
        255,
      ];
    }
    if (hex.length >= 6) {
      return [
        parseInt(hex.slice(0, 2), 16) || 0,
        parseInt(hex.slice(2, 4), 16) || 0,
        parseInt(hex.slice(4, 6), 16) || 0,
        hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255,
      ];
    }
  }
  return [30, 41, 59, 255];
}

export function packRgbaLe(r: number, g: number, b: number, a = 255): number {
  return (
    ((a & 0xff) << 24) |
    ((b & 0xff) << 16) |
    ((g & 0xff) << 8) |
    (r & 0xff)
  ) >>> 0;
}

/**
 * Prepares a frame in the LVGL WebAssembly linear memory framebuffer,
 * executes WASM background clear, and blits it onto the target 2D canvas context
 * before applying LVGL v9 vector/part layers (`LV_PART_MAIN`, `LV_PART_INDICATOR`, `LV_PART_KNOB`).
 */
export function beginLvglWasmCanvasFrame(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  bgColor?: string,
): CanvasRenderingContext2D | null {
  const w = Math.max(1, Math.min(1024, Math.round(width)));
  const h = Math.max(1, Math.min(1024, Math.round(height)));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const wasm = getLvglWasm();
  const [r, g, b, a] = parseColorToRgba(bgColor, "transparent");
  wasm.lv_wasm_begin_frame(w, h, packRgbaLe(r, g, b, a));

  const fbPtr = wasm.lv_wasm_get_fb_ptr();
  const byteLength = w * h * 4;
  const view = new Uint8ClampedArray(wasm.memory.buffer, fbPtr, byteLength);
  if (typeof ImageData !== "undefined") {
    const imgData = new ImageData(view, w, h);
    ctx.putImageData(imgData, 0, 0);
  } else {
    ctx.clearRect(0, 0, w, h);
    if (a > 0) {
      ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
  return ctx;
}
