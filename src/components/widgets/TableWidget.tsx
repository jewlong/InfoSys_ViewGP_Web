import type { WidgetProps } from "./types";

export function TableWidget({ element }: WidgetProps) {
  const cols = Math.max(1, element.tableCols ?? 3);
  const rows = Math.max(1, element.tableRows ?? 4);
  const borderColor = element.borderColor || "#475569";
  const borderWidth = element.borderWidth ?? 1;
  const gridColor = element.gridColor || "#334155";
  const bg = element.background || "#1e293b";
  const hasDiagonal = Boolean(element.tableDiagonal);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        backgroundColor: bg,
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: element.borderRadius ?? 2,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <table
        style={{
          width: "100%",
          height: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <tbody>
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr key={rIdx}>
              {Array.from({ length: cols }).map((_, cIdx) => {
                const isTopLeft = rIdx === 0 && cIdx === 0;
                return (
                  <td
                    key={cIdx}
                    style={{
                      border: `1px solid ${gridColor}`,
                      position: "relative",
                      padding: "2px",
                      boxSizing: "border-box",
                      verticalAlign: "middle",
                      textAlign: "center",
                    }}
                  >
                    {isTopLeft && hasDiagonal && (
                      <svg
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          pointerEvents: "none",
                        }}
                      >
                        <line
                          x1="0"
                          y1="0"
                          x2="100%"
                          y2="100%"
                          stroke={gridColor}
                          strokeWidth="1"
                        />
                      </svg>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
