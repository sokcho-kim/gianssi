// Notion-flavored Markdown → DocumentIR 파서
//
// MCP의 notion-fetch가 반환하는 마크다운(<content>...</content> 안쪽)을 파싱한다.
// 노션 구조를 1:1 미러링: 표/중첩 리스트/컬럼(가로 N단)/이미지를 그대로 보존.

import type {
  DocumentIR,
  Section,
  Block,
  RichText,
  ListItem,
} from "@/lib/document/types";

export interface NotionMeta {
  author?: string;
  date?: string; // ISO 8601 또는 "2026-06-22"
  kind?: string; // 종류 (보고서 등)
  status?: string; // 상태 (초안 등)
  supertitle?: string; // 제목 위 『 』 상위 문구
}

/** 노션 마크다운 → DocumentIR */
export function parseNotionMarkdown(
  title: string,
  markdown: string,
  meta: NotionMeta = {}
): DocumentIR {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");

  // 1단계: 최상위 헤딩(##)으로 섹션 분리
  const sections: Section[] = [];
  let heading = "";
  let buf: string[] = [];

  const flushSection = () => {
    if (heading !== "" || buf.length > 0) {
      sections.push({ heading, level: 1, blocks: parseContentBlocks(buf) });
    }
  };

  for (const line of lines) {
    const top = line.trim().match(/^##\s+(.*)$/); // 정확히 ## (### 제외)
    if (top && !line.trim().startsWith("###")) {
      flushSection();
      heading = top[1].trim();
      buf = [];
    } else {
      buf.push(line);
    }
  }
  flushSection();

  return {
    title,
    author: meta.author,
    date: meta.date ?? new Date().toISOString(),
    sections,
    metadata: {
      ...(meta.kind ? { kind: meta.kind } : {}),
      ...(meta.status ? { status: meta.status } : {}),
      ...(meta.supertitle ? { supertitle: meta.supertitle } : {}),
    },
  };
}

/** 콘텐츠 라인 배열 → Block[] (헤딩 ###/####, 리스트, 표, 컬럼, 이미지, 문단) */
function parseContentBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let listBuffer: FlatListItem[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    blocks.push(...listItemsToBlocks(nestListItems(listBuffer)));
    listBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      flushList();
      continue;
    }

    // 컬럼 레이아웃 (가로 N단) — 그대로 보존
    if (/^<columns>$/.test(trimmed)) {
      flushList();
      const { block, nextIndex } = parseColumns(lines, i);
      if (block) blocks.push(block);
      i = nextIndex;
      continue;
    }

    // 하위 헤딩 ### / ####
    const h = trimmed.match(/^(#{3,6})\s+(.*)$/);
    if (h) {
      flushList();
      const level = Math.min(h[1].length - 1, 3) as 1 | 2 | 3;
      blocks.push({ type: "heading", level, richText: parseInline(h[2].trim()) });
      continue;
    }

    // 표
    if (/^<table\b/.test(trimmed)) {
      flushList();
      const { block, nextIndex } = parseTable(lines, i);
      if (block) blocks.push(block);
      i = nextIndex;
      continue;
    }

    // 이미지
    const image = trimmed.match(/^!\[(.*?)\]\((.+)\)$/);
    if (image) {
      flushList();
      blocks.push({
        type: "image",
        url: image[2],
        caption: image[1] ? parseInline(image[1]) : undefined,
      });
      continue;
    }

    // 구분선
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushList();
      blocks.push({ type: "divider" });
      continue;
    }

    // 리스트 (들여쓰기로 중첩 판단)
    const list = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (list) {
      listBuffer.push({
        depth: indentDepth(list[1]),
        ordered: /\d+\./.test(list[2]),
        richText: parseInline(list[3]),
      });
      continue;
    }

    // 문단
    flushList();
    blocks.push({ type: "paragraph", richText: parseInline(trimmed) });
  }

  flushList();
  return blocks;
}

// ── 컬럼 파싱 ──────────────────────────────────────────────

function parseColumns(
  lines: string[],
  start: number
): { block: Block | null; nextIndex: number } {
  const columns: Block[][] = [];
  let colLines: string[] | null = null;
  let end = start;
  let depth = 0;

  for (let i = start; i < lines.length; i++) {
    const t = lines[i].trim();
    end = i;
    if (/^<columns>$/.test(t)) {
      depth++;
      continue;
    }
    if (/^<\/columns>$/.test(t)) {
      depth--;
      if (depth <= 0) break;
      continue;
    }
    if (/^<column>$/.test(t)) {
      colLines = [];
      continue;
    }
    if (/^<\/column>$/.test(t)) {
      if (colLines) columns.push(parseContentBlocks(colLines));
      colLines = null;
      continue;
    }
    if (colLines) colLines.push(lines[i]);
  }

  if (columns.length === 0) return { block: null, nextIndex: end };
  return { block: { type: "columns", columns }, nextIndex: end };
}

// ── 인라인 파싱 ────────────────────────────────────────────

const INLINE_TOKEN = /(`[^`]+`)|(\*\*[^*]+?\*\*)|(\[[^\]]+\]\([^)]+\))/;

/** 인라인 마크다운 → RichText[] (bold, code, link) */
export function parseInline(raw: string): RichText[] {
  let text = raw.replace(/<br\s*\/?>/gi, " ");
  const out: RichText[] = [];

  while (text.length > 0) {
    const m = text.match(INLINE_TOKEN);
    if (!m || m.index === undefined) {
      pushPlain(out, text);
      break;
    }
    if (m.index > 0) pushPlain(out, text.slice(0, m.index));

    const tok = m[0];
    if (tok.startsWith("`")) {
      out.push({ text: unescape(tok.slice(1, -1)), code: true });
    } else if (tok.startsWith("**")) {
      out.push({ text: unescape(tok.slice(2, -2)), bold: true });
    } else {
      const lm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (lm) out.push({ text: unescape(lm[1]), link: lm[2] });
      else pushPlain(out, tok);
    }
    text = text.slice(m.index + tok.length);
  }

  return out.length > 0 ? out : [{ text: "" }];
}

function pushPlain(out: RichText[], s: string) {
  if (s) out.push({ text: unescape(s) });
}

/** 노션 마크다운 이스케이프 해제 (\~ \* \\ 등) */
function unescape(s: string): string {
  return s.replace(/\\([\\~*_`>#+\-.!\[\]()])/g, "$1");
}

// ── 표 파싱 ────────────────────────────────────────────────

function parseTable(
  lines: string[],
  start: number
): { block: Block | null; nextIndex: number } {
  let end = start;
  const buf: string[] = [];
  for (let i = start; i < lines.length; i++) {
    buf.push(lines[i]);
    end = i;
    if (/<\/table>/.test(lines[i])) break;
  }

  const tableHtml = buf.join("\n");
  const headerRow = /header-row=["']?true["']?/.test(buf[0] ?? "");

  const rows: RichText[][][] = [];
  const trRe = /<tr>([\s\S]*?)<\/tr>/g;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(tableHtml)) !== null) {
    const cells: RichText[][] = [];
    const tdRe = /<t[dh]>([\s\S]*?)<\/t[dh]>/g;
    let td: RegExpExecArray | null;
    while ((td = tdRe.exec(tr[1])) !== null) {
      cells.push(parseInline(td[1].trim()));
    }
    rows.push(cells);
  }

  if (rows.length === 0) return { block: null, nextIndex: end };

  const headers = headerRow ? rows[0] : [];
  const bodyRows = headerRow ? rows.slice(1) : rows;

  return {
    block: { type: "table", headers, rows: bodyRows },
    nextIndex: end,
  };
}

// ── 리스트 중첩 처리 ──────────────────────────────────────

interface FlatListItem {
  depth: number;
  ordered: boolean;
  richText: RichText[];
}

interface NestedNode extends FlatListItem {
  children: NestedNode[];
}

/** 들여쓰기 문자열 → 깊이 (탭 1개 또는 공백 2칸 = 1단계) */
function indentDepth(ws: string): number {
  const tabs = (ws.match(/\t/g) || []).length;
  const spaces = (ws.replace(/\t/g, "").match(/ /g) || []).length;
  return tabs + Math.floor(spaces / 2);
}

/** flat 리스트 → 깊이 기반 트리 */
function nestListItems(flat: FlatListItem[]): NestedNode[] {
  const roots: NestedNode[] = [];
  const stack: NestedNode[] = [];

  for (const it of flat) {
    const node: NestedNode = { ...it, children: [] };
    while (stack.length && stack[stack.length - 1].depth >= it.depth) {
      stack.pop();
    }
    if (stack.length) stack[stack.length - 1].children.push(node);
    else roots.push(node);
    stack.push(node);
  }

  return roots;
}

/** 트리 → ListBlock[] (같은 종류끼리 묶음) */
function listItemsToBlocks(nodes: NestedNode[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;

  while (i < nodes.length) {
    const ordered = nodes[i].ordered;
    const group: NestedNode[] = [];
    while (i < nodes.length && nodes[i].ordered === ordered) {
      group.push(nodes[i]);
      i++;
    }
    const items: ListItem[] = group.map((n) => ({
      richText: n.richText,
      children:
        n.children.length > 0 ? listItemsToBlocks(n.children) : undefined,
    }));
    blocks.push({
      type: ordered ? "numbered_list" : "bulleted_list",
      items,
    });
  }

  return blocks;
}
