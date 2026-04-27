// DocumentIR — 중간 문서 모델
// Notion 블록을 파싱한 결과이자, 템플릿 렌더링의 입력

export interface DocumentIR {
  title: string;
  author?: string;
  date: string; // ISO 8601
  sections: Section[];
  metadata?: Record<string, string>;
}

export interface Section {
  heading: string;
  level: 1 | 2 | 3;
  blocks: Block[];
  /** 두괄식 재구성용 태그 */
  tag?: SectionTag;
}

export type SectionTag =
  | "conclusion" // 결론/핵심
  | "evidence" // 근거/현황
  | "detail" // 세부사항
  | "reference"; // 참고자료

export type Block =
  | ParagraphBlock
  | HeadingBlock
  | ListBlock
  | TableBlock
  | ImageBlock
  | DividerBlock
  | CalloutBlock;

interface BaseBlock {
  type: string;
}

export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  richText: RichText[];
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  level: 1 | 2 | 3;
  richText: RichText[];
}

export interface ListBlock extends BaseBlock {
  type: "bulleted_list" | "numbered_list";
  items: ListItem[];
}

export interface ListItem {
  richText: RichText[];
  children?: Block[];
}

export interface TableBlock extends BaseBlock {
  type: "table";
  headers: RichText[][];
  rows: RichText[][][];
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  url: string;
  caption?: RichText[];
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
}

export interface CalloutBlock extends BaseBlock {
  type: "callout";
  icon?: string;
  richText: RichText[];
}

export interface RichText {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  color?: string;
  link?: string;
}
