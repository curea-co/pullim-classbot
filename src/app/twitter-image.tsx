/**
 * Twitter/X 카드 이미지 — opengraph-image와 동일 디자인 재사용.
 * runtime은 정적 파싱이라 re-export 불가 — 직접 선언.
 * spec plan § B.
 */
export const runtime = 'edge';

export { default, alt, size, contentType } from './opengraph-image';
