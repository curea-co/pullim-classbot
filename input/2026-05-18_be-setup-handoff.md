# 풀림 플래너 BE 셋업 · 핸드오프

> **문서 버전**: v1.0 · 2026-05-18
> **대상 독자**: BE 작업을 이어받을 개발자(+ 미래의 자기 자신)
> **선행 문서**: [`proc/spec/2026-05-18_be-api-design.md`](../proc/spec/2026-05-18_be-api-design.md) (API 설계) · [`proc/research/2026-05-18_be-setup-guide.md`](../proc/research/2026-05-18_be-setup-guide.md) (셋업 가이드)
> **권위 문서(IA)**: [`input/docs-archive/08_풀림_플래너_핸드오프.md`](../input/docs-archive/08_풀림_플래너_핸드오프.md)

---

## 1. 한 줄 요약

플래너 도메인을 위한 **로컬 BE 인프라**(PostgreSQL on Docker + Drizzle ORM on Next.js API routes)를 깔고, mock 데이터를 그대로 DB에 시드하는 단계까지 완료. **FE 코드는 아직 mock에 붙어 있다** — API 교체는 Ph7에서.

---

## 2. 오늘 한 일 (2026-05-18)

| Phase | PR | 내용 |
|---|---|---|
| **Ph1** | [#18](https://github.com/curea-co/pullim-planner/pull/18) | Drizzle 스키마 9 테이블 · Docker Compose · API spec · setup guide |
| **Ph2** | [#19](https://github.com/curea-co/pullim-planner/pull/19) | mock → DB seed 스크립트 (`bun run db:seed`, idempotent) |

### Ph1 산출물
- [`drizzle.config.ts`](../drizzle.config.ts) — Drizzle Kit 설정
- [`docker-compose.yml`](../docker-compose.yml) — Postgres 16-alpine 단일 서비스
- [`src/lib/db/schema.ts`](../src/lib/db/schema.ts) — 9 테이블 + relations + 추론 타입
- [`src/lib/db/index.ts`](../src/lib/db/index.ts) — Pool client (Next.js hot reload 누수 방지용 `globalThis` cache)
- [`drizzle/0000_woozy_forgotten_one.sql`](../drizzle/0000_woozy_forgotten_one.sql) — 초기 마이그레이션
- [`.env.example`](../.env.example) — `DATABASE_URL` 템플릿

### Ph2 산출물
- [`scripts/seed.ts`](../scripts/seed.ts) — 9 테이블 idempotent seed

---

## 3. 아키텍처 — DB만 Docker, BE는 host

```
┌─── 개발자 머신 (host) ───┐
│  Next.js dev (bun run dev :3030)
│    ├─ FE pages /planner/*
│    ├─ API routes /api/*       (Ph3~ 구현 예정)
│    └─ drizzle-kit (generate/migrate/studio)
│           │ pg connection
│           ▼
│  Docker Engine
│    └─ pullim-postgres (Postgres 16-alpine, :5432)
│       volume: ./.docker/postgres   (gitignored)
└──────────────────────────┘
```

**왜 이렇게**
- **DB만 컨테이너**: 버전 고정 · 데이터 격리 · 팀 환경 동일. 컨테이너 재시작이 코드에 영향 0.
- **BE는 host bun**: hot reload 즉시(ms), IDE 디버거 그대로.
- `bun run db:*`는 모두 `docker compose` 또는 `drizzle-kit` 호출 wrapper일 뿐.

자세한 배경은 [setup guide §0](../proc/research/2026-05-18_be-setup-guide.md).

---

## 4. 새 환경에서 처음 한 번 (setup)

```bash
# 1. 의존성
bun install

# 2. 환경 변수
cp .env.example .env.local

# 3. Docker daemon 켜기 (Docker Desktop 또는 OrbStack 실행 중이어야 함)
open -a Docker        # 또는 OrbStack

# 4. DB 컨테이너 + 스키마 + 시드
bun run db:up         # postgres 컨테이너 기동
bun run db:migrate    # 9 테이블 생성
bun run db:seed       # mock 데이터 삽입

# 5. (선택) Studio 또는 dev server
bun run db:studio     # 테이블 GUI, https://local.drizzle.studio → :4983
bun run dev           # FE + (Ph3 이후) API, http://localhost:3030
```

---

## 5. 명령어 cheatsheet

| 명령 | 설명 | 자주 쓰는 빈도 |
|---|---|---|
| `bun run db:up` | postgres 컨테이너 시작 | 매일 |
| `bun run db:down` | 컨테이너 종료(데이터 유지) | 가끔 |
| `bun run db:reset` | 컨테이너 + 볼륨 모두 삭제 후 재기동 | 스키마 깨졌을 때 |
| `bun run db:generate` | `schema.ts` 변경분으로 마이그레이션 SQL 생성 | 스키마 수정 시 |
| `bun run db:migrate` | 생성된 SQL을 DB에 적용 | 스키마 수정 시 |
| `bun run db:push` | SQL 생략하고 직접 sync(**dev only**) | 빠른 prototyping |
| `bun run db:seed` | mock → DB 시드 (TRUNCATE 후 재삽입) | 데이터 리셋 시 |
| `bun run db:studio` | DB GUI | 데이터 눈으로 볼 때 |
| `bun run dev` | Next.js dev | 매일 |

---

## 6. DB 스키마 한눈에

9 테이블 — 의존 관계:

```
users ─┬─→ planners ─┬─→ planner_subject_units
       │             └─→ time_blocks ─→ block_completions
       │                       └─→ curriculum_nodes (set null)
       ├─→ daily_conditions
       └─→ burnout_snapshots

curriculum_nodes (self-ref tree, 6 과목 × 3 depth)
pedagogy_engines (정적 seed, 7건)
```

### 주요 invariant
- **`planners`** — 한 사용자당 `active=true AND archived=false` 행은 **단 1행**. partial unique index 적용. ([schema.ts:83-86](../src/lib/db/schema.ts#L83-L86))
- **`block_completions.blockId`** — `time_blocks.id`와 1:1 (PK).
- **`daily_conditions` / `burnout_snapshots`** — 하루 단위 PK `(user_id, date)`.
- **`time_blocks.curriculum_node_id`** — 노드 삭제 시 `set null` (블록은 살아 있어야 함).

전체 정의는 [`src/lib/db/schema.ts`](../src/lib/db/schema.ts) · 모델 표는 [API spec §2](../proc/spec/2026-05-18_be-api-design.md).

---

## 7. seed가 넣는 데이터 (스냅샷 기준일: 2026-04-24 목)

| 테이블 | 건수 | 비고 |
|---|---|---|
| `users` | 1 | 서연 (`student_001`) — `currentPersona` |
| `pedagogy_engines` | 7 | 7대 학습과학 엔진 (정적) |
| `curriculum_nodes` | 151 | 6 과목 × 3 depth, depth 순서로 삽입(FK 만족) |
| `planners` | 3 | 6월 모의평가(active) · 1학기 기말 · 4월 학평(archived) |
| `planner_subject_units` | ~30 | 각 플래너의 단원 리스트 |
| `time_blocks` | 8 | `pl_001` 기준 오늘(2026-04-24)의 블록 |
| `block_completions` | 2 | `status='done'`인 블록만 |
| `daily_conditions` | 1 | 오늘 컨디션 |
| `burnout_snapshots` | 1 | 오늘 번아웃 점수 |

seed는 **idempotent** — 매 실행마다 9 테이블 TRUNCATE RESTART IDENTITY CASCADE 후 재삽입.

> ⚠️ mock의 `todayBlocks` 중 일부는 curriculum 트리에 없는 임의 id(예: `'math.calc'`)를 참조한다.
> seed는 메모리에 `Set<curriculum_node_id>`를 만들어 두고 없는 id는 `null`로 떨어뜨린다 ([scripts/seed.ts](../scripts/seed.ts) 참조).

---

## 8. 자주 부딪히는 이슈 (오늘 실제로 겪음)

| 증상 | 원인 | 조치 |
|---|---|---|
| `docker.sock: no such file` | Docker daemon 안 떠 있음 | `open -a Docker` 후 메뉴바 아이콘이 안정될 때까지 대기 |
| `Conflict. container name "/pullim-postgres" is already in use` | 이전(또는 다른 프로젝트)에서 만든 동명 컨테이너 잔존 | `docker ps -a --filter name=pullim-postgres`로 이미지·상태 확인 → 우리 게 아니면 `docker rm pullim-postgres` |
| `DATABASE_URL is not set` (seed) | `.env.local` 미생성 | `cp .env.example .env.local` |
| `violates foreign key constraint "time_blocks_curriculum_node_id_..."` | mock의 임의 curriculum id 참조 | seed에서 Set 검증 후 `null` (이미 적용됨, [scripts/seed.ts](../scripts/seed.ts)) |
| Drizzle Studio "Connecting…" 무한 스피너 (Safari/Brave) | localhost 자체서명 인증서 차단 | `brew install mkcert` → `mkcert -install` → studio 재시작. Chrome/Arc/Firefox는 그냥 됨 |
| Next.js connection pool 누수 (hot reload) | dev 모드에서 module re-eval 시 Pool 중복 생성 | [`src/lib/db/index.ts`](../src/lib/db/index.ts)의 `globalThis` cache가 처리 |

---

## 9. 다음 차례 — Phase 3 (read endpoint)

[`proc/spec/2026-05-18_be-api-design.md` §5](../proc/spec/2026-05-18_be-api-design.md) 로드맵 참조.

### 구현 대상

| 메서드 · 경로 | 의미 | DB 쿼리 힌트 |
|---|---|---|
| `GET /api/me` | 현재 사용자 (헤더 `x-user-id`, Ph8 전엔 mock) | `db.select().from(users).where(eq(users.id, userId))` |
| `GET /api/planners` | 내 플래너 목록 | `where(eq(planners.userId, userId))` |
| `GET /api/planners/{id}` | 플래너 상세 + subject units | join 또는 별도 fetch |
| `GET /api/planners/{id}/blocks?date=YYYY-MM-DD` | 특정 날짜 블록 (+ completion) | `where(and(eq(...), eq(date, ...)))`, left join block_completions |
| `GET /api/me/condition?date=...` | 오늘 컨디션 | `dailyConditions` PK 조회 |
| `GET /api/me/burnout?date=...` | 오늘 번아웃 | `burnoutSnapshots` PK 조회 |

### 권장 작업 흐름
1. `src/app/api/me/route.ts` 부터. 가장 단순(테이블 1개).
2. 그 다음 `planners` → `blocks` 순.
3. 응답 형식은 [API spec §3](../proc/spec/2026-05-18_be-api-design.md) 정의를 따른다.
4. 헤더 `x-user-id`가 없으면 `student_001`로 fallback (Ph8까지 유지).
5. 검증: `curl -H "x-user-id: student_001" http://localhost:3030/api/me`.

### 이후
- **Ph4**: planner CRUD + active 단일 invariant 유지 (트랜잭션)
- **Ph5**: 블록 상태 전이 (`todo → doing → done|skipped`) + completion meta
- **Ph6**: 리포트 집계 (mock 함수 → SQL aggregate)
- **Ph7**: FE의 `from '@/lib/mock'` import를 `fetch('/api/...')`로 점진 교체
- **Ph8**: 인증 (NextAuth 또는 self-rolled — 결정 필요)
- **Ph9**: prod DB (Neon/Supabase/RDS 중 결정)

---

## 10. 관련 파일 한눈에

```
pullim-planner/
├── docker-compose.yml                          # Postgres 컨테이너 정의
├── drizzle.config.ts                           # Drizzle Kit 설정
├── .env.example                                # DATABASE_URL 템플릿
├── drizzle/
│   ├── 0000_woozy_forgotten_one.sql           # 초기 마이그레이션
│   └── meta/                                   # snapshot, _journal
├── scripts/
│   └── seed.ts                                 # mock → DB seed
├── src/lib/db/
│   ├── schema.ts                               # 9 테이블 + relations
│   └── index.ts                                # Pool + drizzle client
├── proc/
│   ├── spec/2026-05-18_be-api-design.md        # 9 entity · 24 endpoint · 9-phase roadmap
│   └── research/2026-05-18_be-setup-guide.md   # 셋업 디테일 + 트러블슈팅
└── output/
    └── 2026-05-18_be-setup-handoff.md          # ← 이 문서
```

---

## 11. 한 발짝 더 — 미해결·결정 보류

- **인증 전략 (Ph8)**: NextAuth.js v5 vs lucia-auth vs 자체 구현. 미결.
- **prod DB 선택 (Ph9)**: Neon(serverless Postgres) / Supabase / RDS. 미결.
- **마이그레이션 정책**: 현재는 `drizzle-kit migrate`로 dev/prod 동일. prod에선 별도 release flow 필요.
- **Connection pooling (prod)**: 현재 `pg.Pool max=10`. serverless 환경(Vercel)에선 pgbouncer 또는 Neon의 pooling endpoint 검토 필요.
