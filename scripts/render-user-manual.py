"""Render the maintained Markdown manual to a standalone HTML and editable DOCX.
Requires Python 3 and python-docx. Screenshots and the example are embedded in HTML.
"""
from pathlib import Path
import re, html, base64, struct
from urllib.parse import quote
from docx import Document
from docx.shared import Mm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/"docs/ViewGP-操作手冊.md"
BASE=SOURCE.parent
BASELINE="4d3fbf1"
text=SOURCE.read_text(encoding="utf-8")
lines=text.splitlines()
blocks=[]
i=0
pending_anchor=None
def special(line):
    return bool(re.match(r"^(#{1,3} |<a id=|!\[|\| |[-*] |\d+\. )",line))
while i<len(lines):
    line=lines[i].strip()
    if not line: i+=1;continue
    m=re.fullmatch(r'<a id="([^"]+)"></a>',line)
    if m: pending_anchor=m.group(1);i+=1;continue
    m=re.match(r"^(#{1,3}) (.+)$",line)
    if m:
        level=len(m.group(1))
        anchor=pending_anchor or ("contents" if m.group(2)=="目錄" else None)
        blocks.append(("heading",level,m.group(2),anchor));pending_anchor=None;i+=1;continue
    m=re.fullmatch(r"!\[([^\]]+)\]\(([^)]+)\)",line)
    if m:
        path=(BASE/m.group(2)).resolve()
        if not path.is_file(): raise FileNotFoundError(path)
        width,height=struct.unpack(">II",path.read_bytes()[16:24])
        blocks.append(("image",m.group(1),m.group(2),width,height));i+=1;continue
    if line.startswith("|"):
        rows=[]
        while i<len(lines) and lines[i].strip().startswith("|"):
            row=[v.strip() for v in lines[i].strip().strip("|").split("|")]
            if not all(re.fullmatch(r":?-+:?",v) for v in row): rows.append(row)
            i+=1
        if not all(len(r)==len(rows[0]) for r in rows): raise ValueError("Inconsistent table columns")
        blocks.append(("table",rows));continue
    m=re.match(r"^([-*]|\d+\.) (.*)",line)
    if m:
        ordered=m.group(1).endswith(".");rows=[]
        while i<len(lines):
            m=re.match(r"^([-*]|\d+\.) (.*)",lines[i].strip())
            if not m or m.group(1).endswith(".")!=ordered:break
            rows.append(m.group(2));i+=1
        blocks.append(("list",ordered,rows));continue
    paragraph=[line];i+=1
    while i<len(lines) and lines[i].strip() and not special(lines[i].strip()):
        paragraph.append(lines[i].strip());i+=1
    blocks.append(("paragraph"," ".join(paragraph)))

TOKEN=re.compile(r"(\*\*.+?\*\*|\[[^\]]+\]\([^)]+\))")
LINK=re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
def parts(value):
    for token in TOKEN.split(value):
        if not token:continue
        if token.startswith("**") and token.endswith("**"):yield "bold",token[2:-2],None
        elif (m:=LINK.fullmatch(token)):yield "link",m.group(1),m.group(2)
        else:yield "text",token,None
def target_url(target,embed=False):
    if target.startswith("#"):return target
    path=(BASE/target).resolve()
    if target.endswith(".json") and embed:
        return "data:application/json;base64,"+base64.b64encode(path.read_bytes()).decode()
    if target.endswith(".md"):
        relative=path.relative_to(ROOT).as_posix()
        return "https://github.com/jewlong/InfoSys_ViewGP_Web/blob/"+BASELINE+"/"+quote(relative,safe="/")
    return target
def inline(value):
    result=[]
    for kind,label,target in parts(value):
        label=html.escape(label)
        if kind=="bold":result.append("<strong>"+label+"</strong>")
        elif kind=="link":
            url=target_url(target,True)
            download=' download="泵浦監控教學.json"' if target.endswith(".json") else ""
            result.append('<a href="'+html.escape(url,quote=True)+'"'+download+">"+label+"</a>")
        else:result.append(label)
    return "".join(result)

css="""
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#edf1f5;color:#25364b;font-family:"Noto Sans CJK TC","Microsoft JhengHei","Segoe UI",sans-serif;line-height:1.65;font-size:15px}
.reader{max-width:1180px;margin:auto;display:grid;grid-template-columns:240px minmax(0,1fr);gap:24px;padding:28px 20px}
.sidebar{position:sticky;top:24px;align-self:start;border:1px solid #ccd7e2;background:#fff;padding:18px;max-height:calc(100vh - 48px);overflow:auto;border-radius:4px}
.sidebar b{display:block;color:#225c88;margin-bottom:12px}.sidebar a{display:block;font-size:12px;padding:5px 0;color:#4c657e;text-decoration:none}.sidebar a:hover{color:#175986;background:#edf5fb}
.print-button{border:1px solid #9bb2c9;background:#e7f0f7;color:#244e72;border-radius:3px;padding:7px 12px;cursor:pointer;margin-top:14px}
main{background:#fff;padding:36px 42px;border:1px solid #d4dde7;min-width:0;box-shadow:0 3px 12px #25364b08}
h1{font-size:34px;color:#194f78;margin:12px 0 20px;line-height:1.3;border-bottom:4px solid #306b94;padding-bottom:20px}
h2{font-size:24px;color:#245c85;border-bottom:1px solid #c1d3e2;padding-bottom:9px;margin:44px 0 20px;scroll-margin-top:18px}
h3{font-size:18px;color:#314f6a;margin:26px 0 12px;line-height:1.4}p{margin:10px 0 14px;overflow-wrap:anywhere}strong{color:#214f72}
li{margin:5px 0}ol,ul{padding-left:24px;margin:10px 0 18px}a{color:#216592;text-underline-offset:3px}
table{border-collapse:collapse;width:100%;font-size:13px;margin:15px 0 24px;table-layout:auto}
th,td{border:1px solid #c5d2df;padding:8px 10px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
th{background:#dce8f1;color:#204f72;font-weight:600}tbody tr:nth-child(even){background:#f5f8fb}
figure{margin:20px 0 26px;text-align:center;break-inside:avoid}figure img{display:block;max-width:100%;height:auto;margin:auto;border:1px solid #adbac9;cursor:zoom-in;image-rendering:auto}
figcaption{font-size:12px;color:#526b82;padding:8px 0 0;line-height:1.5}.image-hint{font-size:11px;color:#7a8ca0}
dialog{max-width:96vw;max-height:96vh;padding:10px;border:1px solid #8fa6be;background:#fff;box-shadow:0 5px 25px #0005}
dialog::backdrop{background:#142538a8}dialog img{display:block;max-width:92vw;max-height:85vh;object-fit:contain}dialog button{float:right;cursor:pointer;border:1px solid #bac7d7;background:#edf3f8;padding:4px 12px}
@media(max-width:850px){.reader{display:block;padding:12px}.sidebar{position:static;max-height:none;margin-bottom:15px}.sidebar nav{columns:2}main{padding:22px 20px}}
@media print{
 @page{size:A4;margin:15mm 14mm 18mm}
 body{background:white;font-size:10.5pt;line-height:1.5;color:#25364b}
 .reader{display:block;max-width:none;padding:0}.sidebar,dialog,.image-hint{display:none!important}
 main{padding:0;border:0;box-shadow:none}h1{font-size:29pt;padding:28mm 0 10mm;margin:0 0 8mm;border-bottom:3px solid #306b94}
 h2{break-before:page;font-size:18pt;margin:0 0 6mm;padding-bottom:3mm}
 h3{font-size:12pt;margin:4mm 0 2.5mm;break-after:avoid}
 p{margin:2mm 0 3mm;orphans:3;widows:3}li{margin:.8mm 0}ol,ul{margin:2mm 0 4mm;break-inside:avoid}
 table{font-size:9pt;margin:2mm 0 4mm}.compact-table{break-inside:avoid}th,td{padding:2mm 2.5mm}thead{display:table-header-group}tr{break-inside:avoid}
 figure{margin:2mm 0 3mm;break-inside:avoid}figure img{max-height:140mm;max-width:100%;width:auto;height:auto}
 figcaption{font-size:8.5pt;padding-top:2mm}a{color:#214f72;text-decoration:none}
}
"""
body=[]
toc=[]
for b in blocks:
    kind=b[0]
    if kind=="heading":
        _,level,label,anchor=b
        if level==2 and anchor and anchor!="contents":toc.append((label,anchor))
        body.append("<h"+str(level)+((' id="'+anchor+'"') if anchor else "")+">"+inline(label)+"</h"+str(level)+">")
    elif kind=="paragraph":body.append("<p>"+inline(b[1])+"</p>")
    elif kind=="list":
        tag="ol" if b[1] else "ul"
        body.append("<"+tag+">"+"".join("<li>"+inline(v)+"</li>" for v in b[2])+"</"+tag+">")
    elif kind=="table":
        rows=b[1]
        body.append(("<table class=\"compact-table\">" if len(rows)<=10 else "<table>")+"<thead><tr>"+"".join("<th>"+inline(v)+"</th>" for v in rows[0])+"</tr></thead><tbody>")
        body.extend("<tr>"+"".join("<td>"+inline(v)+"</td>" for v in r)+"</tr>" for r in rows[1:])
        body.append("</tbody></table>")
    elif kind=="image":
        _,alt,src,w,h=b
        encoded=base64.b64encode((BASE/src).read_bytes()).decode()
        body.append('<figure><img src="data:image/png;base64,'+encoded+'" alt="'+html.escape(alt,quote=True)+'" width="'+str(w)+'" height="'+str(h)+'" loading="eager"><figcaption>'+html.escape(alt)+'<span class="image-hint">　點圖可放大</span></figcaption></figure>')
nav="".join('<a href="#'+anchor+'">'+html.escape(label)+"</a>" for label,anchor in toc)
script="""
const viewer=document.querySelector('#image-viewer');
document.querySelectorAll('figure img').forEach(image=>image.addEventListener('click',()=>{viewer.querySelector('img').src=image.src;viewer.querySelector('img').alt=image.alt;viewer.showModal()}));
viewer.addEventListener('click',event=>{if(event.target===viewer)viewer.close()});
"""
document_html='<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ViewGP 操作手冊</title><style>'+css+'</style></head><body><div class="reader"><aside class="sidebar"><b>ViewGP 操作手冊</b><nav>'+nav+'</nav><button class="print-button" onclick="window.print()">列印／另存 PDF</button></aside><main>'+"".join(body)+'</main></div><dialog id="image-viewer"><button onclick="this.closest(\'dialog\').close()">關閉</button><img alt=""></dialog><script>'+script+'</script></body></html>'
BASE.joinpath("ViewGP-操作手冊.html").write_text(document_html,encoding="utf-8")

doc=Document()
sec=doc.sections[0]
sec.page_width=Mm(210);sec.page_height=Mm(297)
sec.top_margin=Mm(17);sec.bottom_margin=Mm(17);sec.left_margin=Mm(17);sec.right_margin=Mm(17)
sec.header_distance=Mm(7);sec.footer_distance=Mm(8)
for name in ["Normal","Title","Subtitle","Heading 1","Heading 2","List Bullet","List Number","Caption"]:
    s=doc.styles[name];s.font.name="Arial"
    s.element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"),"Microsoft JhengHei")
doc.styles["Normal"].font.size=Pt(10.5)
doc.styles["Normal"].paragraph_format.line_spacing=1.45
doc.styles["Normal"].paragraph_format.space_after=Pt(6)
for name,size in [("Title",27),("Heading 1",19),("Heading 2",13)]:
    s=doc.styles[name];s.font.size=Pt(size);s.font.color.rgb=RGBColor.from_string("245C85")
    s.paragraph_format.keep_with_next=True
doc.styles["Heading 1"].paragraph_format.page_break_before=True
doc.styles["Title"].paragraph_format.space_before=Pt(65)
doc.styles["Title"].paragraph_format.space_after=Pt(20)
doc.styles["Caption"].font.size=Pt(9);doc.styles["Caption"].font.color.rgb=RGBColor.from_string("526B82")
header=sec.header.paragraphs[0]
header.add_run("ViewGP｜圖文操作手冊").font.size=Pt(9)
header.runs[0].font.color.rgb=RGBColor.from_string("526B82")
footer=sec.footer.paragraphs[0];footer.alignment=WD_ALIGN_PARAGRAPH.RIGHT
footer.add_run("ViewGP v0.2.0　｜　2026-10-12　｜　")
def field(paragraph,instruction):
    r=paragraph.add_run();begin=OxmlElement("w:fldChar");begin.set(qn("w:fldCharType"),"begin");r._r.append(begin)
    instr=OxmlElement("w:instrText");instr.set(qn("xml:space"),"preserve");instr.text=instruction;r._r.append(instr)
    end=OxmlElement("w:fldChar");end.set(qn("w:fldCharType"),"end");r._r.append(end)
field(footer," PAGE ");footer.add_run(" / ");field(footer," NUMPAGES ")
for run in footer.runs:run.font.size=Pt(8)
def bookmark(paragraph,name,index):
    start=OxmlElement("w:bookmarkStart");start.set(qn("w:id"),str(index));start.set(qn("w:name"),name.replace("-","_"))
    end=OxmlElement("w:bookmarkEnd");end.set(qn("w:id"),str(index))
    paragraph._p.insert(1 if paragraph._p.pPr is not None else 0,start);paragraph._p.append(end)
def doc_inline(paragraph,value):
    for kind,label,target in parts(value):
        if kind=="link":
            link=OxmlElement("w:hyperlink")
            if target.startswith("#"):link.set(qn("w:anchor"),target[1:].replace("-","_"))
            else:
                from docx.opc.constants import RELATIONSHIP_TYPE
                rid=paragraph.part.relate_to(target_url(target),RELATIONSHIP_TYPE.HYPERLINK,is_external=True)
                link.set(qn("r:id"),rid)
            r=OxmlElement("w:r");pr=OxmlElement("w:rPr");color=OxmlElement("w:color");color.set(qn("w:val"),"216592");pr.append(color)
            fonts=OxmlElement("w:rFonts");fonts.set(qn("w:ascii"),"Arial");fonts.set(qn("w:eastAsia"),"Microsoft JhengHei");pr.append(fonts);r.append(pr)
            t=OxmlElement("w:t");t.text=label;r.append(t);link.append(r);paragraph._p.append(link)
        else:
            run=paragraph.add_run(label)
            if kind=="bold":run.bold=True;run.font.color.rgb=RGBColor.from_string("214F72")
bookmark_id=0
for b in blocks:
    kind=b[0]
    if kind=="heading":
        _,level,label,anchor=b
        paragraph=doc.add_paragraph(style="Title" if level==1 else "Heading "+str(level-1))
        doc_inline(paragraph,label)
        if anchor:bookmark_id+=1;bookmark(paragraph,anchor,bookmark_id)
    elif kind=="paragraph":doc_inline(doc.add_paragraph(),b[1])
    elif kind=="list":
        for item_index,item in enumerate(b[2],1):
            paragraph=doc.add_paragraph(style="Normal" if b[1] else "List Bullet")
            if b[1]:paragraph.paragraph_format.left_indent=Mm(5);paragraph.paragraph_format.first_line_indent=Mm(-5);paragraph.add_run(str(item_index)+". ")
            doc_inline(paragraph,item)
    elif kind=="image":
        _,alt,src,w,h=b
        width=min(176,w*25.4/96,h and 137*w/h)
        paragraph=doc.add_paragraph();paragraph.alignment=WD_ALIGN_PARAGRAPH.CENTER;paragraph.paragraph_format.keep_with_next=True
        picture=paragraph.add_run().add_picture(str(BASE/src),width=Mm(width));picture._inline.docPr.set("descr",alt)
        caption=doc.add_paragraph(alt,style="Caption");caption.alignment=WD_ALIGN_PARAGRAPH.CENTER
    elif kind=="table":
        rows=b[1];table=doc.add_table(rows=1,cols=len(rows[0]));table.style="Table Grid";table.autofit=False
        weights=[.35,.65] if len(rows[0])==2 else [.26,.28,.46]
        if rows[0][0]=="圖中編號":weights=[.12,.22,.66]
        for column,weight in zip(table.columns,weights):column.width=Mm(176*weight)
        for index,row_values in enumerate(rows):
            row=table.rows[0] if index==0 else table.add_row()
            for cell,value,weight in zip(row.cells,row_values,weights):
                cell.width=Mm(176*weight)
                doc_inline(cell.paragraphs[0],value)
                for paragraph in cell.paragraphs:
                    paragraph.paragraph_format.space_after=Pt(3);paragraph.paragraph_format.line_spacing=1.3
                    for run in paragraph.runs:run.font.size=Pt(9)
                if index==0:
                    shading=OxmlElement("w:shd");shading.set(qn("w:fill"),"DCE8F1");cell._tc.get_or_add_tcPr().append(shading)
                    for run in cell.paragraphs[0].runs:run.bold=True;run.font.color.rgb=RGBColor.from_string("204F72")
            trpr=row._tr.get_or_add_trPr();nosplit=OxmlElement("w:cantSplit");trpr.append(nosplit)
            if index==0:
                repeat=OxmlElement("w:tblHeader");trpr.append(repeat)
        doc.add_paragraph().paragraph_format.space_after=Pt(2)
update_fields=OxmlElement("w:updateFields");update_fields.set(qn("w:val"),"true");doc.settings.element.append(update_fields)
doc.core_properties.title="ViewGP 操作手冊"
doc.core_properties.subject="畫面規劃、模擬、Popup、警報、Modbus TCP／RTU 與版本管理"
doc.core_properties.author="InfoSystem"
doc.core_properties.language="zh-TW"
doc.save(BASE/"ViewGP-操作手冊.docx")
print("Rendered HTML and DOCX:",len(toc),"chapters/appendices;",sum(b[0]=="image" for b in blocks),"screenshots")
