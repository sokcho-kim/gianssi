@AGENTS.md

# 기안씨 (gianssi) — 작업 플레이북

> 노션 문서 → **한국 정부/기관 공문서 스타일 PDF** 변환기.
> 이 문서는 2026-06-22 첫 실전 변환에서 겪은 시행착오를 박제한 거다. **작업 전 반드시 읽고, 같은 삽질 반복하지 말 것.**

## 0. 환경 함정 (제일 먼저 확인) ⚠️
- **이 레포는 반드시 C: (NTFS)에 둔다.** D:는 exFAT라 심볼릭 링크가 안 돼서 `next dev`(Turbopack)가 junction 생성에 실패하며 죽는다. `git` ownership 경고도 같은 원인. 새로 클론하면 `C:\Jimin\gianssi`.
- **PowerShell의 `ConvertTo-Json`으로 큰 문자열(마크다운)을 보내지 마라.** 문자열을 객체로 깨뜨리고(98MB 폭증) 한글 인코딩도 깨진다. HTTP POST/JSON은 **Node(`fetch`)로** 한다. (`scripts/post-real.mjs` 참고)
- **PDF를 눈으로 보려면** poppler가 없으니 **PyMuPDF로 PDF→PNG 렌더 후 Read**한다:
  ```python
  import fitz; doc=fitz.open('out/real.pdf')
  for i in range(len(doc)): doc[i].get_pixmap(matrix=fitz.Matrix(2,2)).save(f'out/p{i+1}.png')
  ```
- 콘솔 인코딩(cp949) 때문에 파이썬 출력에 `✓✗` 같은 기호 쓰지 말 것 → `sys.stdout.reconfigure(encoding='utf-8')` 또는 ASCII.

## 1. 파이프라인 & 핵심 파일
```
노션 MD → parseNotionMarkdown → DocumentIR → 템플릿 적용 → inlineImages → puppeteer(HTML→PDF, 2-pass 목차)
```
- `src/lib/notion/md-parser.ts` — 노션 마크다운 파서 (표/중첩리스트/컬럼/이미지)
- `src/lib/document/types.ts` — DocumentIR (ColumnsBlock 포함)
- `src/lib/template/base.ts` — 렌더러 + 공문서 CSS + 목차
- `src/lib/pdf/images.ts` — 이미지 다운로드→base64 인라인
- `src/lib/pdf/generator.ts` — puppeteer, 목차 페이지번호(시뮬 또는 외부주입)
- `src/app/api/convert-md/route.ts` — **진짜 엔드포인트.** body: `{title, markdown, meta, template, options, pageNumbers?}`, `?format=html` 디버그
- ⚠️ `src/app/api/convert/route.ts` + `parser.ts` = **옛 SDK 경로, 표를 전부 버림(`case table: return null`). 쓰지 마라.** 프론트(`ConvertForm.tsx`)가 아직 여길 호출하니 자동화 시 `convert-md`로 바꿔야 함.

## 2. 노션 마크다운 파싱 시 알아둘 것
- 표는 마크다운이 아니라 **`<table header-row="true"><tr><td>` HTML**로 온다.
- **`<columns>/<column>`** = 가로 N단 레이아웃. **세로로 펼치지 말고 그대로 미러링**한다(사용자가 의도한 배치임).
- 중첩 불릿은 **탭(`\t`) 들여쓰기**로 깊이 표현. 헤딩은 `##`(섹션 Ⅰ~Ⅴ) / `###`(소제목) / `####`(세부).
- 이스케이프: `\~`, `\*`, `<br>` 등 → 파서가 정리함.
- **이미지 URL은 S3 서명 URL이라 1시간 후 만료**된다. fetch 직후 즉시 다운로드/임베딩해야 한다. (경로 UUID는 영구, 서명·토큰만 바뀜)

## 3. 공문서 양식 스펙 (참조: `Downloads/(★AICA)…추진 계획.pdf`)
- 제목부: `『상위제목』` + 굵은 제목(하단 라인) + 우측 부서명 + 작성일 (종류/상태는 뺌 — 사용자 선호)
- **목차**: `목 차` + Ⅰ~Ⅴ + ### 소제목, 점선 리더, **페이지번호는 추정 말고 실측**(아래)
- **Ⅰ~Ⅴ 단원마다 새 페이지**(`.section.page-break`), 표지 이미지는 Ⅰ과 같은 페이지
- 섹션 헤더: 네이비 숫자박스 + 연파랑 제목바(`.sec-num`/`.sec-title`)
- 불릿: `□`(1) → `○`(2) → `–`(3), 한글은 `word-break: keep-all`(글자 단위 줄바꿈 방지 — 넓은 표 필수)
- 표 헤더 회색 음영, 7칼럼↑은 `table.wide`로 폰트 축소
- 꼬리말 `- n -` 페이지번호

## 4. 목차 페이지번호 — 실측이 정답
시뮬레이션(높이 합산)은 이미지 avoid-break 때문에 1칸씩 어긋난다. **실제 PDF를 파싱해 실측**한다:
1. `node scripts/post-real.mjs` (pagenums 없이) → `out/real.pdf`
2. `python scripts/compute_pagenums.py` → 각 헤딩의 실제 페이지를 PDF 텍스트에서 찾아 `out/pagenums.json` (앵커 id `sec{i}`/`sec{i}_{j}`, **표지가 sections[0]이라 Ⅰ=sec1부터**)
3. `node scripts/post-real.mjs` (pagenums.json 자동 포함) → 최종 PDF
   - 매칭 시 헤딩 텍스트에서 `<br>`/`**`/선행마커 제거 후 공백제거하고 비교.
- (앱 자동화 시엔 PyMuPDF 대신 Node PDF 파서(pdfjs/unpdf)로 같은 일을 하면 self-contained)

## 5. 검증 프로토콜 (눈대중·추측 금지)
- **데이터 누락 체크**: PyMuPDF로 PDF 텍스트 추출 → **공백 전부 제거 후** 이름/이메일 매칭(좁은 표는 글자가 줄바꿈돼서 그냥 검색하면 안 잡힘). `out/count2.py` 참고. 표 행 수 꼭 확인.
- **레이아웃 체크**: PDF→PNG 렌더해서 실제로 본다.
- **🚫 fixture를 임의로 줄이지 마라.** 표 행/컬럼을 줄여놓고 "다 된다"고 하면 신뢰를 잃는다(실제로 그랬다). 원본 전량을 쓴다.

## 6. 재생성 워크플로 (지금 = 반자동)
1. MCP로 노션 페이지 fetch (`notion-fetch`)
2. `fixtures/real.md`에 본문 **전량** 미러링 — 이미지는 `http://localhost:3000/img/<name>.png`(로컬 다운로드분), 컬럼/표 구조 보존
3. 이미지 바뀌었으면 `scripts/dl-images.mjs`로 재다운로드(UUID→이름 매핑) + 1100px 리사이즈(PIL)
4. `npm run dev` 띄우고 → §4의 2-step 실행 → `out/real.pdf`
- meta(작성일/부서/상위제목)는 `scripts/post-real.mjs`에서 조정.

## 7. 런타임 자동 변환 (완료 ✅) — 이게 메인 경로
**`POST /api/convert` body `{notionUrl, template?, options?, supertitle?}` → PDF.** 노션 URL만 있으면 끝.
- 토큰: 노션 **PAT(개인 액세스 토큰)** → `.env.local`의 `NOTION_API_KEY`. PAT는 내 권한으로 동작 → **페이지를 integration에 공유 안 해도 읽힘**(Internal과 차이).
- 흐름: `extractPageId`(앱URL 포함) → `getPage`+`getBlockTree`(계층보존) → `blocksToDocument`(블록→IR) → restructure(기본off) → 템플릿 → `inlineImages`(SDK 신선 URL 다운로드→**sharp 1100px 리사이즈**→base64) → `generatePdf`(unpdf로 목차 페이지 자체 실측 2-pass).
- 핵심 파일: `notion/client.ts`(URL파싱·트리·속성), `notion/blocks-to-ir.ts`(블록→IR), `pdf/images.ts`(sharp 리사이즈), `pdf/generator.ts`(unpdf 목차 실측), `app/api/convert/route.ts`.
- 작성자/작성일은 노션 속성(작성자 people, 등록일 date)에서 자동. 종류/상태는 머리말에 안 띄움(사용자 선호). 상위제목은 `supertitle` 파라미터(노션에 없음).
- 의존성 추가됨: `unpdf`(PDF 텍스트추출), `sharp`(리사이즈). `next.config.ts` serverExternalPackages에 puppeteer/sharp/unpdf 등록.
- ⚠️ `inlineImages` 리사이즈 안 하면 PDF 수백 MB(원본 9~26MB). sharp 필수.

### 사용법
- **웹**: `npm run dev` → http://localhost:3000 → 노션 URL 붙여넣고 "변환" → PDF 다운로드.
- **CLI 테스트**: `node scripts/convert-url.mjs <노션URL>` → `out/url.pdf` (서버 떠 있어야 함).
- `scripts/test-notion.mjs` = 토큰/접근 점검.

## 8. 다음 (선택)
- 트리거: 노션 버튼/속성 → 웹훅, 또는 Teams 봇으로 "토스" (런타임이 됐으니 그 위에 얹으면 됨)
- `convert-md` 라우트(마크다운 직접 입력)는 MCP 경로용으로 잔존 — 디버그/대체용.
- §4 PyMuPDF 하니스(`compute_pagenums.py` 등)는 이제 불필요(앱이 unpdf로 자체 실측). 참고용으로만.
