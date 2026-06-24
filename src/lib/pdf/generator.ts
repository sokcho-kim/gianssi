import puppeteer from "puppeteer";
import { extractText, getDocumentProxy } from "unpdf";
import type { DocumentIR } from "@/lib/document/types";
import { renderDocument, buildTocEntries } from "@/lib/template/base";

export interface PdfResult {
  buffer: Buffer;
  pageCount: number;
}

const PDF_OPTS = {
  format: "A4" as const,
  margin: { top: "18mm", right: "18mm", bottom: "16mm", left: "18mm" },
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate:
    '<div style="width:100%;text-align:center;font-size:9pt;color:#555;font-family:\'Malgun Gothic\',sans-serif;">- <span class="pageNumber"></span> -</div>',
};

function countPages(pdf: Buffer): number {
  const s = pdf.toString("latin1");
  return Math.max((s.match(/\/Type\s*\/Page[^s]/g) || []).length, 1);
}

/** 헤딩 라벨 → 매칭용 코어 텍스트 (태그/강조/선행마커 제거 + 공백 제거) */
function core(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*|`/g, "")
    .replace(/\s+/g, "")
    .replace(/^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ\d.\-)]+/, "");
}

/** 렌더된 PDF 텍스트에서 각 목차 항목의 실제 페이지를 찾는다 (목차 페이지 제외) */
async function measurePageNumbers(
  doc: DocumentIR,
  pdf: Buffer
): Promise<Record<string, number>> {
  const proxy = await getDocumentProxy(new Uint8Array(pdf));
  const { text } = await extractText(proxy, { mergePages: false });
  const pages = (text as string[]).map((t) => t.replace(/\s+/g, ""));
  const result: Record<string, number> = {};
  for (const entry of buildTocEntries(doc)) {
    const needle = core(entry.label);
    if (!needle) continue;
    for (let i = 1; i < pages.length; i++) {
      // i=0 은 목차 페이지 → 제외
      if (pages[i].includes(needle)) {
        result[entry.id] = i + 1;
        break;
      }
    }
  }
  return result;
}

/** DocumentIR → PDF 변환 (puppeteer). 목차 페이지번호는 1차 렌더 PDF를 파싱해 실측 후 2차 렌더에 주입 */
export async function generatePdf(
  doc: DocumentIR,
  templateName?: string,
  providedPageNumbers?: Record<string, number>
): Promise<PdfResult> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    const hasToc = buildTocEntries(doc).length > 0;

    // 외부에서 페이지번호 주어지면 1회 렌더
    if (providedPageNumbers && Object.keys(providedPageNumbers).length > 0) {
      await page.setContent(renderDocument(doc, templateName, providedPageNumbers), {
        waitUntil: "load",
        timeout: 30000,
      });
      const pdf = Buffer.from(await page.pdf(PDF_OPTS));
      return { buffer: pdf, pageCount: countPages(pdf) };
    }

    // Pass 1: 목차 번호 없이 렌더
    await page.setContent(renderDocument(doc, templateName), {
      waitUntil: "load",
      timeout: 30000,
    });
    const pdf1 = Buffer.from(await page.pdf(PDF_OPTS));

    if (!hasToc) return { buffer: pdf1, pageCount: countPages(pdf1) };

    // 1차 PDF 파싱 → 실측 페이지번호
    let pageNumbers: Record<string, number> = {};
    try {
      pageNumbers = await measurePageNumbers(doc, pdf1);
    } catch {
      pageNumbers = {}; // 파싱 실패 시 목차 번호는 비움(본문은 정상)
    }

    // Pass 2: 실측 번호로 목차 다시 렌더
    await page.setContent(renderDocument(doc, templateName, pageNumbers), {
      waitUntil: "load",
      timeout: 30000,
    });
    const pdf2 = Buffer.from(await page.pdf(PDF_OPTS));
    return { buffer: pdf2, pageCount: countPages(pdf2) };
  } finally {
    await browser.close();
  }
}

/** DocumentIR → HTML 미리보기 */
export function generatePreviewHtml(doc: DocumentIR, templateName?: string): string {
  return renderDocument(doc, templateName);
}
