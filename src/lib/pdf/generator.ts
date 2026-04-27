import puppeteer from "puppeteer";
import type { DocumentIR } from "@/lib/document/types";
import { renderDocument } from "@/lib/template/base";

export interface PdfResult {
  buffer: Buffer;
  pageCount: number;
}

/** DocumentIR → PDF 변환 (puppeteer) */
export async function generatePdf(
  doc: DocumentIR,
  templateName?: string
): Promise<PdfResult> {
  const html = renderDocument(doc, templateName);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 15000,
    });

    const pdf = await page.pdf({
      format: "A4",
      margin: {
        top: "25mm",
        right: "20mm",
        bottom: "25mm",
        left: "20mm",
      },
      printBackground: true,
      preferCSSPageSize: true,
    });

    // 페이지 수 추정 (PDF 바이트에서 /Page 객체 카운트)
    const pdfBuffer = Buffer.from(pdf);
    const pdfStr = pdfBuffer.toString("latin1");
    const pageCount = (pdfStr.match(/\/Type\s*\/Page[^s]/g) || []).length;

    return {
      buffer: pdfBuffer,
      pageCount: Math.max(pageCount, 1),
    };
  } finally {
    await browser.close();
  }
}

/** DocumentIR → HTML 미리보기 */
export function generatePreviewHtml(
  doc: DocumentIR,
  templateName?: string
): string {
  return renderDocument(doc, templateName);
}
