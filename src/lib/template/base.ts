import type { DocumentIR, Block, RichText, Section, ListItem } from "@/lib/document/types";

/** 공문서(정부/기관 계획서) 베이스 CSS */
export const BASE_CSS = `
@page {
  size: A4;
  margin: 20mm 18mm 18mm 18mm;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Malgun Gothic', '맑은 고딕', 'Noto Sans KR', sans-serif;
  font-size: 11.5pt;
  line-height: 1.65;
  color: #111;
}

.document { width: 100%; }

/* ── 제목부 ── */
.doc-header { text-align: center; margin-bottom: 22px; }
.doc-supertitle { font-size: 11pt; color: #333; margin-bottom: 6px; }
.doc-title {
  font-size: 19pt;
  font-weight: 800;
  letter-spacing: 1px;
  padding-bottom: 8px;
  border-bottom: 3px solid #1f3864;
  display: inline-block;
}
.doc-byline { text-align: right; font-size: 10pt; color: #333; margin-top: 6px; }
.doc-meta {
  font-size: 9.5pt; color: #555;
  display: flex; justify-content: center; gap: 18px; margin-top: 8px;
}

/* ── 목차 ── */
.toc { page-break-after: always; margin-top: 10px; }
.toc-title {
  text-align: center; font-size: 16pt; font-weight: 800; letter-spacing: 12px;
  color: #14213d; margin: 8px 0 18px; padding-bottom: 6px;
}
.toc-entry { display: flex; align-items: baseline; margin: 7px 0; font-size: 11.5pt; }
.toc-entry .t { font-weight: 700; color: #14213d; white-space: nowrap; }
.toc-entry .dots { flex: 1; border-bottom: 1px dotted #999; margin: 0 6px; position: relative; top: -4px; }
.toc-entry .pg { font-weight: 700; color: #14213d; white-space: nowrap; }
.toc-entry.sub { padding-left: 20px; font-size: 10.5pt; }
.toc-entry.sub .t { font-weight: 400; color: #333; }
.toc-entry.sub .pg { font-weight: 400; color: #333; }

/* ── 섹션 헤더 (Ⅰ Ⅱ Ⅲ 컬러 박스 바) ── */
.section { margin-bottom: 16px; }
.section.page-break { page-break-before: always; }
.section-heading {
  display: flex; align-items: stretch; margin: 22px 0 12px;
  page-break-after: avoid; break-after: avoid;
}
.sec-num {
  background: #1f3864; color: #fff; font-weight: 800; font-size: 13pt;
  padding: 5px 13px; display: flex; align-items: center; justify-content: center;
}
.sec-title {
  background: #dbe3f0; color: #14213d; font-weight: 800; font-size: 13pt;
  padding: 5px 14px; display: flex; align-items: center; flex: 1;
  border-bottom: 2px solid #1f3864;
}

/* ── 하위 제목 ── */
.sub-heading {
  font-weight: 800; font-size: 12pt; color: #14213d; margin: 16px 0 8px;
  display: flex; align-items: center; gap: 6px;
  page-break-after: avoid; break-after: avoid;
}
.sub-heading .num-box {
  background: #1f3864; color: #fff; font-size: 10pt; padding: 1px 7px;
  min-width: 20px; text-align: center;
}
.sub-heading-3 { font-size: 11pt; color: #1f3864; }
.sub-heading-3::before { content: "◆ "; }

/* ── 본문 ── */
.content { padding-left: 2px; }
.content p { margin: 5px 0; text-align: justify; }

/* 한국 공문서 불릿: □ → ○ → - → · */
.content ul { list-style: none; margin: 4px 0; }
.content ol { margin: 5px 0 5px 24px; }
.content li { margin: 3px 0; }
.content ul > li { position: relative; padding-left: 17px; }
.content ul > li::before { content: "□"; position: absolute; left: 0; top: 0; color: #1f3864; font-size: 10pt; }
.content ul ul > li { padding-left: 16px; }
.content ul ul > li::before { content: "○"; font-size: 8.5pt; top: 1px; }
.content ul ul ul > li { padding-left: 14px; }
.content ul ul ul > li::before { content: "–"; color: #444; }
.content ul ul ul ul > li::before { content: "·"; color: #444; }

/* ── 표 ── */
table {
  width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9pt;
  page-break-inside: auto; table-layout: fixed;
}
th, td {
  border: 1px solid #7a7a7a; padding: 3px 5px; text-align: left; vertical-align: top;
  word-break: keep-all; overflow-wrap: anywhere; line-height: 1.4;
}
th { background: #dbe3f0; font-weight: 700; text-align: center; color: #14213d; }
tr { page-break-inside: avoid; }
table.wide { font-size: 8pt; }
table.wide th, table.wide td { padding: 2px 3px; }

/* ── 콜아웃 / 구분선 / 이미지 ── */
.callout { background: #f3f6fb; border-left: 4px solid #1f3864; padding: 9px 13px; margin: 10px 0; font-size: 10.5pt; }
.callout-icon { margin-right: 6px; }
.divider { border: none; border-top: 1px solid #bbb; margin: 14px 0; }
.content img { display: block; max-width: 88%; margin: 12px auto; border: 1px solid #ccc; page-break-inside: avoid; }
.caption { font-size: 9pt; color: #555; text-align: center; margin-top: 3px; }

/* 노션 컬럼 레이아웃 (가로 N단) — 페이지 경계에서 안 잘리게 */
.columns { display: flex; gap: 12px; margin: 12px 0; align-items: flex-start; page-break-inside: avoid; }
.column { flex: 1 1 0; min-width: 0; }
.column img { width: 100%; max-width: 100%; margin: 0; }
.column .content, .column p { margin: 0; }

/* ── 인라인 ── */
strong { font-weight: 700; }
em { font-style: italic; }
u { text-decoration: underline; }
s { text-decoration: line-through; }
code { font-family: 'D2Coding', 'Consolas', monospace; background: #eef0f4; padding: 1px 4px; border-radius: 2px; font-size: 9.5pt; }
a { color: #14213d; text-decoration: underline; }
`;

const TAG_LABELS: Record<string, string> = {
  conclusion: "핵심", evidence: "근거", detail: "세부", reference: "참고",
};

/** RichText 배열 → HTML 문자열 */
export function renderRichText(richTexts: RichText[]): string {
  return richTexts
    .map((rt) => {
      let html = escapeHtml(rt.text);
      if (rt.bold) html = `<strong>${html}</strong>`;
      if (rt.italic) html = `<em>${html}</em>`;
      if (rt.underline) html = `<u>${html}</u>`;
      if (rt.strikethrough) html = `<s>${html}</s>`;
      if (rt.code) html = `<code>${html}</code>`;
      if (rt.link) html = `<a href="${escapeHtml(rt.link)}">${html}</a>`;
      return html;
    })
    .join("");
}

/** 선행 번호 마커 분리: "Ⅰ. 제목" / "2-1. 제목" → {marker, rest} */
function splitLeadingMarker(text: string): { marker: string; rest: string } {
  const m = text.match(/^([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+|\d+(?:-\d+)?)[.)]?\s+(.*)$/);
  if (m) return { marker: m[1], rest: m[2] };
  return { marker: "", rest: text };
}

/** 헤딩 블록의 평문 추출 */
function headingText(block: Block): string {
  if (block.type !== "heading") return "";
  return block.richText.map((r) => r.text).join("");
}

/** ListItem → HTML */
function renderListItem(item: ListItem): string {
  const children = item.children?.length ? item.children.map(renderBlock).join("") : "";
  return `<li>${renderRichText(item.richText)}${children}</li>`;
}

/** 헤딩 블록(###/####) → HTML. tocId가 있으면 목차 앵커로 표시 */
function renderHeadingBlock(
  block: Extract<Block, { type: "heading" }>,
  tocId?: string
): string {
  const attrs = tocId ? ` id="${tocId}" data-toc` : "";
  if (block.level >= 3) {
    return `<div class="sub-heading sub-heading-3"${attrs}>${renderRichText(block.richText)}</div>`;
  }
  const { marker, rest } = splitLeadingMarker(headingText(block));
  const numBox = marker ? `<span class="num-box">${escapeHtml(marker)}</span>` : "";
  return `<div class="sub-heading"${attrs}>${numBox}<span>${escapeHtml(rest)}</span></div>`;
}

/** Block → HTML */
export function renderBlock(block: Block): string {
  switch (block.type) {
    case "paragraph":
      return `<p>${renderRichText(block.richText)}</p>`;

    case "heading":
      return renderHeadingBlock(block);

    case "bulleted_list":
      return `<ul>${block.items.map(renderListItem).join("")}</ul>`;

    case "numbered_list":
      return `<ol>${block.items.map(renderListItem).join("")}</ol>`;

    case "table": {
      const colCount = Math.max(block.headers.length, ...block.rows.map((r) => r.length), 0);
      const wide = colCount >= 7 ? " class=\"wide\"" : "";
      return `<table${wide}>
        ${block.headers.length > 0 ? `<thead><tr>${block.headers.map((h) => `<th>${renderRichText(h)}</th>`).join("")}</tr></thead>` : ""}
        <tbody>${block.rows.map((row) => `<tr>${row.map((cell) => `<td>${renderRichText(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>`;
    }

    case "image":
      return `<div><img src="${escapeHtml(block.url)}" alt="" />${block.caption?.length ? `<p class="caption">${renderRichText(block.caption)}</p>` : ""}</div>`;

    case "columns":
      return `<div class="columns">${block.columns
        .map((col) => `<div class="column">${col.map(renderBlock).join("")}</div>`)
        .join("")}</div>`;

    case "divider":
      return `<hr class="divider" />`;

    case "callout":
      return `<div class="callout">${block.icon ? `<span class="callout-icon">${block.icon}</span>` : ""}${renderRichText(block.richText)}</div>`;

    default:
      return "";
  }
}

/** Section → HTML (목차 앵커 id 부여). pageBreak=true면 새 페이지에서 시작 */
export function renderSection(section: Section, idx: number, pageBreak = false): string {
  const tagLabel = section.tag ? TAG_LABELS[section.tag] : undefined;
  const tagHtml = tagLabel ? ` <span class="section-tag">${tagLabel}</span>` : "";

  let headingHtml = "";
  if (section.heading.trim() !== "") {
    const { marker, rest } = splitLeadingMarker(section.heading);
    const id = ` id="sec${idx}" data-toc`;
    if (marker) {
      headingHtml = `<div class="section-heading"${id}><span class="sec-num">${escapeHtml(marker)}</span><span class="sec-title">${escapeHtml(rest)}${tagHtml}</span></div>`;
    } else {
      headingHtml = `<div class="section-heading"${id}><span class="sec-title">${escapeHtml(section.heading)}${tagHtml}</span></div>`;
    }
  }

  // 소제목(### = level 2)에 목차 앵커 부여
  let sub = 0;
  const blocksHtml = section.blocks
    .map((b) => {
      if (b.type === "heading" && b.level === 2) {
        return renderHeadingBlock(b, `sec${idx}_${sub++}`);
      }
      return renderBlock(b);
    })
    .join("\n");

  return `
    <div class="section${pageBreak ? " page-break" : ""}">
      ${headingHtml}
      <div class="content">${blocksHtml}</div>
    </div>
  `;
}

export interface TocEntry { id: string; label: string; level: 1 | 2; }

/** 문서에서 목차 항목 추출 (섹션 + ### 소제목) */
export function buildTocEntries(doc: DocumentIR): TocEntry[] {
  const entries: TocEntry[] = [];
  doc.sections.forEach((s, i) => {
    if (s.heading.trim() === "") return;
    entries.push({ id: `sec${i}`, label: s.heading.trim(), level: 1 });
    let sub = 0;
    for (const b of s.blocks) {
      if (b.type === "heading" && b.level === 2) {
        entries.push({ id: `sec${i}_${sub}`, label: headingText(b).trim(), level: 2 });
        sub++;
      }
    }
  });
  return entries;
}

function renderToc(doc: DocumentIR, pageNumbers?: Record<string, number>): string {
  const entries = buildTocEntries(doc);
  if (entries.length === 0) return "";
  const rows = entries
    .map((e) => {
      const pg = pageNumbers?.[e.id];
      const pgHtml = pg ? String(pg) : "";
      return `<div class="toc-entry${e.level === 2 ? " sub" : ""}"><span class="t">${escapeHtml(e.label)}</span><span class="dots"></span><span class="pg">${pgHtml}</span></div>`;
    })
    .join("");
  return `<div class="toc"><div class="toc-title">목 차</div>${rows}</div>`;
}

/** 전체 문서 → HTML (공문서 스타일) */
export function renderDocument(
  doc: DocumentIR,
  templateName?: string,
  pageNumbers?: Record<string, number>
): string {
  void templateName;
  const date = new Date(doc.date);
  const dateStr = isNaN(date.getTime())
    ? doc.date
    : `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;

  const supertitle = doc.metadata?.supertitle;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <style>${BASE_CSS}</style>
</head>
<body>
  <div class="document">
    <div class="doc-header">
      ${supertitle ? `<div class="doc-supertitle">『${escapeHtml(supertitle)}』</div>` : ""}
      <div class="doc-title">${escapeHtml(doc.title)}</div>
      ${doc.author ? `<div class="doc-byline">(${escapeHtml(doc.author)})</div>` : ""}
      <div class="doc-meta">
        <span>작성일: ${dateStr}</span>
      </div>
    </div>

    ${renderToc(doc, pageNumbers)}

    ${(() => {
      let seenHeaded = false;
      return doc.sections
        .map((s, i) => {
          const headed = s.heading.trim() !== "";
          // 첫 단원은 표지 페이지에 이어 붙이고, 그 다음 로마숫자 단원부터 새 페이지
          const pageBreak = headed && seenHeaded;
          if (headed) seenHeaded = true;
          return renderSection(s, i, pageBreak);
        })
        .join("\n");
    })()}
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
