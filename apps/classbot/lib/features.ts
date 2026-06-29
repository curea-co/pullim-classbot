// 피처 플래그 — 정적 참조만 허용 (NEXT_PUBLIC_* 가변 키 접근 금지).
// NEXT_PUBLIC_REQUIZ_REAL_BE=true 로 설정 시 리플레이 재응시를 실 BE 로 호출.
export const USE_REAL_REQUIZ_BE = process.env.NEXT_PUBLIC_REQUIZ_REAL_BE === 'true';
