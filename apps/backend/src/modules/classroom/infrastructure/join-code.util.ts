import { randomBytes } from "node:crypto";

/**
 * 참여 코드 생성/검증 유틸 — `POST /api/bots/:id/join-codes` (M2 개정 §2).
 */

/**
 * 사용자 제공 코드 허용 패턴 — 대문자 영숫자·하이픈, 4~24자,
 * 시작/끝은 영숫자 (mock 시드 코드 MATH-2024 호환).
 */
export const JOIN_CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,22}[A-Z0-9]$/;

/**
 * 서버 생성 코드 알파벳 — 혼동 문자(I, L, O, 0, 1) 제외 32자.
 * 32는 256의 약수라 바이트 모듈로 편향이 없다.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

/**
 * 추측이 어려운 짧은 참여 코드를 생성한다 — `XXXX-XXXX`, 32^8 ≈ 1.1e12 조합.
 * CSPRNG(randomBytes) 기반.
 */
export function generateJoinCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let raw = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    raw += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}
