'use client';

import { ClipboardList, Sparkles, Target, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/page-header';
import { ContextRail } from '@/components/shell/context-rail';
import BackLink from '@/components/classbot/back-link';
import { WellbeingGauge } from '@/components/classbot/wellbeing-gauge';
import { EmptyState } from '@/components/classbot/empty-state';
import { useStudentMe } from '@/lib/current-user';

/**
 * 이번 주의 나 — 본인 주간 리포트 ([13 § 3.3.5·9.2]).
 *
 * **보는 사람에 대해 지어내던 칸을 전부 걷었다(2026-09-18).** 기준은 하나다 —
 * *담아 두는 곳도 읽어 오는 문도 없는데 보는 사람을 두고 단정하면 걷는다.* 걷은 셋:
 *
 *  - **「이번 주 지표」 KPI 넉 장** — `lib/mock/classbot.ts` 의 `reports` 에서 `kind:'parent'`
 *    첫 행(`rep_a`)을 읽었는데, 그 행의 제목이 「학부모 주간 리포트 (**윤서**)」다. 누가 제
 *    리포트를 열든 윤서의 수치 넷(11h 20m ↑ · 81% ↑ · 38회 · 안정)이 「내 이번 주」로 섰다.
 *  - **「선생님이 한 마디」** — 면담 메모를 담아 두는 곳도 읽어 오는 문도 없어 글도 서명도
 *    지어낸 것이었다(「서연 학생, …」 + 「— 김보람 선생님 · 오늘 18:00」). 없는 선생님이
 *    오늘 18:00 에 글을 남긴 것처럼 읽혔다.
 *  - **「오늘 잘한 점」·「다음에 신경 쓸 점」** — 「이번 주 정답률도 8%p 올라갔어」·「부호 변화
 *    표 단계에서 종종 막혔어」. 그 둘을 세는 곳이 없다.
 *
 * **소비만 끊었다 — 목 데이터는 그대로 둔다.** `reports` 는 교사 리포트 화면이 계속 읽는다.
 * 정본이 주간 집계·면담 메모를 낼 때 같은 자리에 되살린다 — 그때 쓸 것은 **보는 사람의 id 로
 * 조회되는** 값이다.
 *
 * 남은 것은 웰빙 게이지 하나이고, 그것도 목 웰빙 기록을 읽으므로 실계정에는 비어 선다.
 * 학습 기록(`/classbot/me/progress`)과의 역할 나눔은 그쪽 머리주석에 적어 뒀다.
 */
export default function MyReportPage() {
  // 세션은 client 에만 있다 — 종전에는 서버 컴포넌트라 상수(`DEMO_FALLBACK_USER_ID`)를 넘겨
  // 누가 열어도 데모 「서연」의 리포트였다. 그래서 이 화면을 client 로 내렸다.
  const me = useStudentMe();
  // 웰빙 게이지가 읽는 것은 **목 웰빙 기록**이고 키는 roster id 다. 실계정에는 그 행이 없어
  // 게이지가 「웰빙 데이터가 아직 없어요」로 선다.
  const demoKey = me.demo?.id ?? '';

  const rail = (
    /* 다음 주 도전 */
    <Link
      href="/classbot/assignment"
      className="bg-pullim-blue-600 hover:bg-pullim-blue-700 flex items-center gap-3 rounded-2xl p-4 text-white transition-colors"
    >
      <span className="bg-white/15 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        <ClipboardList className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">다음 주 도전</div>
        <div className="text-pullim-blue-100 text-2xs">받은 과제부터 하나씩 해봐요</div>
      </div>
      <ArrowRight className="h-4 w-4" />
    </Link>
  );

  return (
    <div className="space-y-4">
      <BackLink href="/classbot/wellness">웰빙 허브</BackLink>

      <PageHeader
        eyebrow={{ icon: Sparkles, text: '주간 리포트' }}
        title="이번 주의 나"
      />

      <ContextRail railWidth="md" stickyRail rail={rail}>
        {/* MAIN: 웰빙 게이지 — 이 화면에 남은 단 하나의 읽기다 */}
        <WellbeingGauge studentId={demoKey} audience="student-self" />

        {/* 위 머리주석의 셋을 걷고 남은 자리 — 비었다는 것을 그대로 말한다.
            빈칸에 지어낸 말을 채우는 대신, 지금 볼 수 있는 곳으로 길을 낸다. */}
        <EmptyState
          icon={Target}
          title="한 주 정리는 아직 준비 중이에요"
          description="이번 주에 무엇을 잘했고 무엇을 더 볼지 모아서 보여 줄 거예요. 그때까지는 학습 기록에서 확인해 주세요."
          action={{ href: '/classbot/me/progress', label: '학습 기록', ariaLabel: '학습 기록으로 가기' }}
        />
      </ContextRail>
    </div>
  );
}
