@AGENTS.md

# 풀림 클래스봇 단일 추출본 — 작업 가이드

이 프로젝트는 **풀림 스터디 데모(`260506 pullim-study-demo`)** 에서 **풀림 클래스봇 도메인만** 떼어 낸 SPARK + IPO 하네스 템플릿입니다.

원본의 6 도메인(스튜디오/스토어/플래너/Q/클래스봇/라이브러리) 중 **클래스봇만 살아 있고**, 나머지 도메인의 페이지·컴포넌트·mock·라우트는 모두 제거됐습니다. 사이드바·하단탭·역할 전환(GNB)도 클래스봇/빌더 라우트만 노출하도록 좁혀져 있습니다.

## 1. 살아 있는 영역

| 구분 | 경로 | 비고 |
|---|---|---|
| 학생 라우트 | `src/app/(student)/classbot/{,chat,discover,replay,replay/[id],onboarding}` | 5 페이지 + 동적 1 |
| 학생 루트 | `src/app/(student)/page.tsx` | `/classbot`로 즉시 redirect — 6 도메인 홈은 사라짐 |
| 교사 라우트 | `src/app/(teacher)/teacher/{,classbot,builder}` | 홈/내 클래스봇/봇 빌더 3 페이지 |
| 도메인 컴포넌트 | `src/components/classbot/*`, `src/components/builder/*` | 13 파일 |
| 공유 셸 | `src/components/shell/*` | Role = `student | teacher` (parent 분기 제거, CoachFab 제거) |
| 공유 UI | `src/components/ui/*`, `src/components/brand/*` | shadcn 프리미티브 |
| 도메인 mock | `src/lib/mock/{persona,family,tutor,classbot,chat}.ts` | tutor는 `ScopeLevel` 유지용, chat은 원본 `phase1.ts`에서 클래스봇 채팅만 발췌 |
| 토큰 / 유틸 | `src/lib/tokens/*`, `src/lib/utils.ts` | |

## 2. 사라진 영역 (작업 시 의식할 것)

다음은 **이 저장소에 존재하지 않습니다.** 클래스봇 안에서 다른 도메인을 참조하는 코드를 새로 쓰지 말 것:

- 플래너 / Q(무한풀기·코치·분석·복습) / 라이브러리 / 스튜디오 / 스토어 페이지·컴포넌트
- 보호자 영역(`(parent)/parent/*`), `currentParent` UI 분기 (mock의 `family.ts`는 type만 살려둠)
- `lib/mock/{features,domains,planner,coach,tutor 본체,conqueror,infinity,memory,irt,xray,visual,phase1(채팅 외),subscriptions,billing,parent-notifications}`
- `components/{planner,planner-builder,planner-manage,infinity,coach,tutor,conqueror,memory,study-index,xray,visual,parent,study}` — 학생 홈 카드 위젯(`study/*`)도 함께 제거됨
- 공유 셸 중 `coach-fab.tsx` — `/q/talk` 의존 → 삭제

## 3. SPARK + IPO 하네스 구조

```
project/
├── input/           # 입력·참고 데이터 (클래스봇 마스터 문서만 보존)
│   ├── docs-archive/  # 00 기능기획, 03 스터디, 04 종합, 05 수업방, 07 클래스봇 핸드오프
│   └── design-prototype/
├── proc/            # 명령 처리 규칙 (SPARK)
│   ├── spec/          # 00~10 마스터 spec (도메인 비종속)
│   ├── plan/          # 작업 계획
│   ├── archive/       # 비활성 문서 — 클래스봇/셸 글로벌만 보존
│   ├── research/      # 조사 (비어있음 — 원본은 모두 다른 도메인이라 누락)
│   └── knowhow/       # 재사용 프롬프트
├── output/          # 출력 데이터
├── src/             # 소스 코드
├── .claude/         # Claude Code skills 설정
├── README.md        # SPARK + IPO 템플릿 설명 (원본 그대로)
├── AGENTS.md        # Next.js 에이전트 룰
└── CLAUDE.md        # 이 문서 — 클래스봇 추출본 가이드
```

## 4. 권위 문서 (read only)

- `input/docs-archive/07_풀림_클래스봇_핸드오프.md` — **클래스봇 도메인 권위 문서**. 변경 작업 전에 반드시 참조.
- `input/docs-archive/05_풀림_수업방_세부기획.md` — 수업방·라이브 세션 RBAC·Scope 정책.
- `input/docs-archive/04_풀림_종합_마스터.md` — 풀림 전체 IA (현재 추출본은 그중 클래스봇만 구현).
- `input/docs-archive/03_풀림_스터디_마스터.md` — 학생 영역 공통 톤·UX.
- `input/docs-archive/00_풀림_기능기획_Skill.md` — 기획 작성 가이드.

## 5. 작업 컨벤션

추출본이라 락인 도메인이 한 개뿐 — 모든 편집은 클래스봇 단일 도메인 범위.

**해도 되는 것**
- `src/app/(student)/classbot/*`, `src/app/(teacher)/teacher/{classbot,builder}/*` 페이지·컴포넌트·mock 수정·신규
- 클래스봇 import 경로 갱신, 클래스봇 onboarding 페이지/UX 작업
- 공유 셸(`components/shell/*`)·UI 프리미티브(`components/ui/*`) **read**

**확인 후에만 (사용자 명시 동의 필요)**
- 공유 셸 / UI / nav-config 수정 — 클래스봇 한 도메인만 쓰는 상황이라 보통 안전하지만, role/nav 변경은 보고 후 진행
- 사라진 다른 도메인의 mock/페이지 복원 — 원본을 다시 가져와야 하는 경우 사용자에게 보고

**하면 안 되는 것**
- 다른 도메인(플래너/Q/라이브러리 등) 코드를 새로 작성 — 추출본 범위 외. 필요하면 원본 풀림 스터디 데모 저장소에서 작업하기를 권장.

## 6. 검증

```bash
bun install
bun x tsc --noEmit          # 타입 검사
bun run build               # 정적 생성 16 라우트 확인
bun dev                     # http://localhost:3030/classbot
```

원본의 6 도메인 라우트(`/planner`, `/q`, `/library`, `/parent` 등)는 모두 404가 정상입니다.
