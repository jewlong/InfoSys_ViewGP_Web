import { useEditorContext } from "../../context/EditorContext";
import { Fragment } from "react";
export function MenuBar() {
  const { running, communicationMode, menu, setMenu, menuItems, editingMenus } =
    useEditorContext();
  return (
    <nav className="menu-bar" aria-label="主選單">
      {Object.entries(menuItems).map(([name, items]) => (
        <div
          className="menu-wrap"
          key={name}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            className={menu === name ? "active" : ""}
            disabled={running && editingMenus.includes(name)}
            onClick={() => setMenu(menu === name ? null : name)}
          >
            {name}
          </button>
          {menu === name && (
            <div className="menu-dropdown">
              {items.map((item, index) => (
                <Fragment key={item.label}>
                  {item.category &&
                    items[index - 1]?.category !== item.category && (
                      <div className="menu-category-label">{item.category}</div>
                    )}
                  <button
                    disabled={item.disabled}
                    onClick={() => {
                      setMenu(null);
                      item.fn();
                    }}
                  >
                    <span>{item.label}</span>
                    <kbd>{item.shortcut}</kbd>
                  </button>
                </Fragment>
              ))}
            </div>
          )}
        </div>
      ))}
      <span className="menu-right">
        {running
          ? communicationMode === "online"
            ? "設備監看"
            : "離線監看"
          : "專案規劃"}
      </span>
    </nav>
  );
}
