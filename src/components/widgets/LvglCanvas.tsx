import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { Element } from "../../model";
import {
  beginLvglWasmCanvasFrame,
  getLvglWasm,
  packRgbaLe,
  parseColorToRgba,
} from "../../services/lvglWasmRuntime";

export type LvglDrawCallback = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  wasm: ReturnType<typeof getLvglWasm>,
) => void;

type LvglCanvasProps = {
  element: Element;
  lvglClass: string;
  bgColor?: string;
  draw: LvglDrawCallback;
  deps?: ReadonlyArray<unknown>;
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
};

/**
 * Shared LVGL v9 WebAssembly Canvas Surface.
 * Renders the widget into WASM linear memory (`lvgl_runtime.wasm`) and blits
 * the buffer to a `<canvas>`, while allowing accessible DOM children/overlays
 * to coexist for keyboard navigation and automated testing.
 */
export function LvglCanvas({
  element,
  lvglClass,
  bgColor = "transparent",
  draw,
  deps = [],
  style,
  className,
  children,
}: LvglCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = Math.max(1, Math.round(element.width));
    const h = Math.max(1, Math.round(element.height));
    const ctx = beginLvglWasmCanvasFrame(canvas, w, h, bgColor);
    if (!ctx) return;
    const wasm = getLvglWasm();
    ctx.save();
    draw(ctx, w, h, wasm);
    ctx.restore();
  }, [
    element.width,
    element.height,
    element.color,
    element.background,
    element.fillColor,
    element.trackColor,
    element.borderColor,
    element.borderWidth,
    element.borderStyle,
    element.borderRadius,
    element.fontSize,
    element.text,
    bgColor,
    ...deps,
  ]);

  return (
    <div
      className={`lvgl-widget-host ${className ?? ""}`.trim()}
      data-lvgl-class={lvglClass}
      data-lvgl-version={getLvglWasm().lv_wasm_get_version()}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        className="lvgl-wasm-canvas"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          display: "block",
        }}
      />
      {children}
    </div>
  );
}

/**
 * Direct `<canvas>` surface powered by the LVGL v9 WebAssembly framebuffer.
 * Does not introduce an extra wrapper `<div>`, preserving exact DOM child hierarchies.
 */
export function LvglSurface({
  element,
  lvglClass,
  bgColor = "transparent",
  draw,
  deps = [],
  style,
}: Omit<LvglCanvasProps, "children" | "className">) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = Math.max(1, Math.round(element.width));
    const h = Math.max(1, Math.round(element.height));
    const ctx = beginLvglWasmCanvasFrame(canvas, w, h, bgColor);
    if (!ctx) return;
    const wasm = getLvglWasm();
    ctx.save();
    draw(ctx, w, h, wasm);
    ctx.restore();
  }, [
    element.width,
    element.height,
    element.color,
    element.background,
    element.fillColor,
    element.trackColor,
    element.borderColor,
    element.borderWidth,
    element.borderStyle,
    element.borderRadius,
    element.fontSize,
    element.text,
    bgColor,
    ...deps,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="lvgl-wasm-canvas"
      data-lvgl-class={lvglClass}
      data-lvgl-version={getLvglWasm().lv_wasm_get_version()}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        display: "block",
        ...style,
      }}
    />
  );
}

/**
 * Helper to draw an LVGL v9 styled rounded part (`LV_PART_MAIN`, `LV_PART_INDICATOR`, `LV_PART_KNOB`)
 * using WASM framebuffer rect fill for rectangular cores and high-DPI path smoothing.
 */
export function drawLvglRoundedPart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fill?: string,
  borderColor?: string,
  borderWidth = 0,
  borderStyle: Element["borderStyle"] = "solid",
) {
  if (w <= 0 || h <= 0) return;
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  if (fill && fill !== "transparent") {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (borderWidth > 0 && borderStyle !== "none" && borderColor) {
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = borderColor;
    if (borderStyle === "dashed") ctx.setLineDash([borderWidth * 3, borderWidth * 2]);
    else if (borderStyle === "dotted") ctx.setLineDash([borderWidth, borderWidth * 1.5]);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Executes a WASM-level rectangle fill directly into WASM linear memory and syncs to Canvas.
 */
export function fillWasmRect(
  ctx: CanvasRenderingContext2D,
  wasm: ReturnType<typeof getLvglWasm>,
  fbW: number,
  fbH: number,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  const [r, g, b, a] = parseColorToRgba(color);
  wasm.lv_wasm_fill_rect(
    fbW,
    fbH,
    Math.max(0, Math.round(x)),
    Math.max(0, Math.round(y)),
    Math.max(0, Math.round(w)),
    Math.max(0, Math.round(h)),
    packRgbaLe(r, g, b, a),
  );
  const fbPtr = wasm.lv_wasm_get_fb_ptr();
  const view = new Uint8ClampedArray(wasm.memory.buffer, fbPtr, fbW * fbH * 4);
  if (typeof ImageData !== "undefined") {
    ctx.putImageData(new ImageData(view, fbW, fbH), 0, 0);
  }
}
