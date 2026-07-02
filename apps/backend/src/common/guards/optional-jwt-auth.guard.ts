import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * 선택적 JWT 가드 — 도메인 라우트의 Ph7 과도기 인증(spec §3 · §6.1).
 *
 * Bearer 토큰이 유효하면 request.user 를 주입하고, 없거나 무효여도 요청을
 * 차단하지 않는다(비인증 요청은 x-user-id 헤더 폴백 — resolveDomainUserId).
 * 전역 JwtAuthGuard 를 우회하도록 핸들러/클래스에 @Public() 과 함께 쓴다.
 *
 * ⚠ Ph7 정리 대상: 도메인 라우트에 JWT 가드가 전면 적용되면 이 가드와
 * x-user-id 폴백은 제거하고 전역 JwtAuthGuard 로 일원화한다.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  /**
   * 인증 실패를 에러로 승격하지 않는다 — user 가 없으면 undefined 로 통과.
   */
  handleRequest<TUser = unknown>(
    _err: unknown,
    user: TUser | false,
  ): TUser | undefined {
    return user || undefined;
  }
}
