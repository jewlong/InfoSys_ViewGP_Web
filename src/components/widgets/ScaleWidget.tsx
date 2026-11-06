import { LvglSurface } from "./LvglCanvas";
import type { WidgetProps } from "./types";

export function ScaleWidget({ element }: WidgetProps) {
  const isVertical = element.scaleOrientation === "vertical";
  const majorTicksCount = Math.max(2, element.scaleMajorTicks ?? 5);
  const minorTicksCount = Math.max(0, element.scaleMinorTicks ?? 4);
  const minVal = element.scaleMin ?? 0;
  const maxVal = element.scaleMax ?? 100;
  const showAxis = element.scaleShowAxis ?? true;
  const showLabels = element.scaleShowLabels ?? true;
  const tickColor = element.color || "#94a3b8";

  const totalSteps = (majorTicksCount - 1) * (minorTicksCount + 1);

  const ticks: {
    ratio: number;
    isMajor: boolean;
    label?: string;
  }[] = [];

  for (let i = 0; i <= totalSteps; i++) {
    const isMajor = i % (minorTicksCount + 1) === 0;
    const ratio = i / totalSteps;
    const value = Math.round(minVal + (maxVal - minVal) * ratio);
    ticks.push({
      ratio,
      isMajor,
      label: isMajor ? String(value) : undefined,
    });
  }

  return (
    <div
      data-lvgl-class="lv_scale"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        boxSizing: "border-box",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      <LvglSurface
        element={element}
        lvglClass="lv_scale"
        deps={[
          isVertical,
          majorTicksCount,
          minorTicksCount,
          minVal,
          maxVal,
          showAxis,
          showLabels,
        ]}
        draw={(ctx, w, h) => {
          ctx.strokeStyle = tickColor;
          if (isVertical && showAxis) {
            ctx.beginPath();
            ctx.moveTo(28, 8);
            ctx.lineTo(28, h * 0.92);
            ctx.stroke();
          } else if (!isVertical && showAxis) {
            ctx.beginPath();
            ctx.moveTo(8, 20);
            ctx.lineTo(w * 0.96, 20);
            ctx.stroke();
          }
        }}
      />
      <svg
        width="100%"
        height="100%"
        style={{ display: "block", overflow: "visible", position: "relative", zIndex: 1 }}
      >
        {isVertical ? (
          <>
            {showAxis && (
              <line
                x1="28"
                y1="8"
                x2="28"
                y2="92%"
                stroke={tickColor}
                strokeWidth="1.5"
              />
            )}
            {ticks.map((t, idx) => {
              const y = `${(1 - t.ratio) * 84 + 8}%`;
              const tickLength = t.isMajor ? 16 : 8;
              return (
                <g key={idx}>
                  <line
                    x1={28}
                    y1={y}
                    x2={28 + tickLength}
                    y2={y}
                    stroke={tickColor}
                    strokeWidth={t.isMajor ? "1.5" : "1"}
                  />
                  {showLabels && t.isMajor && (
                    <text
                      x="22"
                      y={y}
                      fill={tickColor}
                      fontSize={Math.max(9, element.fontSize - 4)}
                      textAnchor="end"
                      dominantBaseline="central"
                      fontFamily={element.fontFamily || "monospace"}
                    >
                      {t.label}
                    </text>
                  )}
                </g>
              );
            })}
          </>
        ) : (
          <>
            {showAxis && (
              <line
                x1="8"
                y1="20"
                x2="96%"
                y2="20"
                stroke={tickColor}
                strokeWidth="1.5"
              />
            )}
            {ticks.map((t, idx) => {
              const x = `${t.ratio * 92 + 4}%`;
              const tickHeight = t.isMajor ? 12 : 6;
              return (
                <g key={idx}>
                  <line
                    x1={x}
                    y1="20"
                    x2={x}
                    y2={20 + tickHeight}
                    stroke={tickColor}
                    strokeWidth={t.isMajor ? "1.5" : "1"}
                  />
                  {showLabels && t.isMajor && (
                    <text
                      x={x}
                      y={24 + tickHeight + 8}
                      fill={tickColor}
                      fontSize={Math.max(9, element.fontSize - 4)}
                      textAnchor="middle"
                      dominantBaseline="hanging"
                      fontFamily={element.fontFamily || "monospace"}
                    >
                      {t.label}
                    </text>
                  )}
                </g>
              );
            })}
          </>
        )}
      </svg>
    </div>
  );
}
