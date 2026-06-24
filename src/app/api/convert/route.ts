import { NextRequest, NextResponse } from "next/server";
import {
  extractPageId,
  getPage,
  getBlockTree,
  getPageTitle,
  getPageMeta,
} from "@/lib/notion/client";
import { blocksToDocument } from "@/lib/notion/blocks-to-ir";
import { restructure } from "@/lib/document/restructure";
import { getTemplate } from "@/lib/template";
import { generatePdf } from "@/lib/pdf/generator";
import { inlineImages } from "@/lib/pdf/images";

/**
 * POST /api/convert
 *
 * 노션 페이지 URL → 공문서 PDF (런타임 자동 변환).
 * Notion SDK(Internal/PAT 토큰)로 블록을 가져와 DocumentIR로 변환 → 이미지 인라인 → PDF.
 *
 * Body: { notionUrl, template?, options?: { restructure? }, supertitle? }
 *   - options.restructure: 두괄식 재구성 (기본 false — 원본 목차 순서 유지)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { notionUrl, template: templateId, options, supertitle } = body as {
      notionUrl?: string;
      template?: string;
      options?: { restructure?: boolean };
      supertitle?: string;
    };

    if (!notionUrl) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_URL", message: "노션 URL을 입력해주세요." } },
        { status: 400 }
      );
    }

    let pageId: string;
    try {
      pageId = extractPageId(notionUrl);
    } catch {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_URL", message: "유효하지 않은 노션 URL입니다." } },
        { status: 400 }
      );
    }

    // 1. 노션 페이지 + 블록 트리 가져오기
    let page, tree;
    try {
      [page, tree] = await Promise.all([getPage(pageId), getBlockTree(pageId)]);
    } catch (e) {
      const msg =
        (e as { code?: string }).code === "object_not_found"
          ? "페이지를 찾을 수 없습니다. 통합(integration)에 페이지가 연결됐는지 확인해주세요."
          : "노션 접근 실패. 토큰(NOTION_API_KEY)을 확인해주세요.";
      return NextResponse.json(
        { success: false, error: { code: "NOTION_AUTH_FAILED", message: msg } },
        { status: 401 }
      );
    }

    // 2. 블록 → DocumentIR
    const title = getPageTitle(page);
    const meta = { ...getPageMeta(page), supertitle };
    let doc = blocksToDocument(title, tree, meta);

    // 3. 두괄식 재구성 (기본 OFF)
    if (options?.restructure === true) doc = restructure(doc);

    // 4. 템플릿
    const selectedTemplate = templateId || "report";
    const template = getTemplate(selectedTemplate);
    doc = template.apply(doc);

    // 5. 이미지 다운로드 → base64 인라인 (S3 1시간 만료 전 즉시)
    doc = await inlineImages(doc);

    // 6. PDF 생성 (목차 페이지번호 자체 실측)
    const { buffer, pageCount } = await generatePdf(doc, template.name);

    const fileName = `${title.replace(/[^가-힣a-zA-Z0-9]/g, "_")}_${selectedTemplate}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "X-Page-Count": String(pageCount),
        "X-Document-Title": encodeURIComponent(title),
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
