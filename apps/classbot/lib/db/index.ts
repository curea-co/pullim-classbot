/**
 * Drizzle DB client — Pool 기반.
 *
 * Next.js dev mode는 hot reload 시 모듈을 재평가하므로,
 * 매번 새 Pool을 만들면 connection 누수가 일어난다.
 * `globalThis`에 캐시해서 dev에서 단일 Pool을 유지한다.
 */

import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

declare global {
  // eslint-disable-next-line no-var
  var __pullimClassbotPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __pullimClassbotDb: NodePgDatabase<typeof schema> | undefined;
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      '[db] DATABASE_URL is not set. Copy .env.example to .env.local and ensure `docker compose up` is running.',
    );
  }
  return url;
}

export function getPool(): Pool {
  if (globalThis.__pullimClassbotPool) return globalThis.__pullimClassbotPool;
  const pool = new Pool({ connectionString: getDatabaseUrl(), max: 10 });
  if (process.env.NODE_ENV !== 'production') {
    globalThis.__pullimClassbotPool = pool;
  }
  return pool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (globalThis.__pullimClassbotDb) return globalThis.__pullimClassbotDb;
  const db = drizzle(getPool(), { schema });
  if (process.env.NODE_ENV !== 'production') {
    globalThis.__pullimClassbotDb = db;
  }
  return db;
}

// NOTE: db 클라이언트는 **지연 초기화**한다(`getDb()` 를 요청 시점에 호출).
// 모듈 로드 시 `export const db = getDb()` 로 즉시 Pool 을 만들면, Next.js 빌드의
// "Collecting page data" 단계에서 route 모듈을 import 하는 것만으로 DATABASE_URL
// 부재 시 빌드가 깨진다(CI). lazy 접근으로 빌드는 DB 없이 통과하고, 실제 연결은
// 런타임 요청에서만 일어난다.
export { schema };
