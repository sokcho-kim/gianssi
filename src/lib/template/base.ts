import type { DocumentIR, Block, RichText, Section } from "@/lib/document/types";

/** 공문서 베이스 CSS */
export const BASE_CSS = `
@page {
  size: A4;
  margin: 25mm 20mm 25mm 20mm;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
  font-size: 11pt;
  line-height: 1.8;
  color: #1a1a1a;
}

.document {
  max-width: 210mm;
  margin: 0 auto;
  padding: 20mm;
}

/* 문서 헤더 — 공문서 스타일 */
.doc-header {
  text-align: center;
  border-bottom: 3px double #1a1a1a;
  padding-bottom: 16px;
  margin-bottom: 24px;
}

.doc-title {
  font-size: 20pt;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 8px;
}

.doc-meta {
  font-size: 9pt;
  color: #555;
  display: flex;
  justify-content: center;
  gap: 24px;
}

.doc-meta span {
  display: inline-block;
}

/* 섹션 */
.section {
  margin-bottom: 20px;
}

.section-heading {
  font-size: 13pt;
  font-weight: 700;
  border-left: 4px solid #1a1a1a;
  padding-left: 10px;
  margin-bottom: 12px;
  margin-top: 24px;
}

.section-tag {
  font-size: 8pt;
  color: #fff;
  background: #1a1a1a;
  padding: 2px 8px;
  border-radius: 2px;
  margin-left: 8px;
  vertical-align: middle;
  letter-spacing: 1px;
}

/* 블록 스타일 */
p {
  margin-bottom: 8px;
  text-align: justify;
}

ul, ol {
  margin: 8px 0 8px 20px;
}

li {
  margin-bottom: 4px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 10pt;
}

th, td {
  border: 1px solid #333;
  padding: 6px 10px;
  text-align: left;
}

th {
  background: #f0f0f0;
  font-weight: 700;
}

.callout {
  background: #f5f5f5;
  border-left: 4px solid #666;
  padding: 10px 14px;
  margin: 12px 0;
  font-size: 10pt;
}

.callout-icon {
  margin-right: 6px;
}

.divider {
  border: none;
  border-top: 1px solid #ccc;
  margin: 16px 0;
}

img {
  max-width: 100%;
  margin: 12px 0;
}

.caption {
  font-size: 9pt;
  color: #666;
  text-align: center;
  margin-top: 4px;
}

/* 텍스트 스타일 */
strong { font-weight: 700; }
em { font-style: italic; }
u { text-decoration: underline; }
s { text-decoration: line-through; }
code {
  font-family: 'D2Coding', monospace;
  background: #f0f0f0;
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 10pt;
}

a {
  color: #1a1a1a;
  text-decoration: underline;
}

/* 푸터 — 페이지 넘버 */
.doc-footer {
  text-align: center;
  font-size: 9pt;
  color: #999;
  margin-top: 40px;
  padding-top: 12px;
  border-top: 1px solid #ccc;
}
`;

const TAG_LABELS: Record<string, string> = {
  conclusion: "핵심",
  evidence: "근거",
  detail: "세부",
  reference: "참고",
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

/** Block → HTML */
export function renderBlock(block: Block): string {
  switch (block.type) {
    case "paragraph":
      return `<p>${renderRichText(block.richText)}</p>`;

    case "heading":
      return `<h${block.level + 1}>${renderRichText(block.richText)}</h${block.level + 1}>`;

    case "bulleted_list":
      return `<ul>${block.items.map((item) => `<li>${renderRichText(item.richText)}</li>`).join("")}</ul>`;

    case "numbered_list":
      return `<ol>${block.items.map((item) => `<li>${renderRichText(item.richText)}</li>`).join("")}</ol>`;

    case "table":
      return `<table>
        ${block.headers.length > 0 ? `<thead><tr>${block.headers.map((h) => `<th>${renderRichText(h)}</th>`).join("")}</tr></thead>` : ""}
        <tbody>${block.rows.map((row) => `<tr>${row.map((cell) => `<td>${renderRichText(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>`;

    case "image":
      return `<div><img src="${escapeHtml(block.url)}" alt="" />${block.caption ? `<p class="caption">${renderRichText(block.caption)}</p>` : ""}</div>`;

    case "divider":
      return `<hr class="divider" />`;

    case "callout":
      return `<div class="callout">${block.icon ? `<span class="callout-icon">${block.icon}</span>` : ""}${renderRichText(block.richText)}</div>`;

    default:
      return "";
  }
}

/** Section → HTML */
export function renderSection(section: Section, index: number): string {
  const tagLabel = section.tag ? TAG_LABELS[section.tag] : undefined;
  const tagHtml = tagLabel
    ? `<span class="section-tag">${tagLabel}</span>`
    : "";

  return `
    <div class="section">
      <h2 class="section-heading">
        ${index + 1}. ${escapeHtml(section.heading)}${tagHtml}
      </h2>
      ${section.blocks.map(renderBlock).join("\n")}
    </div>
  `;
}

/** 전체 문서 → HTML (공문서 스타일) */
export function renderDocument(doc: DocumentIR, templateName?: string): string {
  const date = new Date(doc.date);
  const dateStr = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap" rel="stylesheet" />
  <style>${BASE_CSS}</style>
</head>
<body>
  <div class="document">
    <div class="doc-header">
      <div class="doc-title">${escapeHtml(doc.title)}</div>
      <div class="doc-meta">
        <span>작성일: ${dateStr}</span>
        ${doc.author ? `<span>작성자: ${escapeHtml(doc.author)}</span>` : ""}
        ${templateName ? `<span>양식: ${escapeHtml(templateName)}</span>` : ""}
      </div>
    </div>

    ${doc.sections.map((s, i) => renderSection(s, i)).join("\n")}

    <div class="doc-footer">
      기안씨가 생성한 문서입니다
    </div>
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
