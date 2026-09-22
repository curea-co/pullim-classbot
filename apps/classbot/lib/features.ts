// 피처 플래그 — 정적 참조만 허용 (NEXT_PUBLIC_* 가변 키 접근 금지).
// NEXT_PUBLIC_REQUIZ_REAL_BE=true 로 설정 시 리플레이 재응시를 실 BE 로 호출.
export const USE_REAL_REQUIZ_BE = process.env.NEXT_PUBLIC_REQUIZ_REAL_BE === 'true';

// `USE_REAL_CORE_BE`(NEXT_PUBLIC_CORE_REAL_BE)는 2026-09-16 계획 PR 4 에서 걷었다.
// 코어 훅(과제·참여·내 반·챗)은 이제 pullim-api 정본 하나만 부른다 — 켜고 끄는 것이 아니다
// (`output/2026-09-16_classbot-completion-plan.html` §07 데이터층 · §09 PR 4).
