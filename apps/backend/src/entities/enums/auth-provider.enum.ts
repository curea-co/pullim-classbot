/**
 * 인증 제공자. 본체 pullim AuthProvider 정렬.
 * EMAIL 만 이번 작업에서 동작하며, KAKAO/NAVER 는 소셜 스캐폴드(GATED)용 예약값.
 */
export enum AuthProvider {
  EMAIL = "email",
  KAKAO = "kakao",
  NAVER = "naver",
}
