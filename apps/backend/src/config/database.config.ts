import { registerAs } from "@nestjs/config";

import { DECIMAL_RADIX } from "../common/constants/jwt.constant";

/** 기본 Postgres 포트 (docker-compose 가 호스트 5434 → 컨테이너 5432 로 노출). */
const DEFAULT_DB_PORT = 5434;

/**
 * TypeORM Postgres 연결 설정. 본체 pullim database.config 정렬.
 * 값은 env 로만 주입한다.
 */
export default registerAs("database", () => ({
  host: process.env.DATABASE_HOST ?? "localhost",
  port: parseInt(
    process.env.DATABASE_PORT ?? String(DEFAULT_DB_PORT),
    DECIMAL_RADIX,
  ),
  username: process.env.DATABASE_USERNAME ?? "pullim",
  password: process.env.DATABASE_PASSWORD ?? "pullim",
  name: process.env.DATABASE_NAME ?? "pullim_classbot",
}));
