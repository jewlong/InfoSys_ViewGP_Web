import { useEffect, useState, type RefObject } from "react";
const sections = [
  { id: "general", label: "一般" },
  { id: "appearance", label: "外觀" },
  { id: "data", label: "資料" },
  { id: "advanced", label: "進階" },
];
export function InspectorNavigation({
  panel,
  objectId,
  kind,
}: {
  panel: RefObject<HTMLElement | null>;
  objectId: string;
  kind: string;
}) {
  const [active, setActive] = useState("general");
  const [available, setAvailable] = useState(["general"]);
  useEffect(() => {
    setActive("general");
    setAvailable(
      sections
        .filter((s) =>
          panel.current?.querySelector(
            '[data-inspector-group="' + s.id + '"] .property-section',
          ),
        )
        .map((s) => s.id),
    );
    const properties = panel.current?.querySelector(".properties");
    if (properties) properties.scrollTop = 0;
  }, [objectId, kind]);
  return (
    <nav className="inspector-navigation" aria-label="屬性區段">
      {sections
        .filter((s) => available.includes(s.id))
        .map((s) => (
          <button
            key={s.id}
            aria-pressed={active === s.id}
            title={"定位至" + s.label + "設定"}
            onClick={() => {
              const target = panel.current?.querySelector<HTMLElement>(
                '[data-inspector-group="' + s.id + '"]',
              );
              const scroll =
                panel.current?.querySelector<HTMLElement>(".properties");
              if (target && scroll) {
                scroll.scrollTop =
                  target.getBoundingClientRect().top -
                  scroll.getBoundingClientRect().top +
                  scroll.scrollTop;
                setActive(s.id);
              }
            }}
          >
            {s.label}
          </button>
        ))}
    </nav>
  );
}
