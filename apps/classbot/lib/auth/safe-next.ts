// ============================================================================
// next 파라미터 검증 — open redirect 방지 (본체 pullim safe-next 패턴).
// 같은 오리진의 내부 경로(`/`로 시작, `//` 제외)만 허용한다.
// ============================================================================

/**
 * 안전한 내부 리다이렉트 경로인지 검사한다.
 * @param path - 검사할 경로
 * @returns 내부 경로면 true (프로토콜 상대/외부 URL 차단)
 */
export function isSafeNextPath(path: string): boolean {
  if (!path) return false;
  // 외부/프로토콜 상대 URL 차단: 반드시 단일 '/' 로 시작.
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (path.startsWith('/\\')) return false;
  return true;
}
