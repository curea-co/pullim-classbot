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

/**
 * 절대 URL next 가 **우리 앱 자신의 오리진**인지 검사한다(cross-host 복귀용).
 * OS 가 앱과 다른 호스트일 때, 앱은 자기 오리진의 절대 URL 을 `next` 로 보낼 수 있어야 한다.
 * 임의 외부 호스트를 허용하면 open-redirect 가 되므로 반드시 `selfOrigin` 과 일치할 때만 허용한다.
 * @param next - 검사할 값(절대 URL 이어야 함)
 * @param selfOrigin - 허용 기준 오리진(보통 앱의 `window.location.origin`)
 * @returns next 가 `selfOrigin` 과 동일 오리진의 절대 URL 이면 true
 */
export function isSafeAbsoluteNext(next: string, selfOrigin: string): boolean {
  if (!next || !selfOrigin) return false;
  try {
    return new URL(next).origin === selfOrigin;
  } catch {
    return false; // 파싱 불가(= 절대 URL 아님)
  }
}

/**
 * `next` 로 안전하게 부착 가능한 값인지 통합 검사한다.
 * 내부 경로(`isSafeNextPath`)이거나, `selfOrigin` 이 주어지고 그 오리진의 절대 URL(`isSafeAbsoluteNext`)이면 안전.
 * @param next - 검사할 next 값(내부 경로 또는 절대 URL)
 * @param selfOrigin - (선택) 절대 URL 허용 기준 오리진. 없으면 절대 URL 은 모두 거부(기존 동작).
 */
export function isSafeNext(next: string, selfOrigin?: string): boolean {
  return isSafeNextPath(next) || (!!selfOrigin && isSafeAbsoluteNext(next, selfOrigin));
}
