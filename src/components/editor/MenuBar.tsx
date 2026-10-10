import { useEditorContext } from "../../context/EditorContext";
export function MenuBar() {
  const { running, right, menu, setMenu, menuItems, editingMenus } =
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
              {items.map((item) => (
                <button
                  key={item.label}
                  disabled={item.disabled}
                  onClick={() => {
                    setMenu(null);
                    item.fn();
                  }}
                >
                  <span>{item.label}</span>
                  <kbd>{item.shortcut}</kbd>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      <span className="menu-right">
        {running ? "SIMULATION MODE" : "DESIGN WORKSPACE"}
      </span>
    </nav>
  );
}
