# 기안씨 (gianssi) PRD

> **Version**: 1.1
> **Created**: 2026-04-27
> **Updated**: 2026-04-27
> **Status**: Draft

## 1. Overview

### 1.1 Problem Statement

개발팀은 노션에 문서를 정리하지만, 대표님은 노션을 안 본다. 대표님은 **두괄식 PDF 문서**를 원한다. 매번 노션 내용을 복사해서 문서로 재작성하는 건 시간 낭비다.

> "기안씨가 알아서 해드릴게요~"

### 1.2 Goals
- 노션 문서를 자동으로 가져와서 **공문서 스타일**로 변환
- **두괄식** 구조로 재구성 (결론 → 근거 → 세부사항)
- HWP 파일 생성 후 PDF 출력
- 대표님이 "읽고 싶은" 문서 포맷 제공

### 1.3 Non-Goals (Out of Scope)
- 노션 문서 편집/역동기화 (읽기 전용)
- 한컴오피스 수준의 완전한 문서 편집기
- 다국어 공문서 템플릿
- 실시간 협업 기능

### 1.4 Scope

| 포함 | 제외 |
|------|------|
| Notion MCP로 문서 읽기 | 노션 문서 수정 |
| 공문서 템플릿 적용 | 커스텀 템플릿 에디터 |
| 두괄식 자동 재구성 | AI 문서 요약/생성 (v2) |
| HWP 생성 (rhwp) | HWPX 지원 |
| PDF 변환 및 다운로드 | 인쇄 최적화 |
| 웹 UI (미리보기) | 모바일 앱 |

## 2. User Stories

### 2.1 Primary User — 개발자 (기안씨 사용자)

**US-001**: As a 개발자, I want to 노션 페이지 URL을 입력하면 공문서 PDF가 나오게 so that 대표님한테 바로 보낼 수 있다.

**US-002**: As a 개발자, I want to 공문서 템플릿을 선택할 수 있게 so that 보고서/기안서/회의록 등 상황에 맞는 포맷을 쓸 수 있다.

**US-003**: As a 개발자, I want to 변환 결과를 미리보기로 확인하고 수정할 수 있게 so that 대표님한테 보내기 전에 검토할 수 있다.

### 2.2 Secondary User — 대표님 (수신자)

**US-004**: As a 대표님, I want to 두괄식으로 정리된 PDF를 받아서 so that 핵심부터 빠르게 파악할 수 있다.

### 2.3 Acceptance Criteria (Gherkin)

```gherkin
Scenario: 노션 페이지를 공문서 PDF로 변환
  Given 사용자가 노션 페이지 URL을 입력했다
  When "변환" 버튼을 클릭한다
  Then 노션 문서 내용이 두괄식으로 재구성된다
  And 공문서 템플릿이 적용된 HWP가 생성된다
  And PDF로 변환되어 다운로드할 수 있다

Scenario: 템플릿 선택
  Given 사용자가 노션 문서를 불러왔다
  When 공문서 템플릿 목록에서 "업무 보고서"를 선택한다
  Then 문서가 해당 템플릿 포맷으로 렌더링된다
  And 미리보기에서 결과를 확인할 수 있다

Scenario: 두괄식 재구성
  Given 노션 문서가 시간순/나열식으로 작성되어 있다
  When 두괄식 변환 옵션이 활성화되어 있다
  Then 결론/핵심이 문서 상단으로 이동한다
  And 근거/세부사항이 하단에 배치된다
```

## 3. Functional Requirements

| ID | Requirement | Priority | Dependencies |
|----|------------|----------|--------------|
| FR-001 | Notion MCP 연동 — 페이지/DB 읽기 | P0 (Must) | - |
| FR-002 | 노션 블록 → 중간 문서 모델(IR) 변환 | P0 (Must) | FR-001 |
| FR-003 | 두괄식 재구성 엔진 — 결론→근거→세부 순서로 재배치 | P0 (Must) | FR-002 |
| FR-004 | 공문서 템플릿 시스템 — 보고서, 기안서, 회의록 | P0 (Must) | FR-002 |
| FR-005 | rhwp 연동 — IR → HWP 파일 생성 | P0 (Must) | FR-002, FR-004 |
| FR-006 | HWP → PDF 변환 | P0 (Must) | FR-005 |
| FR-007 | 웹 UI — 노션 URL 입력 + 템플릿 선택 + 미리보기 | P1 (Should) | FR-001~006 |
| FR-008 | 미리보기에서 제목/내용 간단 수정 | P1 (Should) | FR-007 |
| FR-009 | 변환 이력 관리 (최근 변환 목록) | P2 (Could) | FR-007 |
| FR-010 | 노션 데이터베이스 일괄 변환 | P2 (Could) | FR-001 |

## 4. Non-Functional Requirements

### 4.0 Scale Grade

**Hobby** — 사내 도구. 사용자 수십 명 이하.

### 4.1 Performance SLA

| 지표 | 목표값 |
|------|--------|
| 노션 문서 fetch | < 3s (단일 페이지) |
| 두괄식 변환 처리 | < 2s |
| HWP 생성 | < 5s |
| PDF 변환 | < 5s |
| 전체 파이프라인 (E2E) | < 15s |

### 4.2 Availability SLA

| 등급 | Uptime | 허용 다운타임(월) |
|------|--------|-----------------|
| Hobby | 95% | 36시간 |

### 4.3 Data Requirements

| 항목 | 값 |
|------|-----|
| 현재 데이터량 | < 100MB |
| 월간 증가율 | 미미 (생성된 PDF 저장 안 함, 즉시 다운로드) |
| 데이터 보존 기간 | 변환 이력만 30일 보관 |

### 4.5 Security
- Authentication: Notion OAuth (MCP 통한 인증)
- Data encryption: In transit (HTTPS)
- 노션 토큰은 서버 세션에만 보관, DB 저장 안 함

## 5. Technical Design

### 5.1 Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Next.js    │────▶│  Notion MCP  │────▶│  Notion API  │
│  Frontend   │     │  Client      │     │              │
└──────┬──────┘     └──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────────────────────────┐
│  변환 엔진   │────▶│  rhwp CLI (네이티브)              │
│  (두괄식     │     │  - HWP 생성 (serializer)         │
│   재구성)    │     │  - PDF export (svg2pdf+pdf-writer)│
└──────────────┘     └──────────────────────────────────┘
```

> **핵심 변경**: rhwp v0.7.7에 네이티브 PDF export 내장 (`rhwp export-pdf`).
> puppeteer 불필요. 서버에서 rhwp CLI를 직접 호출.

### 5.2 Core Pipeline

```typescript
// 핵심 변환 파이프라인
NotionPage → NotionBlocks[] → DocumentIR → 두괄식IR → HWP(rhwp) → PDF(rhwp)
```

1. **Notion Fetcher**: MCP로 노션 페이지 블록 가져오기
2. **Block Parser**: 노션 블록 → 중간 문서 모델(DocumentIR) 변환
3. **두괄식 Restructurer**: IR을 두괄식 구조로 재배치
4. **Template Renderer**: 공문서 템플릿 적용
5. **HWP Generator**: rhwp serializer로 HWP 파일 생성
6. **PDF Converter**: `rhwp export-pdf` CLI 호출 (svg2pdf + pdf-writer, 네이티브 전용)

### 5.3 공문서 템플릿 종류

| 템플릿 | 구조 | 용도 |
|--------|------|------|
| **업무 보고서** | 제목 → 요약 → 현황 → 세부내용 → 향후계획 | 주간/월간 보고 |
| **기안서** | 제목 → 기안요지 → 시행내용 → 예산 → 기대효과 | 의사결정 요청 |
| **회의록** | 일시/장소/참석자 → 결정사항 → 논의내용 → 후속조치 | 회의 기록 |
| **검토 의견서** | 제목 → 결론 → 검토내용 → 근거자료 | 기술 검토 |

### 5.4 두괄식 변환 로직

```
[입력: 나열식 노션 문서]
1. 제목/헤딩 추출 → 문서 구조 파악
2. 결론/요약 문장 탐지 (마지막 섹션, "결론", "요약", "정리" 키워드)
3. 핵심 내용을 상단으로 이동
4. 근거/배경을 중간에 배치
5. 세부사항/참고자료를 하단에 배치

[출력: 두괄식 구조]
- 1️⃣ 핵심 요약 (결론)
- 2️⃣ 주요 내용 (근거)
- 3️⃣ 세부 사항 (상세)
- 4️⃣ 참고 자료 (부록)
```

### 5.5 Tech Stack

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 15 + TypeScript |
| Styling | Tailwind CSS |
| Notion 연동 | Notion MCP (Model Context Protocol) |
| HWP 생성 | rhwp serializer (네이티브) |
| PDF 변환 | rhwp export-pdf (svg2pdf + pdf-writer, 네이티브) |
| 미리보기 | @rhwp/core WASM (브라우저 SVG 렌더링) |
| 배포 | 로컬/VPS (네이티브 바이너리 필요, Vercel 불가) |

### 5.6 API Specification

#### `POST /api/convert`

**Description**: 노션 페이지를 공문서 PDF로 변환

**Request Body**:
```json
{
  "notionUrl": "string (required) - 노션 페이지 URL",
  "template": "string (required) - report | draft | minutes | review",
  "options": {
    "restructure": "boolean (optional, default: true) - 두괄식 재구성 여부",
    "format": "string (optional, default: 'pdf') - pdf | hwp"
  }
}
```

**Response 200 OK**:
```json
{
  "success": true,
  "data": {
    "fileUrl": "string - 생성된 파일 다운로드 URL",
    "fileName": "string - 파일명",
    "format": "string - pdf | hwp",
    "previewUrl": "string - 미리보기 URL",
    "metadata": {
      "title": "string - 문서 제목",
      "template": "string - 적용된 템플릿",
      "pageCount": "number - 페이지 수",
      "convertedAt": "string (ISO 8601)"
    }
  }
}
```

**Error Responses**:
| Status | Code | Message |
|--------|------|---------|
| 400 | INVALID_URL | 유효하지 않은 노션 URL |
| 401 | NOTION_AUTH_FAILED | 노션 인증 실패 |
| 404 | PAGE_NOT_FOUND | 노션 페이지를 찾을 수 없음 |
| 422 | CONVERSION_FAILED | 변환 처리 실패 |
| 500 | INTERNAL_ERROR | 서버 오류 |

#### `GET /api/templates`

**Description**: 사용 가능한 공문서 템플릿 목록 조회

**Response 200 OK**:
```json
{
  "success": true,
  "data": [
    {
      "id": "report",
      "name": "업무 보고서",
      "description": "주간/월간 보고용",
      "sections": ["요약", "현황", "세부내용", "향후계획"]
    }
  ]
}
```

#### `GET /api/preview/:jobId`

**Description**: 변환 결과 미리보기 (SVG 렌더링)

**Response 200 OK**: SVG 이미지 스트림

## 6. Implementation Phases

### Phase 1: MVP — 노션 → PDF 파이프라인
- [ ] 프로젝트 초기 설정 (Next.js + TypeScript + Tailwind)
- [ ] Notion MCP 연동 — 페이지 블록 가져오기
- [ ] DocumentIR 모델 정의
- [ ] 노션 블록 → DocumentIR 파서
- [ ] 두괄식 재구성 엔진 (기본)
- [ ] 공문서 템플릿 1종 (업무 보고서)
- [ ] rhwp 연동 — IR → HWP 생성
- [ ] HWP → PDF 변환
- [ ] 기본 웹 UI (URL 입력 → 다운로드)
**Deliverable**: 노션 URL 넣으면 공문서 PDF 나오는 웹앱

### Phase 2: Enhancement — 템플릿 + 미리보기
- [ ] 추가 템플릿 (기안서, 회의록, 검토 의견서)
- [ ] 미리보기 화면 (rhwp Canvas 렌더링)
- [ ] 미리보기에서 제목/내용 간단 수정
- [ ] 변환 이력 관리
**Deliverable**: 템플릿 선택 + 미리보기 + 수정 가능한 완성형 UI

### Phase 3: Automation — 자동화 + 일괄 변환
- [ ] 노션 데이터베이스 일괄 변환
- [ ] 스케줄링 (주간 보고서 자동 생성 등)
- [ ] Slack/이메일 알림 연동
**Deliverable**: 자동으로 돌아가는 보고서 생성 파이프라인

## 7. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| 변환 성공률 | > 95% | 성공 건수 / 전체 요청 |
| E2E 변환 시간 | < 15s | 서버 로그 |
| 대표님 문서 열람률 | > 80% | 대표님 피드백 (수동) |
| 주간 사용 횟수 | > 5회 | API 호출 로그 |
| 개발자 만족도 | "노션에 쓰고 버튼 하나면 끝" | 팀 피드백 |
