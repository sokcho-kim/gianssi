import { Client } from "@notionhq/client";
import type {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

/** 계층을 보존하는 블록 노드 */
export type BlockNode = BlockObjectResponse & { children?: BlockNode[] };

/** 페이지 메타 (속성에서 추출) */
export interface PageMeta {
  author?: string;
  date?: string;
  kind?: string;
}

/**
 * 노션 페이지 ID 추출.
 * - app.notion.com/p/ws/Title-<id>?v=...
 * - www.notion.so/Title-<id>
 * - *.notion.site/...
 * - 순수 UUID/32hex
 * 쿼리(?v=뷰id)를 제거하고 경로의 '마지막' 32hex를 페이지 id로 본다.
 */
export function extractPageId(input: string): string {
  const path = input.split("?")[0];
  const ids = path.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32}/gi
  );
  if (ids && ids.length > 0) return ids[ids.length - 1].replace(/-/g, "");
  throw new Error(`유효하지 않은 노션 URL입니다: ${input}`);
}

/** 페이지 메타데이터 가져오기 */
export async function getPage(pageId: string): Promise<PageObjectResponse> {
  const page = await notion.pages.retrieve({ page_id: pageId });
  return page as PageObjectResponse;
}

/** 페이지의 블록을 계층 보존하며 재귀로 가져온다 */
export async function getBlockTree(blockId: string): Promise<BlockNode[]> {
  const nodes: BlockNode[] = [];
  let cursor: string | undefined;

  do {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const block of res.results) {
      const b = block as BlockNode;
      if (b.has_children) {
        b.children = await getBlockTree(b.id);
      }
      nodes.push(b);
    }
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  return nodes;
}

/** 페이지 제목 추출 */
export function getPageTitle(page: PageObjectResponse): string {
  const titleProp = Object.values(page.properties).find((p) => p.type === "title");
  if (titleProp && titleProp.type === "title") {
    return titleProp.title.map((t) => t.plain_text).join("");
  }
  return "제목 없음";
}

/** 페이지 속성에서 작성자/등록일/종류 추출 (속성명은 한글 기준, 없으면 무시) */
export function getPageMeta(page: PageObjectResponse): PageMeta {
  const props = page.properties as Record<string, { type: string } & Record<string, unknown>>;
  const meta: PageMeta = {};

  for (const value of Object.values(props)) {
    if (value.type === "people" && !meta.author) {
      const people = (value.people as Array<{ name?: string }>) ?? [];
      const names = people.map((p) => p.name).filter(Boolean);
      if (names.length) meta.author = names.join(", ");
    }
    if (value.type === "date" && !meta.date) {
      const d = value.date as { start?: string } | null;
      if (d?.start) meta.date = d.start;
    }
    if (value.type === "select" && !meta.kind) {
      const s = value.select as { name?: string } | null;
      if (s?.name) meta.kind = s.name;
    }
  }
  return meta;
}
