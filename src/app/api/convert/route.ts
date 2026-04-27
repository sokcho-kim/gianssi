import { NextRequest, NextResponse } from "next/server";
import {
  extractPageId,
  getPage,
  getAllBlocks,
  getPageTitle,
} from "@/lib/notion/client";
import { parseBlocks } from "@/lib/notion/parser";
import { restructure } from "@/lib/document/restructure";
import { getTemplate } from "@/lib/template";
import { generatePdf } from "@/lib/pdf/generator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { notionUrl, template: templateId, options } = body;

    if (!notionUrl) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_URL", message: "노션 URL을 입력해주세요." } },
        { status: 400 }
      );
    }

    // 1. 노션 페이지 가져오기
    let pageId: string;
    try {
      pageId = extractPageId(notionUrl);
    } catch {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_URL", message: "유효하지 않은 노션 URL입니다." } },
        { status: 400 }
      );
    }

    let page, blocks;
    try {
      [page, blocks] = await Promise.all([
        getPage(pageId),
        getAllBlocks(pageId),
      ]);
    } catch {
      return NextResponse.json(
        { success: false, error: { code: "NOTION_AUTH_FAILED", message: "노션 페이지를 가져올 수 없습니다. API 키를 확인해주세요." } },
        { status: 401 }
      );
    }

    // 2. 파싱
    const title = getPageTitle(page);
    let doc = parseBlocks(title, blocks);

    // 3. 두괄식 재구성
    const shouldRestructure = options?.restructure !== false;
    if (shouldRestructure) {
      doc = restructure(doc);
    }

    // 4. 템플릿 적용
    const selectedTemplate = templateId || "report";
    const template = getTemplate(selectedTemplate);
    doc = template.apply(doc);

    // 5. PDF 생성
    const { buffer, pageCount } = await generatePdf(doc, template.name);

    // 6. 응답
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
