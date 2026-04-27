import { Client } from "@notionhq/client";
import type {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

/** 노션 페이지 ID 추출 (URL 또는 ID 지원) */
export function extractPageId(input: string): string {
  // URL: https://www.notion.so/Title-abc123...?v=...
  const urlMatch = input.match(
    /notion\.so\/(?:.*-)?([a-f0-9]{32}|[a-f0-9-]{36})/
  );
  if (urlMatch) return urlMatch[1].replace(/-/g, "");

  // 순수 ID
  const idMatch = input.match(/^[a-f0-9]{32}$|^[a-f0-9-]{36}$/);
  if (idMatch) return idMatch[0].replace(/-/g, "");

  throw new Error(`유효하지 않은 노션 URL입니다: ${input}`);
}

/** 페이지 메타데이터 가져오기 */
export async function getPage(pageId: string): Promise<PageObjectResponse> {
  const page = await notion.pages.retrieve({ page_id: pageId });
  return page as PageObjectResponse;
}

/** 페이지의 모든 블록 가져오기 (재귀) */
export async function getAllBlocks(
  blockId: string
): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results) {
      const b = block as BlockObjectResponse;
      blocks.push(b);

      if (b.has_children) {
        const children = await getAllBlocks(b.id);
        blocks.push(...children);
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return blocks;
}

/** 페이지 제목 추출 */
export function getPageTitle(page: PageObjectResponse): string {
  const titleProp = Object.values(page.properties).find(
    (p) => p.type === "title"
  );
  if (titleProp && titleProp.type === "title") {
    return titleProp.title.map((t) => t.plain_text).join("");
  }
  return "제목 없음";
}
