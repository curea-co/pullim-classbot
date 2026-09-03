'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, Users } from 'lucide-react';
import { EmptyState } from '@/components/classbot/empty-state';
import { KpiStat } from '@/components/classbot/kpi-stat';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { MetaRow } from '@/components/ui/meta-row';
import { useParentChildren, useParentSelfStudy } from '@/hooks/api/parent';
import type { ParentChildItem } from '@/hooks/api/types';
import { countChildAssignments, relationLabel } from './assignment-status';
import { NoChildrenState, ParentErrorState, ParentLoading } from './parent-state';
import { homeTeaserLine, visibleChildren } from './self-study/self-study-visibility';

/**
 * 학부모 홈 — 「우리 아이 요즘 어때요?」에 한 화면으로 답한다.
 *
 * 자녀 한 명이 카드 한 장이다. 카드 안에서 묻는 것은 셋뿐이다 —
 * 어느 수업방에 들어가 있나 · 아직 남은 과제가 몇 개인가 · 그중 늦은 것이 있나.
 * (자기주도는 넷째 질문이 아니라 **다른 화면으로 나가는 한 줄**이다. 카드 맨 아래 주석 참조.)
 * 자녀가 여럿이면 카드가 여러 장 쌓인다(API 가 배열을 준다). 고르는 장치를 두지 않는 이유는,
 * 부모가 아이를 「골라서」 보는 게 아니라 **다 같이** 보기 때문이다.
 *
 * ## 간격
 * 교사 화면과 같은 눈금을 쓴다 — 섹션 `space-y-7`, 카드 패딩 `p-5`, 제목↔본문 `mb-4`, 목록 행 `space-y-2`.
 * 위쪽 여백은 여기서 주지 않는다. PUDS `DashboardShell` 의 `<main>` 과 빵부스러기가 이미 준다
 * (`components/classbot/teacher-page-shell.tsx` 머리 주석).
 *
 * 교사 셸(`TeacherPageShell`)을 그대로 부르지 않은 것은 그쪽이 「뒤로 가기」를 필수로 받기 때문이다.
 * 홈은 학부모의 뿌리라 돌아갈 곳이 없다. 골격은 같게 두되 필수 링크만 뺀다.
 */
export default function ParentHomePage() {
  const { data, isLoading, isError, error, refetch } = useParentChildren();
  const children = data?.children ?? [];

  /*
    자기주도 한 줄 — 이 홈이 읽는 **두 번째** 입구다(계약 §3).

    ⛔ 이 조회를 위 `isLoading` 과 묶지 마라. 홈의 본체는 수업방·과제이고 자기주도는
    덧줄이다. 덧줄을 기다리느라 본체가 늦어지면 안 되고, 반대로 **아직 안 온 상태를
    「없음」으로 그려서도 안 된다.** 아래 Map 이 그 둘을 동시에 만족시킨다 —
    응답 전에는 비어 있고, 비어 있으면 줄이 아예 안 그려진다. 「불러오는 중」이라는
    세 번째 모습이 없으므로 잘못 말할 자리 자체가 없다.

    거르개(`visibleChildren`)는 자기주도 화면과 **같은 함수**다. 홈만 기준이 느슨하면
    거기서만 보이는 아이가 생기고, 그 차이로 동의 여부가 드러난다.
  */
  const selfStudy = useParentSelfStudy();
  const selfStudyByChild = new Map(
    visibleChildren(selfStudy.data?.children ?? []).map(c => [c.id, c]),
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={{ icon: Users, text: '학부모 홈' }}
        title="우리 아이 요즘 어때요?"
        description={
          children.length > 1
            ? `자녀 ${children.length}명이 들어간 수업방과 받은 과제를 한눈에 봐요.`
            : '자녀가 들어간 수업방과 받은 과제를 한눈에 봐요.'
        }
      />

      {isLoading ? (
        <ParentLoading />
      ) : isError ? (
        <ParentErrorState error={error} onRetry={() => void refetch()} />
      ) : children.length === 0 ? (
        <NoChildrenState />
      ) : (
        children.map(child => (
          <ChildSummaryCard
            key={child.id}
            child={child}
            selfStudyLine={
              selfStudyByChild.has(child.id)
                ? homeTeaserLine(selfStudyByChild.get(child.id)!)
                : null
            }
          />
        ))
      )}
    </div>
  );
}

/** 자녀 한 명 — 숫자 셋과 수업방 목록. */
function ChildSummaryCard({
  child,
  selfStudyLine,
}: {
  child: ParentChildItem;
  /** 자기주도 한 줄. 보여줄 것이 없거나 아직 안 왔으면 null — 그러면 줄이 없다. */
  selfStudyLine: string | null;
}) {
  const counts = countChildAssignments(child.assignments);
  const rooms = child.classrooms;

  return (
    <section className="bg-card rounded-2xl border p-5">
      <SectionHeading
        title={child.name}
        description={`${relationLabel[child.relation]}로 이어진 자녀예요.`}
      />

      <ul className="grid grid-cols-3 gap-3">
        <KpiStat label="수업방" value={`${rooms.length}개`} />
        <KpiStat
          label="남은 과제"
          value={`${counts.remaining}개`}
          /* 0개는 눈을 끌 까닭이 없다 — 할 일이 남았을 때만 색을 준다 */
          tone={counts.late > 0 ? 'alert' : counts.remaining > 0 ? 'accent' : 'default'}
          action={
            child.assignments.length > 0
              ? { label: '과제 보기', href: '/parent/assignments' }
              : undefined
          }
        />
        <KpiStat label="다 낸 과제" value={`${counts.done}개`} />
      </ul>

      {/* 색만으로 말하지 않는다 — 「남은 과제」가 빨개진 까닭을 글자로 한 번 더 적는다 */}
      {counts.late > 0 && (
        <p className="text-pullim-danger mt-3 text-2xs font-bold">
          마감이 지난 과제가 {counts.late}개 있어요.
        </p>
      )}

      <div className="mt-5">
        <h3 className="text-pullim-slate-900 mb-2 text-sm leading-tight font-bold">
          들어간 수업방 {rooms.length}개
        </h3>
        {rooms.length === 0 ? (
          <EmptyState
            tone="plain"
            size="sm"
            title="아직 들어간 수업방이 없어요"
            description="선생님께 참여 코드를 받아 들어가면 여기에 보여요."
          />
        ) : (
          <ul className="space-y-2">
            {rooms.map(room => (
              <li
                key={room.classroomId}
                className="border-pullim-slate-100 flex items-center gap-3 rounded-xl border px-3 py-2.5"
              >
                {/* 봇 아바타 — 계약 §7 이 이모지를 허락하는 세 자리 중 하나 */}
                <span
                  className="bg-pullim-slate-50 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base"
                  aria-hidden
                >
                  {room.botAvatarEmoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-pullim-slate-900 truncate text-sm font-bold">
                    {room.label}
                  </p>
                  {/* `teacherName` 은 서버가 이미 「김수학 선생님」까지 붙여 준다 — 여기서 또 붙이지 말 것 */}
                  <MetaRow
                    primary={`${room.subject} · ${room.grade}`}
                    secondary={`${room.teacherName} · ${room.organization}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/*
        자기주도 한 줄 — 홈이 자기주도에 대해 말하는 전부다(계약 §3).
        숫자를 위 KPI 칸에 섞지 않은 이유는 그 셋이 「수업방 · 과제」 눈금이라
        마감 없는 값이 끼면 안 낸 일처럼 읽히기 때문이다. 카드 맨 아래 나가는 길로 둔다.
      */}
      {selfStudyLine && (
        <Link
          href="/parent/self-study"
          aria-label={`${child.name} 자기주도 학습 보기`}
          className="border-pullim-slate-100 hover:bg-pullim-slate-50/50 focus-visible:ring-pullim-blue-400/50 mt-3 flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2"
        >
          <Sparkles className="text-pullim-blue-600 h-4 w-4 shrink-0" aria-hidden />
          <span className="text-pullim-slate-700 min-w-0 flex-1 truncate text-2xs font-semibold">
            {selfStudyLine}
          </span>
          <ArrowRight className="text-pullim-slate-400 h-3.5 w-3.5 shrink-0" aria-hidden />
        </Link>
      )}
    </section>
  );
}
