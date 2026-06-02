import { SetMetadata } from "@nestjs/common";

/** 핸들러를 인증 불필요로 표시하는 메타데이터 키. */
export const IS_PUBLIC_KEY = "isPublic";

/** 글로벌 JwtAuthGuard 를 건너뛰게 한다. */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
