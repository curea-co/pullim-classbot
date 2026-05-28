/**
 * Drizzle Kit 설정 — 풀림 클래스봇 BE.
 * proc/spec/2026-05-18_be-api-design.md 참조.
 */

import { config as loadEnv } from 'dotenv';
import type { Config } from 'drizzle-kit';

// .env.local 우선, .env fallback — Next.js와 동일한 우선순위.
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('[drizzle.config] DATABASE_URL is not set — copy .env.example to .env.local first.');
}

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://pullim:pullim@localhost:5432/pullim_classbot',
  },
  strict: true,
  verbose: true,
} satisfies Config;
