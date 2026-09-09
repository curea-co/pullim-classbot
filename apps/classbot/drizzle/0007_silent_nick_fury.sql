-- `IF NOT EXISTS` 는 drizzle-kit 생성본에 없는 것을 손으로 붙인 것이다.
-- 이 열은 `dev` 가 먼저 갖는다(#280 의 `0005_breezy_anita_blake`). 새 DB 는 그 0005 에서
-- 열을 만든 뒤 여기로 오므로 맨 `ADD COLUMN` 이면 42701(중복 열)로 마이그레이션이 멈춘다.
-- 이 파일을 지우지 않고 no-op 로 두는 이유는 `meta/0007_snapshot.json` 이 `revoked_at` 을
-- 가진 유일한 스냅샷이자 체인의 머리라, 지우면 머리 스냅샷과 `schema.ts` 가 어긋나
-- 다음 `drizzle-kit generate` 가 같은 `ADD COLUMN` 을 또 만들어 낸다.
ALTER TABLE "consent_logs" ADD COLUMN IF NOT EXISTS "revoked_at" timestamp with time zone;
