import { registerAs } from "@nestjs/config";

import {
  DECIMAL_RADIX,
  DEFAULT_JWT_EXPIRATION,
  DEFAULT_JWT_REFRESH_EXPIRATION,
} from "../common/constants/jwt.constant";

/**
 * JWT 설정. 본체 pullim jwt.config 정렬.
 * JWT_SECRET 은 env 로만 주입(하드코딩 금지). 미설정 시 부팅 실패.
 */
export default registerAs("jwt", () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET 환경변수가 설정되지 않았습니다");
  }

  return {
    secret,
    expiration: parseInt(
      process.env.JWT_EXPIRATION ?? String(DEFAULT_JWT_EXPIRATION),
      DECIMAL_RADIX,
    ),
    refreshExpiration: parseInt(
      process.env.JWT_REFRESH_EXPIRATION ??
        String(DEFAULT_JWT_REFRESH_EXPIRATION),
      DECIMAL_RADIX,
    ),
  };
});
