'use client';

import { Users } from 'lucide-react';
import { EmptyState } from '@/components/classbot/empty-state';
import { KpiStat } from '@/components/classbot/kpi-stat';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { MetaRow } from '@/components/ui/meta-row';
import { useParentChildren } from '@/hooks/api/parent';
import type { ParentChildItem } from '@/hooks/api/types';
import { countChildAssignments, relationLabel } from './assignment-status';
import { NoChildrenState, ParentErrorState, ParentLoading } from './parent-state';

/**
 * 학부모 홈 — 「우리 아이 요즘 어때요?」에 한 화면으로 답한다.
 *
 * 자녀 한 명이 카드 한 장이다. 카드 안에서 묻는 것은 셋뿐이다 —
 * 어느 수업방에 들어가 있나 · 아직 남은 과제가 몇 개인가 · 그중 늦은 것이 있나.
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
        children.map(child => <ChildSummaryCard key={child.id} child={child} />)
      )}
    </div>
  );
}

/** 자녀 한 명 — 숫자 셋과 수업방 목록. */
function ChildSummaryCard({ child }: { child: ParentChildItem }) {
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
          수업방 {rooms.length}개
        </h3>
        {rooms.length === 0 ? (
          /*
           * 빈 자리는 **왜 비었는지 말하지 않는다** (05 § 11.4 규칙 2).
           * 자녀가 아직 반에 안 들어간 것과, 자녀가 「반·과제 현황」을 안 켠 것
           * (`consent_logs.type = class_assignment_summary`)이 부모에게 같은 모양이어야 한다.
           * 구별되면 그 차이 자체가 정보가 되어, 동의 없이 아이의 활동 유무를 알아낼 수 있다.
           * 그래서 「참여 코드를 받아 들어가면」처럼 한쪽 까닭을 짚는 안내를 두지 않는다.
           */
          <EmptyState
            tone="plain"
            size="sm"
            title="보여줄 수업방이 없어요"
            description="보여줄 것이 생기면 여기에 나와요."
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
    </section>
  );
}
