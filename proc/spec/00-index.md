# 풀림(Pullim) 프로젝트 명세 인덱스

이 디렉토리(`proc/spec/`)는 풀림 프로젝트의 단일 진실원(Single Source of Truth)이다. 코드와 명세가 어긋나면 코드를 진실로 보고 spec을 갱신한다(`update-spec` 스킬 활용).

## 문서 구성

| # | 파일 | 다루는 내용 |
|---|------|----------|
| 01 | [01-ai-instruction.md](01-ai-instruction.md) | AI 명령지침 — 이 명세를 읽고 개발할 AI에게 전달할 행동 규칙 |
| 02 | [02-product-definition.md](02-product-definition.md) | 제품 정의 — 풀림 3축, 문제·목표·페르소나 |
| 03 | [03-features-and-ia.md](03-features-and-ia.md) | 핵심 기능·IA·사이트맵·라우트 매핑 |
| 04 | [04-ux-flow.md](04-ux-flow.md) | UX 플로우·시나리오·핵심 인터랙션 패턴 |
| 05 | [05-business-rules.md](05-business-rules.md) | 비즈니스 규칙·RBAC·ERD·검증 규칙·AI Tier |
| 06 | [06-content-data.md](06-content-data.md) | 콘텐츠 데이터셋·Mock 페르소나·시드 데이터 |
| 07 | [07-branding.md](07-branding.md) | 브랜드 네이밍·톤앤보이스·마이크로카피·UX writing(한자어/전문용어 정책) |
| 08 | [08-design-system.md](08-design-system.md) | 디자인 토큰·컬러·타이포·레이아웃·컴포넌트·버튼 어포던스 |
| 09 | [09-tech-stack.md](09-tech-stack.md) | 기술 스택·개발 환경·배포 정책 |
| 10 | [10-roadmap.md](10-roadmap.md) | 로드맵·Phase·통합 이력·검증 기준 |

### 기능별 명세 (Feature Spec)

01~10은 횡단(횡적) 카테고리, 11~는 추출본에서 추가로 만들어지는 도메인 기능 단위 명세이다.

| # | 파일 | 다루는 내용 |
|---|------|----------|
| 11 | [11-grading-hub.md](11-grading-hub.md) | 채점 허브 — AI 초안 + 교사 검수 + 루브릭 재학습 (`/teacher/grading`) |
| 12 | [12-student-assignment-solve.md](12-student-assignment-solve.md) | 학생 과제 풀이 — 클래스봇 내부 자급 워크스페이스 (`/classbot/assignment/*`) |
| 13 | [13-reports-and-emotion-checkin.md](13-reports-and-emotion-checkin.md) | 리포트 6종 + 감정 체크인 + 웰빙 지수 + 학부모 발송 (`/teacher/reports`, `/classbot/wellness`) |
| 14 | [14-teacher-assignment-workspace.md](14-teacher-assignment-workspace.md) | 교사 과제 생성·발사 워크스페이스 — E2E 사이클의 진입점 (`/teacher/assignment/new`) |

## 참고 자료

- `input/docs-archive/` — 이전 11개 마스터/핸드오프 원문 (영구 보존, read-only)
- `input/storyboard-archive/` — 라이브러리 스토리보드 원문
- `input/design-prototype/` — 초기 React 프로토타입 (`pullim-study-demo-design/`의 사본)
- `proc/plan/` — 일자별 작업 계획·이력
- `proc/archive/` — 완료된 plan 격리

## 갱신 정책

- 명세 변경 시 `/update-spec`을 호출해 본 디렉토리만 수정
- 신규 명세는 `/create-spec`로 생성 (완전 신규 영역에 한정)
- 작업 계획은 `/update-plan`으로 `proc/plan/`에 누적

## 변경 이력

- **2026-05-06**: 기존 `docs/` 11개 문서 + `pullim-study-screens` 스킬을 본 spec으로 합성 (역설계 마이그레이션)
- **2026-05-06**: UX/디자인 베이스라인 보강 — `04 § 6.6` 오버플로 처리 규칙 신설, `08 § 7.3` 버튼 어포던스 규칙 신설, `07 § 5.2` 학술 기호·약어 매핑 추가, `07 § 6` UX writing(한자어 정책) 신설. 트리거: `/q/infinity/solve` 시험 모드 다이얼로그 viewport 초과 버그, `/q/review` "정복 세트 풀이" 버튼 어포던스 미달, θ 등 학술 기호 노출 + 한자어("잔존" 등) 사용성 이슈.
- **2026-05-07**: 명세 회귀 사례 closing — `04 § 6.6.3/6.6.4` (오버플로·다이얼로그 footer cleanup), `08 § 7.3.5` (버튼 어포던스 회귀: Q·라이브러리·클래스봇·플래너 처리 완료), `07 § 5.2` (학술 기호 회귀: 2026-05-06 시점 5건 + 2026-05-07 시점 신규 도메인 발견 처리 완료) 갱신. [2026-05-07 spec-regression-closing plan](../archive/2026-05-07_spec-regression-closing.md).
- **2026-05-11**: 추출본 누락 영역 명세 신설 — `11-grading-hub.md` (채점 허브), `12-student-assignment-solve.md` (학생 과제 풀이 — Q 도메인 의존 제거 + 클래스봇 내부 자급), `13-reports-and-emotion-checkin.md` (리포트 + 감정 체크인 + 웰빙 지수). 권위 문서 `07_풀림_클래스봇_핸드오프.md` § 4.1·4.7·4.8·4.9 기반. 우선순위는 채점 허브 → 풀이 → 리포트 순.
- **2026-05-11**: 브랜드 표면 명칭 정렬 — `07 § 1` (서비스명/슬로건/미션 표 재구성: 모브랜드 "풀림" / 표면 "풀림 클래스봇" 분리), `07 § 1.4` (메타데이터 표준 신설 — title·description·OG·manifest 단일 진실원), `02` 추출본 컨텍스트 박스 추가. 트리거: Vercel 임베드에 "풀림 스터디" 노출. [plan 2026-05-11_brand-classbot-metadata](../archive/2026-05-11_brand-classbot-metadata.md).
- **2026-05-11**: E2E 진입점 명세 신설 — `14-teacher-assignment-workspace.md` (교사 과제 생성·발사 워크스페이스). spec 11/12/13이 사이클 후반을 채웠다면 14는 시작점. mock store(Zustand + localStorage) 기반으로 백엔드 없이 끝에서 끝까지 시연 가능하도록 설계. 권위 문서 Flow C 1단계 구체화.
- **2026-05-19**: 클래스봇 사적 디자인 감사 22개 항목(P0~P3) SPEC 반영 — 출처 `input/design-system/private-classbot.md` + 통합 시스템 v0.1 (`DESIGN_SYSTEM.md` / `tokens.css`). 4개 SPEC 갱신:
  - **08-design-system.md** — § 1.2.1 메타 컬러 사용 가이드(#97A0B4 vs #6B7489), § 3.5 8단계 타이포 토큰, § 4.1 radius 3+pill 통일 권고, § 5.1 포커스 링 토큰, § 10.1~10.3 모션 토큰 + reduced-motion, § 12 a11y 보강(hit-area·skip-link·aria-label), § 15 챗봇 도메인 디자인(메시지 버블 3 variant·시간 디바이더·메시지 타입 6종·시그니처 모션 9종·LIVE 카드·봇 스위처·봇 메타 카드·과제 카드 상태별 컬러·입력바·신규 컴포넌트 10개)
  - **07-branding.md** — § 3.2 DON'T에 Scope/Tier 코드 금지 추가, § 4.6.1 봇별 시그니처 인사·§ 4.6.2 봇 5종 단일 진실원 표·§ 4.6.3 시간대별 인사, § 4.10 클래스봇 온보딩 학생 시선 카피, § 5.3 Scope L1~L5·Tier T1~T3 학생 노출 룰 신설, § 8 체크리스트 § 5.3 항목 추가
  - **04-ux-flow.md** — § 9 클래스봇 UX 패턴 신설 (홈 4블록 우선순위·봇 카드 정보 보강·봇 메타 카드 collapse·봇 스위처 칩·**모바일 키보드 visualViewport sticky Critical**·빠른 칩 동적 추천·입력바 첨부/음성·메시지 그루핑·첫 응답 personalization·LIVE/리플레이/16:9 썸네일·온보딩 인터랙티브 데모·브레드크럼 자동 dedupe·22개 항목 P0~P3 매핑 표)
  - **13-reports-and-emotion-checkin.md** — § 3.3.3 웰빙 허브에 담당 봇 코멘트 카드, § 3.3.4 체크인 사후 봇 반응, § 9.1.2 7일 막대 컬러 매핑, § 9.2 5지표 펼침 패턴, § 9.3 담당 봇 코멘트 카드 토큰, § 9.4 풀림 무드 이모지 셋(P3), § 9.5 신규 컴포넌트 2종 추가
- **2026-06-02**: auth(이메일/비밀번호 + JWT) 머지 정합 — Ph7/Ph8 조기 인도 + TypeORM·Drizzle 마이그레이션 공존을 spec에 반영. 출처: auth PR #87(shared)/#88(BE)/#89(FE). **컨트롤타워가 수용한 예외**(Ph8 결정·Ph7 데이터 레이어가 일정보다 먼저 인도)를 문서 레벨에서 기록 — 사용자/G1 비준 대기. 4개 SPEC 갱신:
  - **2026-05-18_be-api-design.md** — §5 Ph7(fetch 데이터 레이어 조기 인도)·Ph8(결정·인도 완료) 상태 갱신, §3 인증 컨벤션에 `/auth/*` JWT 명시, §6 결정보류 해소 표시, **§6.1 Ph8 인증 인도 결정**(자체 구현·`auth_*` 테이블·서명 매요청 검증·admin 부여 차단·refresh 회전+블랙리스트) + **§6.2 Drizzle+TypeORM 마이그레이션 공존 노트**(경계·근거·후속 통합 플래그) 신설
  - **05-business-rules.md** — § 11.1 세션을 "JWT access/refresh 자체 구현"으로 구체화(미상세 placeholder 해소)
  - **09-tech-stack.md** — § 14 데이터 저장에 auth 백엔드(NestJS+TypeORM) 인도 사실 + ORM 공존 행 + 토큰 블랙리스트 Redis→Postgres 비고 추가
- **2026-08-24**: 봇 빌더(`/teacher/builder`) **8단계 위저드 → 한 길 · 세 마당** 재편을 **확정 설계로 기록**. 구현은 **PR #223 이 인도 중**이고 `dev` 시점 코드는 아직 8단계 위저드다 — 갱신된 절마다 그 상태를 명시했고, #223 머지 후 상태 표기를 지운다. 문서가 8단계를 못 박고 있어 #223 이 「명세 회귀」로 읽히던 상태를 푸는 것이 목적. 갱신 범위:
  - **03-features-and-ia.md** — § 2.2 사이트맵 한 줄, **§ 4.3 전면 개정**(마당 셋 + 만든 뒤 화면 · 8→3 대응표 · 설계 원리 2가지 · 「없어진 것」 · **「교사가 참여 코드를 확인·공유하는 자리」**). 다른 문서가 「빌더 § N 단계」로 가리키던 자리는 이 대응표를 경유해 읽는다
  - **04-ux-flow.md** — UC-T1 2·3단계 (배포 관문 → 만든 뒤 화면, 빌더발 코드 생성·링크·QR 는 미구현 명시)
  - **05-business-rules.md** — § 10.1 봇 이름·답 범위·루브릭 3행 (루브릭은 빌더에서 과제 출제로 이관)
  - **07-branding.md** — § 4.7 빌더 시작 마이크로카피
  - **09-tech-stack.md** — § 앱 트리 `builder/page.tsx` 주석
  - **10-roadmap.md** — § 2.1 봇 빌더 행 + § 트리 1.4
  - **12-student-assignment-solve.md** — § 5.1 Scope 우선순위 (정하는 자리는 봇 설정으로 옮겼고, 풀이 화면이 그 값을 **소비하는 경로는 미구현**임을 갈라 적음)
  - **13-reports-and-emotion-checkin.md** — § 5.1 웰빙 가중치 · § 5.4 학부모 자동 승인 정책 · § 연계 표. 「빌더 § 7 (안전)」 소유를 봇 설정(`/teacher/settings`)으로 옮김. 셋 다 **미구현**이며 빌더에도 없었다
  - **14-teacher-assignment-workspace.md** — § 1 · § 2.2 G4 · § 3.1 M2·C2·C4 · 문항/필드 표 · 카피 · § 3.2 진입점. 빌더 산출물 소비 범위를 **실제 구현(단원 하나)** 으로 좁힘 — 모드는 고정 기본값이고 톤·답 범위는 소비하지 않는다
  참여 코드 — 배포 관문을 없앤 뒤 「교사가 학생에게 무엇을 주나」를 03 § 4.3 에서 못 박았다: **코드는 반에 붙으므로 확인·공유 자리는 빌더가 아니라 봇 운영 화면(`/teacher/classbot`)의 반 카드**. 현재 미구현이며(종전 8단계의 「8. 배포」도 코드를 보여주지 않았다 — 이번 재편이 만든 빈자리가 아니다) 반 카드 구현은 별도 과제.
  **`input/docs-archive/*` 는 이 PR 이 손대지 않는다.** 리포 `CLAUDE.md` 상 read-only 권위 묶음이라 갱신은 별도 승인·절차로 분리한다. 그래서 이 개정은 **`proc/spec/*` 안에서만** 유효하며, **권위 전환을 선언하지 않는다.**
  다만 충돌은 기록해 둔다 — `07_풀림_클래스봇_핸드오프.md` § 4.1(8단계 위자드)과 `05_풀림_수업방_세부기획.md` § 8.1 `Step 6: 학생 초대 → 코드/링크/QR 생성` · 체크리스트 「봇 빌더 위저드 (6단계)」는 이 개정과 **어긋난 채 남아 있다.** 두 문서를 읽는 사람은 그 사실을 알고 읽어야 한다. 갱신은 별도 PR 사안이다.
  함께 바로잡은 것 — 종전 문서가 **미구현을 구현된 것처럼** 적고 있던 것들. ① 「배포」 산출물의 코드·링크·QR — 학생의 참여 코드 입력 → enrollment 경로는 있으나(`lib/mock/class-codes.ts` + `joinClass()`), **빌더가 코드를 만들어 보여주는 흐름과 링크·QR 은 구현된 적이 없다** ② 루브릭 5축(빌더 로컬 state, 진실원 아님) ③ 임시저장(저장 없는 데모). 셋 다 #223 과 무관하게 `dev` 시점에도 사실이다.
