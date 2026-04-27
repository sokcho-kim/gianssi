# Task Plan: gianssi

> **Generated from**: docs/prd/PRD_gianssi.md
> **Created**: 2026-04-27
> **Status**: in_progress

## Execution Config

| Option | Value | Description |
|--------|-------|-------------|
| `auto_commit` | true | 완료 시 자동 커밋 |
| `commit_per_phase` | true | Phase별 중간 커밋 |
| `quality_gate` | true | /auto-commit 품질 검사 |

## Phases

### Phase 1: 환경 설정
- [x] Next.js 15 + TypeScript 프로젝트 초기화
- [x] Tailwind CSS 설정
- [x] puppeteer 패키지 설치 (PDF 생성)
- [x] @notionhq/client 패키지 설치 (Notion API)
- [x] 프로젝트 구조 생성 (src/lib, src/app, src/components)

### Phase 2: 핵심 파이프라인 구현
- [x] DocumentIR 타입 정의 (중간 문서 모델)
- [x] Notion API 클라이언트 (client.ts)
- [x] Notion Block → DocumentIR 파서 (parser.ts)
- [x] 두괄식 재구성 엔진 (restructure.ts)
- [x] 공문서 HTML 템플릿 시스템 (base.ts + report.ts)
- [x] HTML → PDF 변환 파이프라인 (generator.ts)

### Phase 3: 웹 UI 구현
- [x] 메인 페이지 — 노션 URL 입력 폼 (page.tsx)
- [x] 템플릿 선택 UI (ConvertForm.tsx)
- [x] 변환 진행 상태 표시 + PDF 다운로드
- [x] POST /api/convert 엔드포인트
- [x] GET /api/templates 엔드포인트

### Phase 4: 테스트 & 검증
- [x] TypeScript 타입 체크 통과
- [x] Next.js 빌드 성공
- [ ] 실제 노션 문서로 E2E 테스트 (Notion API 키 필요)

### Phase 5: 마무리
- [ ] README.md 작성
- [ ] 초기 커밋

## Progress

| Metric | Value |
|--------|-------|
| Total Tasks | 19/21 |
| Current Phase | Phase 5 |
| Status | in_progress |

## Execution Log

| Timestamp | Phase | Task | Status |
|-----------|-------|------|--------|
| 2026-04-27 | Phase 1 | 환경 설정 | completed |
| 2026-04-27 | Phase 2 | 핵심 파이프라인 | completed |
| 2026-04-27 | Phase 3 | 웹 UI + API | completed |
| 2026-04-27 | Phase 4 | 빌드 검증 | completed (E2E 제외) |
