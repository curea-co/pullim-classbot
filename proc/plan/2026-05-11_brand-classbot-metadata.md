# 2026-05-11 "풀림 스터디" → "풀림 클래스봇" 브랜드 표기 전환

## 목표
Vercel 임베드·브라우저 탭·검색 결과·SNS 공유 카드에 "풀림 스터디"가 아닌 "풀림 클래스봇"이 노출되도록 메타데이터·OG 카드·정책 문서를 정리한다. 단일 PR로 분리해 P0 PR(#1)과 독립 머지.

## audit 결과 — 잔재 위치

### 1. 사용자 가시 (vercel embed / 브라우저 탭 / 검색)
- [src/app/layout.tsx:15](src/app/layout.tsx#L15) `title: '풀림 스터디 — AI 학습 파트너'`
- [src/app/layout.tsx:17](src/app/layout.tsx#L17) `description: '...풀림 스터디는 고등학생을 위한 AI 학습 플랫폼...'`
- [src/app/layout.tsx:18](src/app/layout.tsx#L18) `applicationName: '풀림 스터디'`

### 2. 미설정 — 임베드 시 vercel 기본값 노출되는 영역
- `openGraph` 메타 — 미설정 (vercel.app 기본 카드 노출)
- `twitter` 메타 — 미설정
- `opengraph-image.tsx` / OG 이미지 — 없음
- `manifest.ts` — 없음 (PWA·홈 화면 추가 시 fallback)
- `icon.tsx` — 없음 (favicon.ico만 존재)

### 3. 개발 가시 — 이력 설명 주석 (보존 결정)
- [src/app/(student)/page.tsx:5](src/app/(student)/page.tsx#L5) — "원본 풀림 스터디 데모의 6 도메인 카드 홈은..."
- [src/components/shell/nav-config.ts:3](src/components/shell/nav-config.ts#L3) — "원본 풀림 스터디 데모에서 클래스봇만 분리..."
- [src/lib/mock/index.ts:3](src/lib/mock/index.ts#L3) — "원본 풀림 스터디에서 클래스봇 기능만 추출..."
- [CLAUDE.md](CLAUDE.md) — 추출본 컨텍스트 설명에 "풀림 스터디 데모" 언급

→ **보존**: 이 주석들은 "왜 다른 도메인이 없는지" 설명하는 이력 메모. 사용자 가시 X. 삭제 시 추후 개발자가 "왜 이런 구조인지" 잃음.

---

## 작업 항목

### A. 메타데이터 핵심 (사용자 가시 영역)
- [x] [src/app/layout.tsx](src/app/layout.tsx) `metadata` 객체 전면 교체:
  - `title`: "풀림 클래스봇 — 교사가 만드는 AI 학습 교실"
  - `description`: "교사가 자신의 수업·교안·목소리를 AI에 이식해 만드는 디지털 분신 수업 동반자. 반 운영·과제 배포·실시간 피드백을 자동화하는 풀림 클래스봇."
  - `applicationName`: "풀림 클래스봇"
  - `keywords`: ["풀림 클래스봇", "AI 학습 교실", "교사 AI", "수업 동반자", "클래스봇"]
- [x] title은 `template` 사용해 sub-page에서 `"… | 풀림 클래스봇"` 자동 부착
  ```ts
  title: { default: '풀림 클래스봇 …', template: '%s | 풀림 클래스봇' }
  ```

### B. OG / Twitter 카드 (임베드 시 노출)
- [x] `openGraph` 메타 추가 — title, description, siteName: "풀림 클래스봇", locale: "ko_KR", type: "website"
- [x] `twitter` 메타 추가 — card: "summary_large_image", title, description
- [x] [src/app/opengraph-image.tsx](src/app/opengraph-image.tsx) 신설 — Next.js Edge 런타임 ImageResponse로 동적 OG 이미지(1200×630):
  - 좌상단 ✏️ 또는 🧑‍🏫 이모지
  - "풀림 클래스봇" Pretendard Bold
  - "교사가 만드는 AI 학습 교실"
  - 풀림 블루 그라디언트 배경
- [x] [src/app/twitter-image.tsx](src/app/twitter-image.tsx) — opengraph-image와 동일 또는 `export { default, alt, size, contentType } from './opengraph-image'`로 재사용

### C. PWA / 아이콘
- [x] [src/app/manifest.ts](src/app/manifest.ts) 신설 — name·short_name·start_url·display·theme_color (#0362DA)
- [ ] favicon 점검 — [public/favicon.ico](public/favicon.ico) 기존 파일이 클래스봇 브랜딩에 맞는지 확인 (불일치 시 v1으로 이연 노트만)
  - **미점검**: favicon.ico 디자인 검토는 디자이너 영역 — v1으로 이연. 현재 풀림 모브랜드 파비콘 그대로 사용.

### D. 명세·문서 정합
- [x] [proc/spec/07-branding.md](proc/spec/07-branding.md) 갱신 — 서비스명/슬로건/메타데이터 표준 명시 (현재 풀림 14기능 통합 톤이라 클래스봇 단일 추출본 톤이 흐릿한 부분 정리)
- [x] [proc/spec/02-product-definition.md](proc/spec/02-product-definition.md) 한 줄 정의 확인 — 추출본 컨텍스트로 정렬됐는지

### E. 검증
- [x] `bun run build` — 메타 export 타입 통과
- [x] 로컬 `http://localhost:3032` head 검사: `curl -s … | grep -E 'og:|twitter:'`로 메타 출력 확인
- [ ] Vercel preview 배포 → 카카오톡 채팅창에 링크 붙여 카드 미리보기 (https://www.opengraph.xyz/ 등 서비스로도 가능)
  - 사용자 검증 영역 (PR 머지 후)
- [x] OG 이미지가 1200×630 비율로 렌더되는지 확인
  - `curl /opengraph-image` → 200 OK · 197KB image/png. og:image:width=1200, og:image:height=630 메타 확인.

### F. 협업
- [x] 본 작업은 별도 브랜치 `feat/brand-classbot-metadata`로 분리
- [x] PR base는 `dev`로 → PR #1(P0 사이클 봉합)과 독립 머지

---

## 비고

### 변경 범위 결정 — 보존 vs 교체
| 영역 | 결정 | 이유 |
|---|---|---|
| 사용자 가시 메타 (title/description/og) | **전면 교체** | "풀림 스터디"는 추출 이전 브랜드 — 현재 제품은 클래스봇 |
| Breadcrumb 루트 라벨 | 이미 정상 | `nav-config.ts` buildBreadcrumb에서 student="풀림 클래스봇", teacher="풀림 교사" |
| 사이드바·BottomNav 라벨 | 이미 정상 | 모두 "풀림 클래스봇" 또는 sub-section 라벨 |
| 개발 주석 / CLAUDE.md "원본 풀림 스터디..." | **보존** | 이력 설명, 사용자 가시 X, 삭제 시 컨텍스트 손실 |

### 카피 후보 비교
| 항목 | 현재 | 후보 1 (권장) | 후보 2 (단문) |
|---|---|---|---|
| title | 풀림 스터디 — AI 학습 파트너 | 풀림 클래스봇 — 교사가 만드는 AI 학습 교실 | 풀림 클래스봇 |
| description | …고등학생을 위한 AI 학습 플랫폼… | 교사가 자신의 수업·교안·목소리를 AI에 이식해 만드는 디지털 분신 수업 동반자… | 교사가 만들고 통제하는 AI 학습 교실 |

권위 문서 § 1.1 "디지털 분신(分身) 수업 동반자" 원문 톤을 살리되, OG에 들어갈 짧은 버전은 후보 1 채택.

### 이연 (이번 plan 제외)
- 한국어 외 다국어 메타 (en) — v3+ (핸드오프 § 11)
- 봇별 동적 OG 카드 (학생이 봇 페이지 공유 시 봇 이름 노출) — v1
- 검색 인덱싱 정책 (robots.txt / sitemap.xml) — v1
