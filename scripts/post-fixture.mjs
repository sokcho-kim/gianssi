import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const md = readFileSync("fixtures/2026-ai-report.md", "utf8");
const body = JSON.stringify({
  title: "2026 AI 스타트업 런치패드 참가 및 비즈니스 매칭 결과 보고서",
  markdown: md,
  meta: {
    date: "2026-06-22",
    kind: "보고서",
    status: "초안",
    author: "인공지능산업융합진흥원 AI기업협력센터",
    supertitle: "2026년 초격차 스타트업 프로젝트",
  },
  template: "report",
  options: { restructure: false },
});

const res = await fetch("http://localhost:3000/api/convert-md", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body,
});

console.log("status", res.status, "pages", res.headers.get("x-page-count"));
if (res.ok) {
  mkdirSync("out", { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync("out/report.pdf", buf);
  console.log("saved out/report.pdf", buf.length, "bytes");
} else {
  console.log("error body:", await res.text());
}
