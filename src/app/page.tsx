import ConvertForm from "@/components/ConvertForm";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      {/* 헤더 */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">
          기안씨
        </h1>
        <p className="text-lg text-gray-500">
          노션 문서를 공문서 스타일 PDF로 변환합니다
        </p>
        <p className="text-sm text-gray-400 mt-1">
          &ldquo;기안씨가 알아서 해드릴게요~&rdquo;
        </p>
      </div>

      {/* 변환 폼 */}
      <ConvertForm />

      {/* 하단 설명 */}
      <div className="mt-16 max-w-md text-center">
        <div className="grid grid-cols-3 gap-6 text-sm text-gray-500">
          <div>
            <div className="text-2xl mb-1">1.</div>
            <div>노션 URL 붙여넣기</div>
          </div>
          <div>
            <div className="text-2xl mb-1">2.</div>
            <div>양식 선택</div>
          </div>
          <div>
            <div className="text-2xl mb-1">3.</div>
            <div>PDF 다운로드</div>
          </div>
        </div>
      </div>
    </main>
  );
}
