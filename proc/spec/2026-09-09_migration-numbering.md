# 마이그레이션 번호는 명세가 예약하지 않는다 — Drizzle 저널 운영 규칙

> **Date:** 2026-09-09
> **Status:** 규칙 (실측 근거 포함)
> **Scope:** `apps/classbot/drizzle/` 의 Drizzle 마이그레이션 번호·저널 운영.
> **원본 권위**: [`2026-05-18_be-api-design.md`](2026-05-18_be-api-design.md) **§ 6**
> (마이그레이션 정책) · **§ 6.2**(Drizzle + TypeORM 공존) — **읽기 권위이고 이 문서가
> 고쳐 쓰지 않는다.** 그 절들이 정하지 않은 한 가지, **「번호를 누가 정하는가」**만
> 이 문서가 세운다.

## 0. 왜 이 문서가 생겼나

종전 명세는 어느 PR 이 어느 번호(`0005`·`0006`·`0007`)를 쓸지 **미리 못 박아** 두었다
([`2026-06-23_classbot-dual-mode-design.md`](2026-06-23_classbot-dual-mode-design.md) 의
개정 박스 · [`05 § 11.4`](05-business-rules.md)). 그 예약은 스택 PR 이 계획대로 순서대로
들어온다는 전제 위에 서 있었는데, 실제로는 **스택의 base 가 squash 머지로 사라져 순서가
갈렸다**(#267 이 squash 로 `dev` 에 들어가 그 위에 쌓인 #268~#271 이 리베이스 대상이 됐다).

그러자 리뷰가 **낡은 예약표를 권위 삼아** 「예약된 `0007` 로 옮겨라」고 요구했고,
그대로 옮기면 § 3.1 이 보여주듯 **테이블이 영영 안 생기는** 상태가 된다.
그래서 번호를 다른 숫자로 갈아 끼우는 대신 **규칙을 적는다.**

## 1. 규칙 넷

1. **번호는 `dev` 에 먼저 도착한 PR 이 가져간다.** 명세는 어느 PR 이 어떤 **DDL** 을 지는지
   적고, **몇 번 파일이 될지는 적지 않는다.** 번호는 설계 결정이 아니라 **저널의 자리**이고,
   그 자리는 머지 순서가 정한다. 예약을 적어 두면 순서가 바뀌는 순간 명세가 틀리고,
   그 틀린 명세가 리뷰의 판정 기준이 된다.
2. **아직 `dev` 에 없는 마이그레이션만 재번호한다 — 그때는 파일명·저널 `idx` 뿐 아니라
   `when` 도 함께 올린다.** drizzle 은 **`when`(저널의 created_at) 으로만** 적용 여부를
   가른다(§ 2). 번호만 밀고 `when` 을 두면, 이미 뒤 번호를 적용한 DB 가 앞 번호를
   **경고도 실패도 없이 조용히 건너뛴다.** `meta/*_snapshot.json` 도 같은 이름으로 따라간다.
   **경계와 전환 절차는 § 3.2 가 진다 — 규칙 2 를 읽을 때 반드시 함께 읽는다.**
3. **`dev` 에 들어간 마이그레이션은 동결이다.** 파일명도 `when` 도 **절대 바꾸지 않는다.**
   바꾸면 그것을 이미 적용한 DB 가 같은 SQL 을 **다시 돌려** 중복 객체로 죽는다(§ 3.2 D).
   재번호가 허용되는 것은 **아직 머지되지 않은 브랜치가 들고 있는 자기 마이그레이션**뿐이다.
4. **`consent_logs.type` 같은 「값만 느는」 변경에는 마이그레이션이 없다.** 실제 DB 의 `type`
   은 CHECK 도 PG enum 도 없는 `text` 다(`apps/classbot/drizzle/0000_stiff_ulik.sql` · 실측:
   `information_schema.columns` 가 `text` 이고 `pg_constraint` 에는 PK·FK 셋뿐). 값을 늘리는
   것은 `lib/db/schema.ts` 의 union 과 `lib/mock/family.ts` 의 `ConsentType` ·
   `consentTypeMeta` 를 함께 고치는 **TS 작업**이지 DDL 이 아니다. 명세가 「enum 에 값을 넣는
   마이그레이션」으로 적으면 **없는 작업**을 요구하게 된다.

## 2. 근거 — drizzle 의 적용 판정 (소스 인용)

`drizzle-kit migrate` 는 드라이버별 migrator 를 그대로 부른다
(`drizzle-kit@0.30.6/bin.cjs`: `await import("drizzle-orm/node-postgres/migrator")`),
그 migrator 는 저널을 읽어(`drizzle-orm/migrator.js` 의 `readMigrationFiles` — 각 항목의
`when` 을 `folderMillis` 로 싣는다) 방언의 `migrate()` 에 넘긴다.
판정은 `drizzle-orm@0.36.4/pg-core/dialect.js` 한 줄이다:

```js
// select id, hash, created_at from drizzle.__drizzle_migrations order by created_at desc limit 1
const lastDbMigration = dbMigrations[0];
for await (const migration of migrations) {
  if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis) { ... }
}
```

**파일명도 저널 `idx` 도 보지 않는다.** 「DB 에 적용된 것 중 `created_at` 이 가장 큰 값」보다
`when` 이 **큰** 항목만 돈다 — 작으면 건너뛰고, **건너뛴 사실을 아무 데도 남기지 않는다**
(CLI 는 그대로 `migrations applied successfully!` 를 찍고 종료 코드 0 이다).

## 3. 실측 (2026-09-09 · 일회용 DB `mig_probe_a`~`f` · 실행 후 삭제)

### 3.1 번호를 예약대로 옮기면 무엇이 사라지나

`dev`(`0000`~`0004`) 위에서 세 순서를 실제로 돌렸다.
`[280]`=`revoked_at`(`when=1788843161576`) · `[SE]`=`self_enrollments`(`1788412277498`) ·
`[SD]`=`self_study_days`(`1788414652159`).

| # | 순서 | 결과 |
|---|---|---|
| A | `[280]` 을 **`0007`** 로 먼저 적용 → 뒤에 `[SE]`=`0005` · `[SD]`=`0006` 합류 | ❌ **`self_enrollments`·`self_study_days` 가 안 생긴다.** 적용 행 6개 그대로, `to_regclass` 둘 다 `null`. CLI 는 성공으로 끝난다 |
| B | `[280]` 을 `0005` 로 먼저 적용 → `[SE]`·`[SD]` 를 **파일명만** `0006`·`0007` 로 재번호(`when` 유지) | ❌ **같은 스킵.** 번호를 밀어도 `when` 이 작으면 안 돈다 — 판정 기준이 파일명이 아님을 보인다 |
| C | `[280]` 을 `0005` 로 먼저 적용 → `[SE]`·`[SD]` 를 `0006`·`0007` 로 재번호하며 **`when` 도 상향** | ✅ 적용 행 8개, 두 표 모두 생성, `revoked_at` 존재 |

최종 확인 (`applied | self_enrollments 존재 | self_study_days 존재`):

```
A|6|f|f
B|6|f|f
C|8|t|t
```

**A 가 리뷰가 요구한 순서이고, C 가 이 리포가 실제로 가야 할 순서다.** A 의 고장은
add/add 머지 충돌처럼 눈에 띄지 않는다 — 개발자의 DB 에서 표 둘이 **조용히 없는 채로**
남고, 마이그레이션은 계속 「성공」한다.

### 3.2 재번호의 대가 — 이미 돌려 본 DB 는 그냥 두면 죽는다

규칙 2 는 공짜가 아니다. **리베이스 전 브랜치를 이미 checkout 해서 돌려 본 개발 DB** 는
`when` 이 올라간 순간 그 마이그레이션을 **「아직 안 돈 새 것」으로 보고 다시 돌린다.**
같은 `CREATE TABLE` 이 두 번 나가므로 죽는다. 이것도 실측했다.

| # | 상황 | 결과 |
|---|---|---|
| D | 리베이스 **전** 스택(`[SE]`=`0005`·`[SD]`=`0006`, 원래 `when`)을 적용해 둔 DB 에 리베이스 **후** 폴더(C)를 돌린다 | ❌ **`ERROR: relation "self_enrollments" already exists` (`42P07`)** — migrate 가 그 자리에서 멈춘다 |
| E | 같은 DB 에서 저널 행의 `created_at` 만 새 `when` 으로 **손으로 고쳐** 우회한다 | ⚠️ **성공처럼 끝나지만 새 구멍이 난다** — 최대 `created_at` 이 `[280]`(`1788843161576`)보다 커져 **`[280]` 의 `0005` 가 스킵된다.** 적용 행 7개, `revoked_at` **없음** |
| F | 같은 DB 를 **재생성**하고(root `bun run db:reset`) 리베이스 후 폴더를 돌린다 | ✅ 적용 행 8개, 두 표 · `revoked_at` 전부 존재 |

```
D  → ERROR 42P07 relation "self_enrollments" already exists
E|7|revoked_at=f     ← 저널만 고치는 우회는 앞 번호를 새로 삼킨다
F|8|t|t|t
```

**그래서 규칙 3 이 경계를 그린다.** `dev` 에 들어간 마이그레이션은 동결이다 — 그것을
재번호하면 그 DB 가 D 로 죽고, 공유 DB 라면 사람 수만큼 죽는다. **재번호는 아직 머지되지
않은 브랜치의 자기 마이그레이션에만** 허용된다. 그 브랜치는 `dev` 에 없었으므로 영향받는
것은 **그것을 checkout 해 본 사람의 로컬 DB 뿐**이다.

**전환 절차 (리베이스로 재번호한 브랜치를 다시 checkout 할 때)**

1. 그 브랜치를 **이전 판으로 돌려 본 적이 없으면** — 아무것도 하지 않는다. 그냥
   `bun --filter @pullim-classbot/classbot db:migrate` 로 이어 간다.
2. 돌려 본 적이 있으면 — **root `bun run db:reset` 으로 DB 를 재생성한 뒤**
   마이그레이션을 처음부터 돌린다(F). 로컬 개발 DB 이므로 잃는 것은 시드뿐이고
   `bun --filter @pullim-classbot/classbot db:seed` 로 되돌린다.
3. **저널 행의 `created_at` 만 손으로 고치는 우회는 쓰지 마라**(E) — migrate 는 통과하지만
   그 순간 **더 작은 `when` 을 가진 앞 번호가 통째로 스킵된다.** 고쳤다는 신호도 없이
   칼럼 하나가 빈다.
4. `ADD COLUMN IF NOT EXISTS` 류의 멱등 DDL 은 **부분 완화일 뿐**이다 — 열 하나는 살려도
   `CREATE TABLE` 은 D 로 죽고, E 의 스킵은 전혀 막지 못한다. 절차 2 를 대신하지 않는다.

## 4. 지금 `dev` 기준 배정 — 예약이 아니라 **스냅샷**이다

아래는 2026-09-09 시점의 사실이지 앞으로의 약속이 아니다. 순서가 바뀌면 번호도 바뀌고,
**그때 고칠 것은 PR 이 아니라 이 절이다.**

- `dev` 의 마이그레이션은 **`0000`~`0004`**. 다음 빈자리는 `0005` 다.
- **#280**(학부모 동의 게이트 · 서버)은 `dev` 를 base 로 열려 있고, 지금 머지되면 그 빈자리
  **`0005`** 를 가져간다(`revoked_at`). `consent_logs` 의 축
  둘(`self_study_summary` · `class_assignment_summary`)도 같은 PR 이 세우지만, 규칙 4 대로
  **DDL 은 없다**.
- **#270**(`self_enrollments` · `self_study_days`)은 스택 PR 이고 base 가 squash 머지로
  사라져 **어차피 리베이스해야 한다.** 그 마이그레이션 둘은 아직 `dev` 에 없으므로 규칙 2 의
  재번호 대상이 맞다 — **그 시점의 빈자리**로 밀고 `when` 을 함께 올린다. 몇 번이 될지는
  **그 시점의 `dev`** 가 정한다(여기 적어 두면 또 틀린다).
  그 브랜치를 **리베이스 전 판으로 이미 돌려 본 개발 DB 가 있다면 § 3.2 의 전환 절차**를
  먼저 밟는다 — 그냥 이어 돌리면 `42P07` 로 멈춘다.
