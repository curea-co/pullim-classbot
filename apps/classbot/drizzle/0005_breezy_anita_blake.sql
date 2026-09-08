-- `IF NOT EXISTS` 는 drizzle-kit 생성본에 없는 것을 손으로 붙인 것이다.
-- 이 열은 스택 브랜치(#271 의 `0007`)가 먼저 들여왔던 것이라, 그 브랜치로 한 번이라도
-- 마이그레이션을 돌린 개발 DB 에는 **이미 있다**. 저널에는 없고 열만 있는 그 상태에서
-- 맨 `ADD COLUMN` 은 42701 로 죽는다 — 빈 DB 와 개발 DB 둘 다에서 돌게 두는 편이 낫다.
ALTER TABLE "consent_logs" ADD COLUMN IF NOT EXISTS "revoked_at" timestamp with time zone;
