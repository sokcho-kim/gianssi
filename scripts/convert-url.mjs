import { writeFileSync, mkdirSync } from "node:fs";

const notionUrl =
  process.argv[2] ||
  "https://app.notion.com/p/cginside/2026-AI-3871847f058f803eb125f7e1c8de38d1?v=27d1847f058f808c813d000c4258da25";

const body = JSON.stringify({
  notionUrl,
  template: "report",
  options: { restructure: false },
  supertitle: "2026년 초격차 스타트업 프로젝트",
});

const t0 = Date.now();
const res = await fetch("http://localhost:3000/api/convert", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body,
});
console.log("status", res.status, "pages", res.headers.get("x-page-count"), `${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (res.ok) {
  mkdirSync("out", { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync("out/url.pdf", buf);
  console.log("saved out/url.pdf", (buf.length / 1024 / 1024).toFixed(1), "MB");
} else {
  console.log("error:", await res.text());
}
