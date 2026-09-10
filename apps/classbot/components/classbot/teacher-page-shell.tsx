import React, { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import BackLink from './back-link';
import { PageHeader } from '@/components/shell/page-header';

export interface TeacherPageShellProps {
  backHref: string;
  backLabel: string;
  header: React.ComponentProps<typeof PageHeader>;
  className?: string;
  children: ReactNode;
}

/**
 * 교사 화면의 표준 골격 — 뒤로 가기 + 페이지 헤더 + 본문 섹션들.
 *
 * ## 간격 규칙 (교사 화면 전체가 이 눈금을 쓴다)
 *
 * ```
 *   섹션 ↔ 섹션        28px  space-y-7   ← 이 컴포넌트
 *   같은 층위 카드 그리드 24px  gap-6
 *   카드 패딩(기본)      20px  p-5
 *   카드 패딩(조밀)      16px  p-4       ← 필터 바 · KPI 바
 *   카드 제목 ↔ 본문     16px  mb-4      ← SectionHeading
 *   카드 안 항목 ↔ 항목   20px  space-y-5  ← 폼 필드 묶음 (봇 빌더의 마당)
 *   목록 행 ↔ 행         8px  space-y-2
 * ```
 *
 * 「카드 안 항목」은 한 카드에 폼 필드 묶음이 여럿 들어갈 때만 쓴다. 항목을 가르는 것이
 * 여백뿐이라(선도 배경도 없다) 이름 ↔ 컨트롤 8px 과 확실히 갈려야 하고, 동시에 카드 패딩보다는
 * 좁아야 한다 — 그래서 그런 카드는 패딩을 `p-5 lg:p-6`(20→24px)로 한 칸 올린다.
 * (lg 미만은 패딩 20 = 항목 사이 20 동률. 한 카드 안에서는 받아들인다.)
 * 까닭은 `components/builder/build-yards.tsx` 머리 주석에 적어 뒀다.
 *
 * **바깥이 안쪽보다 넓다** — 이 순서가 뒤집히면 카드끼리 붙어 보여 어디서 끊기는지 안 읽힌다.
 * 종전에는 섹션 간격이 16px(space-y-4)로 카드 패딩(16~20px)과 같거나 좁았다.
 *
 * ## 위쪽 여백을 여기서 주지 않는 이유
 *
 * PUDS `DashboardShell` 이 이미 `<main>` 에 `py-[var(--pad-2xl)]`(24px)을 주고,
 * 그 아래 `Breadcrumb` 이 `mb-6`(24px)을 준다. 여기서 `py-4 lg:py-6` 을 한 번 더 얹으면
 * 빵부스러기와 제목 사이가 데스크톱에서 48px 까지 벌어졌다 — 그래서 걷어냈다.
 * 세로 여백은 셸이 준다.
 */
export function TeacherPageShell({
  backHref,
  backLabel,
  header,
  className,
  children,
}: TeacherPageShellProps) {
  return (
    <div className={cn('space-y-7', className)}>
      {/*
        뒤로 가기는 제목에 딸린 꼬리표라 헤더와 한 덩어리로 묶는다.
        섹션 간격(28px)을 그대로 받으면 13px 짜리 링크 하나가 제 섹션처럼 떠 버린다.
      */}
      <div className="space-y-2">
        <BackLink href={backHref}>{backLabel}</BackLink>
        <PageHeader {...header} />
      </div>
      {children}
    </div>
  );
}
