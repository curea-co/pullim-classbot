# 2026-05-14 — GitHub Actions production 회귀 워크플로우 (Vercel CLI 트리거 자동화 후속)

## 목표
어제 PR #35로 들어온 `proc/knowhow/2026-05-13_domain-extraction-and-vercel-deploy.md` 의 manual `bunx vercel --prod` 의존 부분을 GitHub Actions 자동 회귀로 묶는다. main push + 일일 schedule 양쪽에서 production hit하는 Playwright 검증을 자동화하고, 결과 링크를 knowhow에 cross-link.

## 배경
- daily_outcome 2026-05-14 산출물 C — "GitHub Actions 자동화 방향 확정".
- 어제 14:30 진행 보고에서 정정된 사실: Vercel 트리거가 "깨진" 게 아니라 main에 production deploy를 새로 안 한 상태였다는 것 → 자동 deploy는 GitHub ↔ Vercel 연동으로 이미 잡혀 있음. **이번 자동화 대상은 deploy가 아니라 "deploy 후 production hit Playwright 회귀"** 다.
- 현재 `.github/workflows/` 디렉토리 자체가 없음 → 신규 작성.

## 정책
- 워크플로우 이름: `prod-verify.yml`.
- 트리거:
  1. `workflow_dispatch` — 수동 실행. PR 본문에 빠르게 링크 걸 수 있게.
  2. `schedule: '0 23 * * *'` — KST 매일 08:00(UTC 23:00) production 회귀 1회.
  3. `push: branches: [main]` — main 머지 직후 1회. (Vercel 자동 배포 완료까지 60~120초 polling 후 hit.)
- 실행 단계:
  1. `actions/checkout@v4`
  2. bun setup (`oven-sh/setup-bun@v2`)
  3. `bun install --frozen-lockfile`
  4. `bun x playwright install chromium --with-deps`
  5. (push 트리거에 한해) production URL 헬스 polling — `curl -fI https://pullim-classbot.vercel.app` 200 떨어질 때까지 최대 5분.
  6. `PLAYWRIGHT_BASE_URL=https://pullim-classbot.vercel.app PROD_CAPTURE=1 bun x playwright test`
  7. 실패 시 `actions/upload-artifact@v4`로 trace + screenshots 업로드.
- **Vercel 토큰 secret 의존 없음**: 이 워크플로우는 Vercel API를 안 부르고 production URL에 직접 hit만 함. `VERCEL_TOKEN` 불필요 → C 블로커 그 자체가 해소되는 설계. (daily_outcome의 G1 컨펌 블로커 "Vercel 토큰 secret 등록"은 이 설계에선 필요 없음. 따라서 secret placeholder 단계 건너뛰고 바로 머지 가능.)

## 작업 항목

### A. 워크플로우 신규
- [x] `.github/workflows/prod-verify.yml` 작성 — 위 정책 그대로. Playwright 실패 시 artifact 업로드 step 포함.

### B. Playwright 기존 spec 호환성 확인
- [x] `tests/e2e/color-palette.spec.ts` 의 `PROD_CAPTURE=1` 분기 — production 경로 ok.
- [x] `tests/e2e/chat-greeting-by-bot.spec.ts` / `chat-quick-prompts-by-bot.spec.ts` — `PLAYWRIGHT_BASE_URL` 만 바뀌면 그대로 production hit.
- [x] B 작업(cb_004)이 머지된 직후엔 `slider-variants` / cb_004 추가 e2e가 production에서 fail 가능 — workflow는 그 시점 main에 있는 모든 spec을 돈다. 순서 보장: A → B → C 순으로 머지하면 C 머지 시점엔 A·B 모두 production에 반영되어 통과.

### C. knowhow cross-link 갱신
- [x] `proc/knowhow/2026-05-13_domain-extraction-and-vercel-deploy.md` — § 7 "Vercel 첫 배포의 함정" 또는 새 § 9 "이후 회귀 자동화" 추가:
  - main push / daily schedule에서 production hit 자동화는 `.github/workflows/prod-verify.yml` 로 분리.
  - Vercel 자동 배포(GitHub ↔ Vercel 연동)는 이미 webhook으로 잡혀있고, Actions는 검증만 책임.

### D. 검증
- [ ] PR 생성 후 `workflow_dispatch`로 1회 실행 → Actions 링크 + green 결과 확보.
- [ ] PR 머지 후 `push: main` 자동 트리거 1회 → 머지 직후 production 헬스 polling + Playwright pass 확인.

### E. 마무리
- [ ] dev/main PR 머지.
- [ ] daily_outcome 17:30 보고에 Actions 실행 링크 첨부.

## 정합성 검토 노트
- **Vercel 토큰 불요 설계 선택 이유**: 검증 대상이 "production URL 응답"이지 "Vercel project 상태" 가 아니라서. Vercel 배포 상태가 stale 인 경우(어제 정정된 케이스: main에 prod deploy 안 됨)는 어쨌든 prod URL hit이 옛 버전을 응답할 뿐 헬스는 200. **이 경우를 잡으려면 commit SHA 임베드 + assert 가 더 효과적**이고, 그건 후속 plan으로 분리.
- **push 트리거 polling 5분 한계**: Vercel 빌드가 5분 초과하는 경우 워크플로우는 fail. 추출본 size 기준 빌드는 ~40s 라 여유 있지만, 라우트가 늘면 timeout 상향 필요.
- **schedule 일일 회귀**: production 색 hue, chat 봇별 분기, slider variant 가 일일 회귀 대상. 회귀 fail 시 Slack/PR 알림은 다음 사이클로 분리 (현재는 Actions 페이지에서 확인).

## 완료 기준
- [ ] `.github/workflows/prod-verify.yml` 머지
- [ ] `workflow_dispatch` 1회 실행 green 캡처 + Actions 링크
- [x] knowhow doc cross-link 갱신 (§ 8 신규)

## 블로커 처리
- 원래 daily_outcome에 명시된 G1 블로커 "Vercel 토큰 secret 등록 권한"은 본 plan의 토큰-불요 설계에서는 해당 없음. 회귀 spec이 Vercel API 가 아닌 production URL hit만 사용. (G1 컨펌 후 토큰 기반 설계로 바꾸려면 후속 plan으로 분리.)
