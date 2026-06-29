// OS SSO 모드 토글. 기본 OFF — 기본은 기존 classbot 자체 인증(JWT/ApiAuthProvider) 흐름 유지.
// 정적 참조여야 Next 가 클라이언트 번들에 인라인한다(api-client NEXT_PUBLIC 주석과 동일).
export const OS_SSO_ENABLED = process.env.NEXT_PUBLIC_OS_SSO === 'true';
