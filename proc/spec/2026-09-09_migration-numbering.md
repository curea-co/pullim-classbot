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
그대로 옮기면 § 3 이 보여주듯 **테이블이 영영 안 생기는** 상태가 된다.
그래서 번호를 다른 숫자로 갈아 끼우는 대신 **규칙을 적는다.**

## 1. 규칙 셋

1. **번호는 `dev` 에 먼저 도착한 PR 이 가져간다.** 명세는 어느 PR 이 어떤 **DDL** 을 지는지
   적고, **몇 번 파일이 될지는 적지 않는다.** 번호는 설계 결정이 아니라 **저널의 자리**이고,
   그 자리는 머지 순서가 정한다. 예약을 적어 두면 순서가 바뀌는 순간 명세가 틀리고,
   그 틀린 명세가 리뷰의 판정 기준이 된다.
2. **스택 PR 은 리베이스할 때 재번호한다 — 파일명·저널 `idx` 뿐 아니라 `when` 도 함께 올린다.**
   drizzle 은 **`when`(저널의 created_at) 으로만** 적용 여부를 가른다(§ 2). 번호만 밀고
   `when` 을 두면, 이미 뒤 번호를 적용한 DB 가 앞 번호를 **경고도 실패도 없이 조용히
   건너뛴다.** `meta/*_snapshot.json` 도 같은 이름으로 따라간다.
3. **`consent_logs.type` 같은 「값만 느는」 변경에는 마이그레이션이 없다.** 실제 DB 의 `type`
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

## 3. 실측 (2026-09-09 · 일회용 DB `mig_probe_a/b/c` · 실행 후 삭제)

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

## 4. 지금 `dev` 기준 배정 — 예약이 아니라 **스냅샷**이다

아래는 2026-09-09 시점의 사실이지 앞으로의 약속이 아니다. 순서가 바뀌면 번호도 바뀌고,
**그때 고칠 것은 PR 이 아니라 이 절이다.**

- `dev` 의 마이그레이션은 **`0000`~`0004`**. 다음 빈자리는 `0005` 다.
- **#280**(학부모 동의 게이트 · 서버)은 `dev` 를 base 로 열려 있고, 지금 머지되면 그 빈자리
  **`0005`** 를 가져간다(`revoked_at`). `consent_logs` 의 축
  둘(`self_study_summary` · `class_assignment_summary`)도 같은 PR 이 세우지만, 규칙 3 대로
  **DDL 은 없다**.
- **#270**(`self_enrollments` · `self_study_days`)은 스택 PR 이고 base 가 squash 머지로
  사라져 **어차피 리베이스해야 한다.** 그때 규칙 2 대로 **그 시점의 빈자리**로 재번호하고
  `when` 을 함께 올린다. 몇 번이 될지는 **그 시점의 `dev`** 가 정한다 — 여기 적어 두면
  또 틀린다.
