import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

/**
 * 요청에서 인증된 사용자 정보를 추출한다.
 * JwtStrategy 는 User 엔티티를, JwtRefreshStrategy 는 { user, refreshToken } 을 주입한다.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);
