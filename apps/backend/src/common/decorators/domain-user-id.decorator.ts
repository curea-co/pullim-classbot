import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import { resolveDomainUserId } from "../utils/domain-user.util";

/**
 * 도메인 라우트의 요청 사용자 id 파라미터 데코레이터 (spec §3 · §6.1).
 * JWT 사용자(id)가 있으면 그것을, 없으면 x-user-id 헤더를 반환한다.
 * 둘 다 없으면 undefined — 필요 여부 판단(401)은 서비스 레이어가 한다.
 *
 * ⚠ Ph7 정리 대상: x-user-id 폴백 제거 시 @CurrentUser 로 대체.
 */
export const DomainUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return resolveDomainUserId(request);
  },
);
