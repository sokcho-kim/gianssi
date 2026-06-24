import { NextRequest, NextResponse } from "next/server";
import { parseNotionMarkdown, type NotionMeta } from "@/lib/notion/md-parser";
import { restructure } from "@/lib/document/restructure";
import { getTemplate } from "@/lib/template";
import { generatePdf, generatePreviewHtml } from "@/lib/pdf/generator";
import { inlineImages } from "@/lib/pdf/images";

/**
 * POST /api/convert-md
 *
 * MCP(notion-fetch)가 반환한 노션 마크다운을 공문서 PDF로 변환한다.
 * 데이터 계약 = 노션 마크다운 (SDK 블록 아님).
 *
 * Body: { title, markdown, meta?, template?, options? }
 *   - options.restructure: 두괄식 재구성 (기본 false — 원본 목차 순서 유지)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      markdown,
      meta,
      template: templateId,
      options,
      pageNumbers,
    } = body as {
      title?: string;
      markdown?: string;
      meta?: NotionMeta;
      template?: string;
      options?: { restructure?: boolean };
      pageNumbers?: Record<string, number>;
    };

    if (!markdown || typeof markdown !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "markdown이 필요합니다." } },
        { status: 400 }
      );
    }

    // 1. 파싱
    let doc = parseNotionMarkdown(title || "제목 없음", markdown, meta ?? {});

    // 2. 두괄식 재구성 — 기본 OFF (명시적으로 true일 때만)
    if (options?.restructure === true) {
      doc = restructure(doc);
    }

    // 3. 템플릿 적용
    const selectedTemplate = templateId || "report";
    const template = getTemplate(selectedTemplate);
    doc = template.apply(doc);

    // 3.5 이미지 다운로드 → base64 인라인 (S3 만료/네트워크 누락 방지)
    doc = await inlineImages(doc);

    // 디버그: ?format=html 이면 렌더된 HTML 반환 (검증용)
    if (req.nextUrl.searchParams.get("format") === "html") {
      const html = generatePreviewHtml(doc, template.name);
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 4. PDF 생성 (pageNumbers 주어지면 목차에 실측값 주입)
    const { buffer, pageCount } = await generatePdf(doc, template.name, pageNumbers);

    const safeTitle = (title || "document").replace(/[^가-힣a-zA-Z0-9]/g, "_");
    const fileName = `${safeTitle}_${selectedTemplate}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "X-Page-Count": String(pageCount),
        "X-Template": selectedTemplate,
      },
    });
  } catch (error) {
    console.error("변환 오류:", error);
    return NextResponse.json(
      { success: false, error: { code: "CONVERSION_FAILED", message: "문서 변환 중 오류가 발생했습니다." } },
      { status: 422 }
    );
  }
}
