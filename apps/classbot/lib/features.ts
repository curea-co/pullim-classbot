// 피처 플래그 — 정적 참조만 허용 (NEXT_PUBLIC_* 가변 키 접근 금지).
// NEXT_PUBLIC_REQUIZ_REAL_BE=true 로 설정 시 리플레이 재응시를 실 BE 로 호출.
export const USE_REAL_REQUIZ_BE = process.env.NEXT_PUBLIC_REQUIZ_REAL_BE === 'true';

// NEXT_PUBLIC_CORE_REAL_BE=true 로 설정 시 코어 스토어 3종(class-enrollment ·
// assignments · interventions)의 쓰기/읽기를 실 BE(:4032) 로 호출한다 (Ph7 점진 교체).
// 기본 OFF = 기존 mock/localStorage 동작 100% 불변. ON 실패 시에도 mock 으로 graceful degrade.
export const USE_REAL_CORE_BE = process.env.NEXT_PUBLIC_CORE_REAL_BE === 'true';
