import { readFileSync, existsSync } from "node:fs";
import { Client } from "@notionhq/client";

// .env.local 수동 로드 (토큰 값은 출력 안 함)
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const key = process.env.NOTION_API_KEY;
console.log("NOTION_API_KEY 존재:", !!key, key ? `(${key.slice(0, 4)}… ${key.length}자)` : "");
if (!key) process.exit(1);

const notion = new Client({ auth: key });
const PAGE = "3871847f058f803eb125f7e1c8de38d1";

try {
  const page = await notion.pages.retrieve({ page_id: PAGE });
  const titleProp = Object.values(page.properties).find((p) => p.type === "title");
  console.log("페이지 제목:", titleProp?.title?.map((t) => t.plain_text).join("") ?? "(없음)");
  console.log("속성들:", Object.keys(page.properties).join(", "));

  const top = await notion.blocks.children.list({ block_id: PAGE, page_size: 100 });
  const types = {};
  for (const b of top.results) types[b.type] = (types[b.type] || 0) + 1;
  console.log("최상위 블록 타입:", JSON.stringify(types));

  // 표/컬럼의 자식 구조 한 개씩 확인
  const table = top.results.find((b) => b.type === "table");
  if (table) {
    const rows = await notion.blocks.children.list({ block_id: table.id, page_size: 3 });
    console.log("table 자식 타입:", rows.results.map((r) => r.type).join(","), "| table_width:", table.table?.table_width);
  }
  const colList = top.results.find((b) => b.type === "column_list");
  if (colList) {
    const cols = await notion.blocks.children.list({ block_id: colList.id });
    console.log("column_list 자식:", cols.results.map((c) => c.type).join(","));
    const firstCol = cols.results[0];
    if (firstCol) {
      const inner = await notion.blocks.children.list({ block_id: firstCol.id });
      console.log("column 내부:", inner.results.map((c) => c.type).join(","));
    }
  }
  console.log("OK — 토큰 정상, 페이지 접근 가능");
} catch (e) {
  console.log("ERROR:", e.code || e.name, "-", e.message);
}
