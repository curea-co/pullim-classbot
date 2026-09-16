# 클래스봇 완성 계획 — PR 0 ~ PR 8 (+ PR 4-ci)

> **spec**: [`proc/spec/2026-09-16_classbot-completion-design.md`](../spec/2026-09-16_classbot-completion-design.md) (설계 정본 · 사용자 승인 2026-09-16).
> **시각화 원본**: `output/2026-09-16_classbot-completion-plan.html`(v3 · 미추적) · 아티팩트 https://claude.ai/code/artifact/ee808b01-1819-44f0-bc25-b0a67173b328
> **상태**: 착수. 리포 최상위 규칙 둘(FE/BE 분리 · 전부 `dev` 경유)을 지킨다. pullim-api 쪽 PR 은 그 리포의 `dev` 로.

**Goal:** 요구 11개(R0~R11)가 **배포된 dev·prod 에서 서버까지 간다.** 지금은 로컬 DB + 개발 쿠키에서만 다섯이 서버까지 가고, 배포에서는 전부 목이다.

## 결정 (2026-09-16 · 사용자)

- **BE 정본은 pullim-api `src/classbot`**(ADR-063 · 봇 분리는 ADR-091 `[예정]` `docs/design/_platform/adr/ADR-091-classbot-bots-분리.yaml` — pullim-api 브랜치 `docs/classbot-classroom-spine`, PR 승인 대기). 이 리포의 `app/api/**` + Drizzle 은 겹치는 것부터 은퇴.
- ① 겹치는 라우트·표(반·봇·챗·과제)만 은퇴 — 범위 밖 계열은 「로컬 전용」으로 남긴다
- ② 비로그인 데모 통과는 코어 화면에서 닫는다 — 소개·랜딩만 공개
- ③ `bots` 표로 봇과 반을 갈라낸다 — 반은 `bot_id` 로 가리킨다
- ④ 「봇 대화」는 레일에서 「내 수업방」 아래 한 단계 — 경로 `/classbot/chat` 유지
- ⑤ 위험 감지 1차는 규칙 다섯 + 위기 키워드 — 주제 이탈·강도 설정은 2차
- ⑥ 학부모·기관은 범위 밖 — 학생으로 위장시키던 매핑만 걷는다
- 남은 모순 일곱은 권장안으로 해소(설계 § 0.1) — prod-verify 두 레인 · 학부모 트리 비활성 · 챗 단위 = 반 · 루트 가이드 BE 절 · 명단 표시명은 auth 읽기 전용 투영 포트 · 로컬 `classbot.pullim.local` · PR 4 는 있는 문만

## PR 목록 (「←」는 먼저 머지돼야)

### 문서
- [ ] **PR 0** · 이 리포 · docs — 설계 정본 + 03 § 2.1·2.2·2.3 · 05 § 3·11.1·11.2·11.3 · 2026-07-03 amendment · `apps/classbot/CLAUDE.md` § 5 · 루트 `CLAUDE.md` § 1·§ 2. **코드 무변경.**
- [ ] **PR 0** · pullim-api · docs — `authz.md` 교사 대화 열람(operator read) · `data-model.md` `bots`·`risk_signals`·`classes.bot_id`·`messages.bot_id`·`join_codes.expires_at`

### pullim-api (그 리포 `dev`)
- [ ] **PR 1** · schema — `bots` · `classes.bot_id` · `messages.bot_id` · `risk_signals` · `join_codes.expires_at` · `class_bot_profiles → bots` 이행 · `PersonaInput` 조인 교체. 엔티티·리포지토리만 ← PR 0
- [ ] **PR 2** · routes A — `POST /classes` · `GET /classes/:id/members` · `POST/PATCH /bots` · `PUT /classes/:id/bot` · 참여 만료 410 · 재발급 시 옛 코드 삭제 · `GET /assignments?audience=teacher&classId=` ← PR 1 · 단위 테스트 필수
- [ ] **PR 3** · routes B — `GET /classes/:id/chat?student=` · `GET /classes/:id/signals` · `PATCH /signals/:id/ack` · 챗 저장 훅 규칙 다섯 ← PR 1 (PR 2 와 병렬)

### 이 리포 (`dev`)
- [ ] **PR 4-ci** · ci — prod-verify 두 레인(익명 · 로그인) ← PR 0 · **PR 4 보다 먼저** · 워크플로 편집 승인 2026-09-16
- [ ] **PR 4** · FE 신원 — RoleGuard 공개 경로 목록 · `mapRole` 정리 · 안내 한 장 · 플래그 둘 제거 · 있는 문의 훅만 `domainFetch` 로 ← PR 0 · PR 4-ci
- [ ] **PR 5** · FE 수업방 — `/teacher/classroom/[id]` 껍데기 + 명단·봇 탭 · 반 카드 봇 칸 · 반·명단·봇 할당 훅 · 학생 레일 중첩 · 챗 단위 = 반 · SSE + 기록 + 고지 · 목 참여 폴백 제거 ← PR 2 · PR 4
- [ ] **PR 6** · FE 과제 — `questions[]` · 서버 문항 · `/submit` · 점수 · `useTeacherAssignments` · `/submissions` · `pullim-assignments` persist 은퇴 ← PR 3 · PR 4 · e2e test 블록 41(sso 제외 · 파일 10) 전환은 별도 스펙 트랙
- [ ] **PR 7** · FE 모니터링 — 「대화」 탭 · 학생별 기록 뷰어 · 신호 배지·확인 · 관제소 목 표 은퇴 ← PR 3 · PR 5
- [ ] **PR 8** · 정리 — B 세계 은퇴(겹치는 `app/api/**` · Drizzle 표 · 시드 · 개발 쿠키 경로 · `lib/mock` 반·봇·챗·과제 · 스토어 persist) ← PR 5 · 6 · 7 · **맨 마지막**

### 사람 액션 (설계 § 9)
- [ ] OS 복귀 허용목록 `dev-classbot.pullim.ai` · `classbot.pullim.ai`
- [ ] Vercel env `NEXT_PUBLIC_OS_URL` · `NEXT_PUBLIC_OS_API_URL`
- [ ] pullim-api CORS 두 오리진 · dev→main 승격 요청
- [ ] dev-os Deployment Protection 우회([`2026-07-05_m0-infra-reassessment.md:38`](2026-07-05_m0-infra-reassessment.md)) · OS 테스트 계정 시크릿(로그인 레인)

```
PR 0 ─┬─→ PR 1 ─┬─→ PR 2 ─────────┬─→ PR 5 ─┬─→ PR 7 ─┐
      │         └─→ PR 3 ───┬─────┤         │         ├─→ PR 8
      └─→ PR 4-ci ─→ PR 4 ─┴─────┴─→ PR 6 ─┴─────────┘
```

**Global constraints:** 한 PR = 한 계층 · base 는 항상 `dev` · 문서 PR 이 먼저 머지된 뒤 코드 PR(리뷰가 base 스펙을 본다) · 학생 화면 카피는 한자어 없이(고지 문구 「선생님이 이 대화를 볼 수 있어요」) · `x-build-sha` meta 와 `PLAYWRIGHT_BASE_URL ?? …` 패턴은 깨지 않는다.
