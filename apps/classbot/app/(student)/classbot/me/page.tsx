'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, GraduationCap, Lock, Sparkles, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { ContextRail } from '@/components/shell/context-rail';
import BackLink from '@/components/classbot/back-link';
import { EmptyState } from '@/components/classbot/empty-state';
import { ComingSoonButton } from '@/components/classbot/coming-soon-button';
import { useCurrentUser, useRosterMe } from '@/lib/current-user';
import { useClassEnrollmentStore, useMyClassBots } from '@/lib/store/class-enrollment';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import { Skeleton } from '@/components/ui/skeleton';
import { botSignature } from '@/lib/tokens/bot-signature';

/** 역할 표시 이름 — 화면에서는 바꿀 수 없다(가입 때 정해진다). */
const roleLabel: Record<string, string> = {
  student: '학생',
  teacher: '선생님',
  admin: '관리자',
};

/**
 * 내 정보 — SCR-C-15 / FR-COM-10.
 *
 * 여기는 **클래스봇 안에서만 뜻이 있는 것**을 보여준다 — 이름·학년·소속 수업, 그리고 역할(읽기 전용).
 * 비밀번호·이메일·알림처럼 풀림 통합 계정의 「내 계정」(SCR-COM-06)과 겹치는 항목은
 * 여기서 다시 만들지 않고 그쪽으로 보낸다(두 곳에서 고칠 수 있으면 어느 쪽이 참인지 흐려진다).
 */
export default function MyProfilePage() {
  const me = useRosterMe();
  const user = useCurrentUser();
  const myBots = useMyClassBots();
  const hydrated = useStoresHydrated(useClassEnrollmentStore);

  // 학년은 소속 수업(봇)에서 온다 — 학생 행에는 학년 칸이 없다.
  const grade = myBots[0]?.bot.grade;

  const rail = (
    <>
      <Link
        href="/classbot/me/progress"
        className="bg-pullim-blue-600 hover:bg-pullim-blue-700 flex items-center gap-3 rounded-2xl p-4 text-white transition-colors"
      >
        <span className="bg-white/15 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <BarChart3 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">학습 기록</div>
        </div>
        <ArrowRight className="h-4 w-4" />
      </Link>

      <Link
        href="/classbot/me/report"
        className="bg-card hover:bg-pullim-slate-50/50 flex items-center gap-3 rounded-2xl border p-4 transition-colors"
      >
        <span className="bg-pullim-slate-100 text-pullim-slate-500 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-pullim-slate-900 text-sm font-bold">주간 리포트</div>
        </div>
        <ArrowRight className="text-pullim-slate-300 h-4 w-4" />
      </Link>
    </>
  );

  return (
    <div className="space-y-4">
      <BackLink href="/classbot">클래스봇 홈</BackLink>

      <PageHeader eyebrow={{ icon: UserRound, text: '내 정보' }} title={me.name} />

      <ContextRail railWidth="md" stickyRail rail={rail}>
        {/* ─── 기본 정보 ─── */}
        <section className="bg-card rounded-2xl border p-4">
          <SectionHeading title="기본 정보" />
          <dl className="divide-pullim-slate-100 divide-y">
            <InfoRow label="이름" value={me.name} />
            <InfoRow label="학년" value={grade ?? '수업에 참여하면 보여요'} muted={!grade} />
            <InfoRow
              label="역할"
              value={roleLabel[user.role] ?? user.role}
              note="역할은 가입할 때 정해져요. 여기서는 바꿀 수 없어요."
              locked
            />
          </dl>
        </section>

        {/* ─── 소속 수업 ─── */}
        <section>
          <SectionHeading title="소속 수업" />
          {!hydrated ? (
            <div className="space-y-1.5" aria-busy="true">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : myBots.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="아직 참여한 수업이 없어요"
              description="선생님께 받은 참여 코드를 넣으면 여기에 반이 생겨요."
              action={{ href: '/classbot', label: '참여 코드' }}
            />
          ) : (
            <ul className="space-y-1.5">
              {myBots.map(({ bot, enrollment }) => {
                const hex = botSignature(bot).hex;
                return (
                  <li
                    key={bot.id}
                    className="bg-card flex items-center gap-3 rounded-2xl border border-l-[3px] p-3"
                    style={{ borderLeftColor: hex }}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                      style={{ backgroundColor: hex }}
                    >
                      {bot.avatarEmoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-pullim-slate-900 truncate text-sm font-bold">
                        {enrollment.classroomLabel}
                      </p>
                      <p className="text-pullim-slate-500 mt-0.5 truncate text-2xs">
                        {bot.name} · {enrollment.assignedBy}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ─── 풀림 계정 — 여기서 고치지 않는다 ─── */}
        <section className="bg-pullim-slate-50 rounded-2xl border p-4">
          <SectionHeading
            title="풀림 계정에서 고쳐요"
            description="비밀번호 · 이메일 · 알림은 풀림 통합 계정의 「내 계정」에서 한 번만 고쳐요."
          />
          <div className="mt-3">
            <ComingSoonButton
              asButton
              variant="outline"
              size="sm"
              note="풀림 통합 계정 「내 계정」 연결"
            >
              풀림 계정
            </ComingSoonButton>
          </div>
        </section>
      </ContextRail>
    </div>
  );
}

function InfoRow({
  label,
  value,
  note,
  locked = false,
  muted = false,
}: {
  label: string;
  value: string;
  note?: string;
  locked?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-pullim-slate-500 w-16 shrink-0 text-xs font-semibold">{label}</dt>
      <dd className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={muted ? 'text-pullim-slate-400 text-sm' : 'text-pullim-slate-900 text-sm font-bold'}>
            {value}
          </span>
          {locked && (
            <span className="bg-pullim-slate-100 text-pullim-slate-500 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-micro font-bold">
              <Lock className="h-2.5 w-2.5" aria-hidden />
              읽기 전용
            </span>
          )}
        </div>
        {note && <p className="text-pullim-slate-500 mt-0.5 text-2xs leading-relaxed">{note}</p>}
      </dd>
    </div>
  );
}
