import type { EditorCore } from "../hooks/useEditor";
import { newProject, uid } from "../model";
import { isPopup } from "../services/screenRules";
import type { MenuItems } from "../types/editor";
import { groupedWidgets, widgetRegistry } from "./widgetRegistry";
export const editingMenus = ["編輯", "畫面", "元件", "排列", "變數"];
export function createEditorMenus(editor: EditorCore): MenuItems {
  const {
    project,
    screen,
    selected,
    setSelected,
    current,
    history,
    future,
    setMode,
    running,
    resetSimulation,
    setZoom,
    grid,
    setGrid,
    snap,
    setSnap,
    left,
    setLeft,
    right,
    setRight,
    setLeftTab,
    setDialog,
    bottom,
    setBottom,
    clipboard,
    importRef,
    notify,
    change,
    patch,
    undo,
    redo,
    guard,
    resetProject,
    save,
    openProjects,
    exportProject,
    addElement,
    remove,
    copy,
    paste,
    newScreen,
    deleteScreen,
    check,
    start,
    align,
    order,
    extremeOrder,
    fit,
    addVariable,
  } = editor;
  const menuItems: MenuItems = {
    檔案: [
      {
        label: "新增專案",
        fn: () => {
          if (guard()) resetProject(newProject());
        },
        shortcut: "",
        disabled: running,
      },
      { label: "開啟專案…", fn: () => void openProjects(), disabled: running },
      { label: "儲存", fn: () => void save(), shortcut: "Ctrl S" },
      { label: "另存新專案", fn: () => void save(true) },
      {
        label: "匯入專案…",
        fn: () => importRef.current?.click(),
        disabled: running,
      },
      { label: "匯出專案", fn: exportProject },
      { label: "匯出 / 部署至 Pi Zero…", fn: () => setDialog("pizero") },
      {
        label: "版本紀錄與還原",
        fn: () => setDialog("versions"),
        disabled: running || editor.saving,
      },
      {
        label: "圖片資源管理",
        fn: () => setDialog("assets"),
        disabled: running,
      },
      { label: "專案設定", fn: () => setDialog("project"), disabled: running },
      { label: "通訊設備與標籤", fn: () => setDialog("communication") },
      { label: "全域警報管理與歷史", fn: () => setDialog("alarms") },
    ],
    編輯: [
      {
        label: "復原",
        fn: undo,
        shortcut: "Ctrl Z",
        disabled: !history.length,
      },
      {
        label: "重做",
        fn: redo,
        shortcut: "Ctrl Shift Z",
        disabled: !future.length,
      },
      {
        label: "剪下",
        fn: () => copy(true),
        shortcut: "Ctrl X",
        disabled: !selected.length,
      },
      {
        label: "複製",
        fn: () => copy(),
        shortcut: "Ctrl C",
        disabled: !selected.length,
      },
      {
        label: "貼上",
        fn: paste,
        shortcut: "Ctrl V",
        disabled: !clipboard.length,
      },
      {
        label: "刪除",
        fn: remove,
        shortcut: "Delete",
        disabled: !selected.length,
      },
      {
        label: "全選",
        fn: () => setSelected(screen.elements.map((e) => e.id)),
        shortcut: "Ctrl A",
      },
    ],
    檢視: [
      { label: "放大", fn: () => setZoom((z) => Math.min(2, z + 0.1)) },
      { label: "縮小", fn: () => setZoom((z) => Math.max(0.1, z - 0.1)) },
      { label: "符合畫面", fn: fit },
      { label: (grid ? "✓ " : "") + "顯示格線", fn: () => setGrid(!grid) },
      { label: (snap ? "✓ " : "") + "吸附格線", fn: () => setSnap(!snap) },
      { label: (left ? "✓ " : "") + "左側面板", fn: () => setLeft(!left) },
      { label: (right ? "✓ " : "") + "屬性面板", fn: () => setRight(!right) },
      {
        label: (bottom ? "✓ " : "") + "執行紀錄",
        fn: () => setBottom(!bottom),
      },
    ],
    畫面: [
      { label: "新增畫面", fn: () => newScreen() },
      { label: "新增對話盒", fn: () => newScreen(false, true) },
      { label: "複製畫面", fn: () => newScreen(true) },
      { label: "重新命名 / 畫面設定", fn: () => setDialog("screen") },
      { label: "刪除畫面", fn: deleteScreen },
      {
        label: "設定為起始畫面",
        disabled: isPopup(screen),
        fn: () => change((p) => (p.startScreenId = screen.id)),
      },
    ],
    元件: groupedWidgets().flatMap((group) =>
      group.kinds.map((kind) => ({
        label: widgetRegistry[kind].label,
        category: group.label,
        fn: () => addElement(kind),
      })),
    ),
    排列: [
      { label: "靠左對齊", fn: () => align("left") },
      { label: "靠右對齊", fn: () => align("right") },
      { label: "靠上對齊", fn: () => align("top") },
      { label: "靠下對齊", fn: () => align("bottom") },
      { label: "水平置中", fn: () => align("center") },
      { label: "垂直置中", fn: () => align("middle") },
      { label: "水平等距", fn: () => align("horizontal") },
      { label: "垂直等距", fn: () => align("vertical") },
      { label: "相同寬度", fn: () => align("width") },
      { label: "相同高度", fn: () => align("height") },
      { label: "上一層", fn: () => order(true) },
      { label: "下一層", fn: () => order(false) },
      { label: "移至最上層", fn: () => extremeOrder(true) },
      { label: "移至最下層", fn: () => extremeOrder(false) },
      {
        label: "群組",
        fn: () => {
          if (selected.length > 1) patch({ groupId: uid() });
          else notify("請選取至少兩個元件", true);
        },
      },
      { label: "取消群組", fn: () => patch({ groupId: undefined }) },
      { label: "鎖定", fn: () => patch({ locked: true }) },
      { label: "解鎖", fn: () => patch({ locked: false }) },
    ],
    變數: [
      { label: "新增變數", fn: addVariable },
      {
        label: "管理 / 搜尋變數",
        fn: () => {
          setLeft(true);
          setLeftTab("variables");
        },
      },
      { label: "檢查引用", fn: () => setDialog("check") },
    ],
    執行: [
      { label: "通訊設定與狀態", fn: () => setDialog("communication") },
      { label: "警報中心", fn: () => setDialog("alarms") },
      { label: "專案檢查", fn: () => setDialog("check") },
      { label: "預覽目前畫面", fn: () => start("preview") },
      { label: "執行完整專案", fn: () => start("run") },
      { label: "停止執行", fn: () => setMode("edit"), disabled: !running },
      {
        label:
          editor.communicationMode === "online"
            ? "重新開始設備連線"
            : "重設模擬資料",
        fn: () => {
          resetSimulation();
          notify(
            editor.communicationMode === "online"
              ? "設備連線重新開始"
              : "模擬資料已重設",
          );
        },
        disabled: !running,
      },
    ],
    說明: [
      { label: "操作說明 / 快捷鍵", fn: () => setDialog("help") },
      { label: "版本資訊", fn: () => setDialog("help") },
    ],
  };
  return menuItems;
}
