// 노션 SDK 블록 트리 → DocumentIR
// MCP 마크다운 경로(md-parser)와 동일한 IR을 생성한다. 표/중첩/컬럼/이미지 보존.

import type { BlockNode, PageMeta } from "./client";
import type { DocumentIR, Section, Block, RichText, ListItem } from "@/lib/document/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** SDK rich_text[] → RichText[] */
function rich(arr: any[] | undefined): RichText[] {
  if (!arr || arr.length === 0) return [{ text: "" }];
  return arr.map((t) => {
    const a = t.annotations ?? {};
    return {
      text: t.plain_text ?? "",
      bold: a.bold || undefined,
      italic: a.italic || undefined,
      underline: a.underline || undefined,
      strikethrough: a.strikethrough || undefined,
      code: a.code || undefined,
      color: a.color && a.color !== "default" ? a.color : undefined,
      link: t.href || undefined,
    };
  });
}

function plain(arr: any[] | undefined): string {
  return (arr ?? []).map((t) => t.plain_text ?? "").join("");
}

/** heading_N 레벨 (아니면 0) */
function headingLevel(type: string): number {
  const m = type.match(/^heading_(\d)$/);
  return m ? parseInt(m[1], 10) : 0;
}

function isListItem(type: string): boolean {
  return type === "bulleted_list_item" || type === "numbered_list_item";
}

function imageUrl(img: any): string | null {
  if (!img) return null;
  return img.type === "external" ? img.external?.url : img.file?.url;
}

/** 형제 노드 배열 → Block[] (리스트 그룹화, 표/컬럼/이미지/소제목 변환) */
function nodesToBlocks(nodes: BlockNode[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;

  while (i < nodes.length) {
    const n = nodes[i] as any;
    const type: string = n.type;

    // 연속 리스트 아이템 → 같은 종류끼리 ListBlock
    if (isListItem(type)) {
      const ordered = type === "numbered_list_item";
      const items: ListItem[] = [];
      while (i < nodes.length && (nodes[i] as any).type === type) {
        const li = nodes[i] as any;
        const data = li[type];
        const children = li.children ? nodesToBlocks(li.children) : undefined;
        items.push({
          richText: rich(data.rich_text),
          children: children && children.length ? children : undefined,
        });
        i++;
      }
      blocks.push({ type: ordered ? "numbered_list" : "bulleted_list", items });
      continue;
    }

    i++;

    const hl = headingLevel(type);
    if (hl >= 1) {
      // 섹션(heading_1/2)은 상위에서 분리됨. 여기 오는 건 소제목(heading_3/4)
      blocks.push({
        type: "heading",
        level: Math.min(Math.max(hl - 1, 1), 3) as 1 | 2 | 3,
        richText: rich(n[type].rich_text),
      });
      continue;
    }

    switch (type) {
      case "paragraph": {
        const rt = rich(n.paragraph.rich_text);
        if (rt.length === 1 && rt[0].text === "") break; // 빈 문단 스킵
        blocks.push({ type: "paragraph", richText: rt });
        break;
      }
      case "table": {
        const rows = (n.children ?? []).filter((c: any) => c.type === "table_row");
        const cellRows: RichText[][][] = rows.map((r: any) =>
          (r.table_row.cells ?? []).map((cell: any[]) => rich(cell))
        );
        const hasHeader = !!n.table?.has_column_header;
        blocks.push({
          type: "table",
          headers: hasHeader ? cellRows[0] ?? [] : [],
          rows: hasHeader ? cellRows.slice(1) : cellRows,
        });
        break;
      }
      case "column_list": {
        const columns = (n.children ?? [])
          .filter((c: any) => c.type === "column")
          .map((col: any) => nodesToBlocks(col.children ?? []));
        if (columns.length) blocks.push({ type: "columns", columns });
        break;
      }
      case "image": {
        const url = imageUrl(n.image);
        if (url) {
          const caption = rich(n.image.caption);
          blocks.push({
            type: "image",
            url,
            caption: caption.length === 1 && caption[0].text === "" ? undefined : caption,
          });
        }
        break;
      }
      case "divider":
        blocks.push({ type: "divider" });
        break;
      case "callout":
        blocks.push({
          type: "callout",
          icon: n.callout?.icon?.emoji,
          richText: rich(n.callout.rich_text),
        });
        break;
      default:
        break; // 미지원 블록은 스킵
    }
  }

  return blocks;
}

/** 블록 트리 → DocumentIR (heading_1/2에서 섹션 분리) */
export function blocksToDocument(
  title: string,
  nodes: BlockNode[],
  meta: PageMeta & { supertitle?: string } = {}
): DocumentIR {
  const sections: Section[] = [];
  let heading = "";
  let buf: BlockNode[] = [];

  const flush = () => {
    if (heading !== "" || buf.length > 0) {
      sections.push({ heading, level: 1, blocks: nodesToBlocks(buf) });
    }
  };

  for (const n of nodes) {
    const hl = headingLevel((n as any).type);
    if (hl >= 1 && hl <= 2) {
      flush();
      heading = plain((n as any)[(n as any).type].rich_text);
      buf = [];
    } else {
      buf.push(n);
    }
  }
  flush();

  return {
    title,
    author: meta.author,
    date: meta.date ?? new Date().toISOString(),
    sections,
    metadata: {
      ...(meta.kind ? { kind: meta.kind } : {}),
      ...(meta.supertitle ? { supertitle: meta.supertitle } : {}),
    },
  };
}
