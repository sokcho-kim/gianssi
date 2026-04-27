import type { DocumentIR } from "@/lib/document/types";
import { REPORT_TEMPLATE } from "./report";

export interface Template {
  id: string;
  name: string;
  description: string;
  sections: string[];
  apply: (doc: DocumentIR) => DocumentIR;
}

export const TEMPLATES: Record<string, Template> = {
  report: REPORT_TEMPLATE,
};

export function getTemplate(id: string): Template {
  const template = TEMPLATES[id];
  if (!template) {
    throw new Error(`템플릿을 찾을 수 없습니다: ${id}`);
  }
  return template;
}

export function listTemplates(): Omit<Template, "apply">[] {
  return Object.values(TEMPLATES).map(({ apply, ...rest }) => rest);
}
