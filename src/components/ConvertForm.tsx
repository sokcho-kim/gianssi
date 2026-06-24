"use client";

import { useState } from "react";

interface Template {
  id: string;
  name: string;
  description: string;
  sections: string[];
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "report",
    name: "업무 보고서",
    description: "주간/월간 보고용 두괄식 보고서",
    sections: ["요약", "현황 및 배경", "세부 내용", "참고 자료"],
  },
];

export default function ConvertForm() {
  const [notionUrl, setNotionUrl] = useState("");
  const [template, setTemplate] = useState("report");
  const [restructure, setRestructure] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notionUrl,
          template,
          options: { restructure },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "변환 실패");
      }

      // PDF 다운로드
      const blob = await res.blob();
      const title = decodeURIComponent(
        res.headers.get("X-Document-Title") || "document"
      );
      const fileName = `${title}_${template}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "알 수 없는 오류"
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-6">
      {/* 노션 URL 입력 */}
      <div>
        <label
          htmlFor="notionUrl"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          노션 페이지 URL
        </label>
        <input
          id="notionUrl"
          type="text"
          value={notionUrl}
          onChange={(e) => setNotionUrl(e.target.value)}
          placeholder="https://www.notion.so/..."
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
        />
      </div>

      {/* 템플릿 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          공문서 양식
        </label>
        <div className="grid gap-2">
          {DEFAULT_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplate(t.id)}
              className={`text-left p-3 rounded-lg border-2 transition-all ${
                template === t.id
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <div className="font-medium text-sm">{t.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {t.description}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {t.sections.join(" → ")}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 두괄식 옵션 */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={restructure}
          onChange={(e) => setRestructure(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300"
        />
        <span className="text-sm text-gray-700">
          두괄식 재구성 (결론 → 근거 → 세부사항)
        </span>
      </label>

      {/* 변환 버튼 */}
      <button
        type="submit"
        disabled={status === "loading" || !notionUrl}
        className="w-full py-3 px-4 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {status === "loading" ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            기안씨가 문서를 만들고 있어요...
          </span>
        ) : (
          "공문서 PDF 변환"
        )}
      </button>

      {/* 상태 메시지 */}
      {status === "success" && (
        <div className="p-3 bg-green-50 text-green-800 rounded-lg text-sm text-center">
          PDF가 다운로드되었습니다!
        </div>
      )}

      {status === "error" && (
        <div className="p-3 bg-red-50 text-red-800 rounded-lg text-sm text-center">
          {errorMessage}
        </div>
      )}
    </form>
  );
}
