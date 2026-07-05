# M0 재산정 — M1 피벗 이후 classbot 실출시 인프라 (2026-07-05)

> **결론 먼저**: classbot 실출시에 **신규 AWS 과금 리소스가 필요 없다.** 원래 M0
> (standalone classbot 백엔드용 RDS + App Runner/ECS + 시크릿/네트워크)는 M1 피벗으로
> **폐기**된다 — classbot 도메인 BE 가 **pullim-api(공유 모놀리식, 기존 Aurora RDS + ECS
> 가동 중)** 로 정본화됐고, classbot FE 는 **Vercel(기존, main push 자동 배포)** 에 이미 있다.
> **따라서 비용 승인 대상이 없다.**

## 1. 무엇이 바뀌었나 (M0 전제의 붕괴)

로드맵(`2026-07-02_real-launch-roadmap.md`) M0 는 "standalone classbot 백엔드"를 전제로
RDS + App Runner + 시크릿 + 네트워크를 신규 프로비저닝하는 계획이었다. 그러나 M1 에서
사용자 결정(2026-07-04)으로 classbot 코어 루프 BE 를 **pullim-api/src/classbot** 로 정본화
(ADR-063, PR #316~#322)하면서 그 전제가 사라졌다:

| 계층 | 원래 M0 계획 | M1 피벗 이후 실제 |
|---|---|---|
| 도메인 BE | apps/backend(NestJS) → App Runner/ECS 신규 | **pullim-api 모듈**(기존 ECS 배포) — 신규 컴퓨트 0 |
| 도메인 DB | classbot 전용 RDS 신규 | **pullim-api Aurora RDS 의 `classbot` 스키마**(마이그레이션만) — 신규 인스턴스 0 |
| 신원/시크릿 | 자체 JWT_SECRET/PEPPER 등 SSM 신규 | **pullim-api OS 쿠키 SSO** 재사용 — 신규 시크릿 0 |
| FE | (미정) | **Vercel**(classbot.pullim.ai — 기존 자동 배포) — 신규 0 |
| 네트워크/도메인 | 신규 | 기존 `*.pullim.ai`(Vercel + api.pullim.ai) 재사용 — 신규 0 |

`apps/backend/Dockerfile` 등 standalone 컨테이너 자재는 폐기된 계획의 잔재다(배포 경로 없음).

## 2. 그럼 실출시에 남은 "배포" 작업은 (전부 무과금)

1. **pullim-api classbot 스키마 마이그레이션** → dev → prod Aurora RDS 적용.
   - 신규 리소스 아님(기존 Aurora 에 테이블 추가 — 스토리지 무시 가능).
   - **오너**: pullim-api 릴리스/BE 오너(마이그레이션 dev 반영 승인 게이트, db-structure §3.1). 사용자가 pullim-api dev→main 승격을 릴리스 오너에 요청 중 — 그 승격에 포함.
2. **classbot FE Vercel prod env**(SSO 켤 때): `NEXT_PUBLIC_OS_SSO=true`, `NEXT_PUBLIC_OS_URL`, `NEXT_PUBLIC_OS_API_URL=https://api.pullim.ai`. **`NEXT_PUBLIC_CORE_REAL_BE` 는 pullim-api classbot 라우트가 해당 환경에 배포된 뒤에만 ON.**
   - 설정 변경(무과금). 런북 `2026-07-01_classbot-sso-dev-deploy-runbook.md` §2 와 동일 패턴.
3. (선택·후속) apps/backend Dockerfile·잔여 standalone 자재 정리 — requiz/replay 경로 정본 이관과 함께.

## 3. 남은 실질 블로커 (인프라 아님 — 앞 마일스톤 잔여)

- **pullim-api dev→main 승격** — 공유 모놀리식 릴리스(릴리스 오너). classbot BE 는 dev 대기.
- **Dev SSO 라이브 검증** — `dev-os` 의 Vercel Deployment Protection 해제/bypass 필요(헤드리스 라운드트립 블로커, M1 에서 확인).

## 4. 비용 승인 판정

**승인할 신규 과금 리소스 없음.** 원래 M0 의 AWS 지출(별도 RDS + App Runner 상시 컴퓨트,
월 수십~수백 달러 추정)은 pullim-api 정본화로 **회피**됐다. classbot 실출시 인프라 비용
증분 ≈ $0(기존 pullim-api Aurora/ECS + Vercel 에 흡수).

> M3(챗 LLM 게이트웨이·qgen-ai 배포)는 별도 비용 축으로 그때 재산정한다 — 본 문서 범위 밖.
