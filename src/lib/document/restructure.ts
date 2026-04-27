import type { DocumentIR, Section, SectionTag } from "./types";
import { mergeListBlocks } from "@/lib/notion/parser";

/** 두괄식 키워드 매핑 */
const TAG_KEYWORDS: Record<SectionTag, string[]> = {
  conclusion: [
    "결론",
    "요약",
    "정리",
    "핵심",
    "결과",
    "summary",
    "conclusion",
    "결정사항",
    "주요 내용",
  ],
  evidence: [
    "근거",
    "배경",
    "현황",
    "분석",
    "이유",
    "원인",
    "context",
    "background",
    "상황",
  ],
  detail: [
    "세부",
    "상세",
    "구현",
    "방법",
    "절차",
    "과정",
    "detail",
    "implementation",
    "진행",
    "내용",
  ],
  reference: [
    "참고",
    "부록",
    "참조",
    "링크",
    "reference",
    "appendix",
    "자료",
    "출처",
  ],
};

/** 두괄식 재구성 순서 */
const TAG_ORDER: SectionTag[] = [
  "conclusion",
  "evidence",
  "detail",
  "reference",
];

/** 섹션 제목에서 태그 추론 */
function inferTag(heading: string): SectionTag | undefined {
  const lower = heading.toLowerCase();

  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return tag as SectionTag;
    }
  }

  return undefined;
}

/**
 * 두괄식 재구성 엔진
 *
 * 1. 각 섹션에 태그 부여 (키워드 기반)
 * 2. 태그가 없는 섹션은 위치 기반 추론
 * 3. 결론 → 근거 → 세부 → 참고 순서로 재배치
 * 4. 태그를 못 찾으면 원본 순서 유지 (fallback)
 */
export function restructure(doc: DocumentIR): DocumentIR {
  if (doc.sections.length === 0) return doc;

  // 1. 키워드 기반 태그 부여
  const tagged = doc.sections.map((section) => ({
    ...section,
    tag: section.tag ?? inferTag(section.heading),
    blocks: mergeListBlocks(section.blocks),
  }));

  // 태그가 하나도 없으면 원본 유지 (fallback)
  const hasAnyTag = tagged.some((s) => s.tag);
  if (!hasAnyTag) {
    return applyPositionHeuristic({ ...doc, sections: tagged });
  }

  // 2. 태그 순서대로 정렬
  const sorted: Section[] = [];
  const untagged: Section[] = [];

  for (const tag of TAG_ORDER) {
    sorted.push(...tagged.filter((s) => s.tag === tag));
  }
  untagged.push(...tagged.filter((s) => !s.tag));

  // 태그 없는 섹션은 detail 앞에 삽입
  const detailIndex = sorted.findIndex((s) => s.tag === "detail");
  if (detailIndex >= 0) {
    sorted.splice(detailIndex, 0, ...untagged);
  } else {
    sorted.push(...untagged);
  }

  return { ...doc, sections: sorted };
}

/**
 * 위치 기반 휴리스틱 (키워드 매칭 실패 시 fallback)
 *
 * - 마지막 섹션 → conclusion (결론은 보통 마지막에 쓰니까)
 * - 첫 섹션 → evidence (배경 설명)
 * - 나머지 → detail
 */
function applyPositionHeuristic(doc: DocumentIR): DocumentIR {
  const sections = [...doc.sections];

  if (sections.length >= 3) {
    // 마지막 섹션을 결론으로 올리기
    const last = sections.pop()!;
    last.tag = "conclusion";

    const first = sections.shift()!;
    first.tag = "evidence";

    sections.forEach((s) => (s.tag = "detail"));

    return {
      ...doc,
      sections: [last, first, ...sections],
    };
  }

  // 2개 이하면 그냥 유지
  return doc;
}
