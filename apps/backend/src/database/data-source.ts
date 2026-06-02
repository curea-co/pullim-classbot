import "reflect-metadata";
import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

import { AuthRevokedToken } from "../entities/auth-revoked-token.entity";
import { AuthUser } from "../entities/auth-user.entity";
import { AuthUserProvider } from "../entities/auth-user-provider.entity";

const DECIMAL_RADIX = 10;
const DEFAULT_DB_PORT = 5434;

/**
 * TypeORM CLI(마이그레이션) 전용 DataSource.
 * DB 접속 정보는 환경변수로 주입한다(bun --env-file 또는 셸 export).
 * 앱 런타임은 app.module 의 TypeOrmModule.forRootAsync 를 사용한다.
 */
const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST ?? "localhost",
  port: parseInt(
    process.env.DATABASE_PORT ?? String(DEFAULT_DB_PORT),
    DECIMAL_RADIX,
  ),
  username: process.env.DATABASE_USERNAME ?? "pullim",
  password: process.env.DATABASE_PASSWORD ?? "pullim",
  database: process.env.DATABASE_NAME ?? "pullim_classbot",
  entities: [AuthUser, AuthUserProvider, AuthRevokedToken],
  namingStrategy: new SnakeNamingStrategy(),
  migrations: [__dirname + "/migrations/*.{ts,js}"],
  // 절대 동기화 금지 — Drizzle 자산과 공존하므로 스키마는 마이그레이션으로만 변경.
  synchronize: false,
});

export default AppDataSource;
