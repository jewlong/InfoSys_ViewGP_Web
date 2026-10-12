#!/usr/bin/env python3
"""Package the user-facing manuals and offline tutorial project."""

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
output = DOCS / "ViewGP-使用手冊套件.zip"
files = {
    "ViewGP-操作手冊.pdf": DOCS / "ViewGP-操作手冊.pdf",
    "ViewGP-操作手冊.docx": DOCS / "ViewGP-操作手冊.docx",
    "ViewGP-操作手冊.html": DOCS / "ViewGP-操作手冊.html",
    "manual/examples/泵浦監控教學.json": DOCS / "manual/examples/泵浦監控教學.json",
}
instructions = """ViewGP 使用手冊套件

1. 先解壓縮套件，再開啟「ViewGP-操作手冊.pdf」，閱讀第 1、2 章。
2. 在 ViewGP 選「檔案 → 匯入專案…」，選取
   manual/examples/泵浦監控教學.json，再按「儲存專案」。
3. 按「執行專案」，依第 2 章練習按鈕、變數、Popup 與畫面切換。

教學專案預設離線，未配置設備映射，不會自動連接設備。
網頁手冊可離線閱讀，點擊圖片可放大，也可直接下載內嵌教學專案。
Word 版本可自行編輯；首次開啟時可更新頁碼欄位。
PDF 提供章節書籤與文字搜尋，適合閱讀及列印。
"""

for source in files.values():
    if not source.is_file():
        raise FileNotFoundError(source)

with ZipFile(output, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for target, source in files.items():
        archive.write(source, target)
    archive.writestr("使用說明.txt", instructions.encode("utf-8"))

with ZipFile(output) as archive:
    assert archive.testzip() is None, "Archive integrity check failed"

print(f"Packaged {len(files)} artifacts and instructions: {output.name}")
