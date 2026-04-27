import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import type {
  DocumentIR,
  Section,
  Block,
  RichText,
  ListItem,
} from "@/lib/document/types";

type NotionRichText = {
  plain_text: string;
  annotations: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    code: boolean;
    color: string;
  };
  href: string | null;
};

/** 노션 블록 배열 → DocumentIR 변환 */
export function parseBlocks(
  title: string,
  blocks: BlockObjectResponse[]
): DocumentIR {
  const sections: Section[] = [];
  let currentSection: Section = {
    heading: "개요",
    level: 1,
    blocks: [],
  };

  for (const block of blocks) {
    const parsed = parseBlock(block);
    if (!parsed) continue;

    // 헤딩을 만나면 새 섹션 시작
    if (parsed.type === "heading") {
      if (currentSection.blocks.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        heading: parsed.richText.map((r) => r.text).join(""),
        level: parsed.level,
        blocks: [],
      };
    } else {
      currentSection.blocks.push(parsed);
    }
  }

  // 마지막 섹션 추가
  if (currentSection.blocks.length > 0) {
    sections.push(currentSection);
  }

  return {
    title,
    date: new Date().toISOString(),
    sections,
  };
}

function parseBlock(block: BlockObjectResponse): Block | null {
  const b = block as BlockObjectResponse & Record<string, unknown>;

  switch (block.type) {
    case "paragraph": {
      const data = b.paragraph as { rich_text: NotionRichText[] };
      return {
        type: "paragraph",
        richText: convertRichText(data.rich_text),
      };
    }

    case "heading_1":
    case "heading_2":
    case "heading_3": {
      const level = parseInt(block.type.slice(-1)) as 1 | 2 | 3;
      const data = b[block.type] as { rich_text: NotionRichText[] };
      return {
        type: "heading",
        level,
        richText: convertRichText(data.rich_text),
      };
    }

    case "bulleted_list_item": {
      const data = b.bulleted_list_item as { rich_text: NotionRichText[] };
      return {
        type: "bulleted_list",
        items: [{ richText: convertRichText(data.rich_text) }],
      };
    }

    case "numbered_list_item": {
      const data = b.numbered_list_item as { rich_text: NotionRichText[] };
      return {
        type: "numbered_list",
        items: [{ richText: convertRichText(data.rich_text) }],
      };
    }

    case "callout": {
      const data = b.callout as {
        rich_text: NotionRichText[];
        icon?: { emoji?: string };
      };
      return {
        type: "callout",
        icon: data.icon?.emoji,
        richText: convertRichText(data.rich_text),
      };
    }

    case "divider":
      return { type: "divider" };

    case "image": {
      const data = b.image as {
        type: string;
        file?: { url: string };
        external?: { url: string };
        caption: NotionRichText[];
      };
      const url =
        data.type === "file" ? data.file?.url : data.external?.url;
      if (!url) return null;
      return {
        type: "image",
        url,
        caption: convertRichText(data.caption),
      };
    }

    case "table": {
      // 테이블은 children에서 row를 가져와야 하지만
      // getAllBlocks에서 재귀로 가져오므로 여기서는 스킵
      return null;
    }

    default:
      return null;
  }
}

/** 연속된 리스트 아이템을 하나의 리스트 블록으로 병합 */
export function mergeListBlocks(blocks: Block[]): Block[] {
  const merged: Block[] = [];

  for (const block of blocks) {
    if (block.type === "bulleted_list" || block.type === "numbered_list") {
      const prev = merged[merged.length - 1];
      if (prev && prev.type === block.type) {
        (prev as { items: ListItem[] }).items.push(...block.items);
        continue;
      }
    }
    merged.push(block);
  }

  return merged;
}

function convertRichText(notionRt: NotionRichText[]): RichText[] {
  if (!notionRt) return [];

  return notionRt.map((rt) => ({
    text: rt.plain_text,
    bold: rt.annotations.bold || undefined,
    italic: rt.annotations.italic || undefined,
    underline: rt.annotations.underline || undefined,
    strikethrough: rt.annotations.strikethrough || undefined,
    code: rt.annotations.code || undefined,
    color: rt.annotations.color !== "default" ? rt.annotations.color : undefined,
    link: rt.href ?? undefined,
  }));
}
