# This is NOT the Next.js you know

This version (Next.js 16, `apps/classbot/`) has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Monorepo (bun workspace)

- Apps: `apps/classbot` (Next.js 16, port 3032), `apps/backend` (NestJS 11, port 4032)
- Packages: `packages/{types,api-client,auth}` — 현재 빈 placeholder
- Package manager: **bun** (workspaces 모드). 명령은 root에서 `bun run <script>` 또는 `bun --filter <pkg> <script>`.
- BE 패턴 권위: [curea-co/pullim](https://github.com/curea-co/pullim) — controller / use-cases / service / interface / infrastructure (clean architecture + Facade)
- 도메인 구체 룰은 [`apps/classbot/AGENTS.md`](apps/classbot/AGENTS.md), [`apps/classbot/CLAUDE.md`](apps/classbot/CLAUDE.md) 우선 참조
- 자세한 컨벤션: [CLAUDE.md](CLAUDE.md)
