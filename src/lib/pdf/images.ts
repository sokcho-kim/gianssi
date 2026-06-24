import sharp from "sharp";
import type { DocumentIR, Block } from "@/lib/document/types";

const MAX_WIDTH = 1100; // 임베드 전 다운스케일 폭

/** 큰 이미지는 1100px로 줄이고 jpeg로 재인코딩해 PDF 비대화 방지 */
async function shrink(buf: Buffer, contentType: string): Promise<{ buf: Buffer; type: string }> {
  try {
    const img = sharp(buf, { failOn: "none" });
    const meta = await img.metadata();
    if ((meta.width ?? 0) > MAX_WIDTH) img.resize({ width: MAX_WIDTH, withoutEnlargement: true });
    const out = await img.jpeg({ quality: 82 }).toBuffer();
    return { buf: out, type: "image/jpeg" };
  } catch {
    return { buf, type: contentType }; // 실패 시 원본 유지
  }
}

/**
 * 이미지 URL을 다운로드해 data URI(base64)로 인라인한다.
 * - 노션 S3 서명 URL은 1시간 후 만료되므로, 변환 시점에 즉시 내려받아 박아넣는다.
 * - puppeteer가 외부 네트워크에 의존하지 않게 되어 렌더 누락도 방지된다.
 */
async function fetchAsDataUri(url: string): Promise<string | null> {
  // 이미 data URI면 그대로
  if (url.startsWith("data:")) return url;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) return null;
    const raw = Buffer.from(await res.arrayBuffer());
    const { buf, type } = await shrink(raw, contentType);
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function collectImageBlocks(blocks: Block[], acc: Block[]): void {
  for (const b of blocks) {
    if (b.type === "image") acc.push(b);
    if (b.type === "bulleted_list" || b.type === "numbered_list") {
      for (const item of b.items) {
        if (item.children) collectImageBlocks(item.children, acc);
      }
    }
    if (b.type === "columns") {
      for (const col of b.columns) collectImageBlocks(col, acc);
    }
  }
}

/** DocumentIR 내 모든 이미지 블록의 url을 data URI로 치환(in place) */
export async function inlineImages(doc: DocumentIR): Promise<DocumentIR> {
  const images: Block[] = [];
  for (const section of doc.sections) collectImageBlocks(section.blocks, images);

  await Promise.all(
    images.map(async (b) => {
      if (b.type !== "image") return;
      const dataUri = await fetchAsDataUri(b.url);
      if (dataUri) b.url = dataUri;
    })
  );

  return doc;
}
