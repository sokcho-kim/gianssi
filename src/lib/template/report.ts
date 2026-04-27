import type { DocumentIR, Section } from "@/lib/document/types";

/**
 * 업무 보고서 템플릿
 *
 * 구조: 제목 → 요약 → 현황 → 세부내용 → 향후계획
 *
 * 두괄식 재구성된 DocumentIR을 보고서 형식에 맞게 섹션명을 재매핑
 */

const SECTION_MAP: Record<string, string> = {
  conclusion: "요약",
  evidence: "현황 및 배경",
  detail: "세부 내용",
  reference: "참고 자료",
};

export function applyReportTemplate(doc: DocumentIR): DocumentIR {
  const sections: Section[] = doc.sections.map((section) => {
    const mappedHeading =
      section.tag && SECTION_MAP[section.tag]
        ? SECTION_MAP[section.tag]
        : section.heading;

    return {
      ...section,
      heading: mappedHeading,
    };
  });

  return {
    ...doc,
    sections,
    metadata: {
      ...doc.metadata,
      template: "업무 보고서",
    },
  };
}

export const REPORT_TEMPLATE = {
  id: "report",
  name: "업무 보고서",
  description: "주간/월간 보고용 두괄식 보고서",
  sections: ["요약", "현황 및 배경", "세부 내용", "참고 자료"],
  apply: applyReportTemplate,
};
