'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, GraduationCap, Lock, Share2, Sparkles, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { ContextRail } from '@/components/shell/context-rail';
import BackLink from '@/components/classbot/back-link';
import { EmptyState } from '@/components/classbot/empty-state';
import { ComingSoonButton } from '@/components/classbot/coming-soon-button';
import { useMyConsents } from '@/hooks/api/consents';
import { isShareableType } from './share/catalog';
import { useHasServerIdentity } from '@/hooks/api/self-server';
import { useCurrentUser, useRosterMe } from '@/lib/current-user';
import { useClassEnrollmentStore } from '@/lib/store/class-enrollment';
import { useMyRooms } from '@/components/classbot/home/my-rooms';
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
  // 서버 참여 + 데모 스토어를 합쳐 본다 — 스토어만 보면 실제로 참여한 반이 안 보인다.
  const { rooms: myBots, isLoading: roomsLoading } = useMyRooms();
  const hydrated = useStoresHydrated(useClassEnrollmentStore) && !roomsLoading;

  // 학년은 소속 수업(봇)에서 온다 — 학생 행에는 학년 칸이 없다.
  const grade = myBots[0]?.bot.grade;

  // 공유 상태 한 줄. 지금 무엇을 내주고 있는지는 **찾아 들어가야 아는 것**이면 안 된다 —
  // 프로필에 와서 이 줄만 봐도 「켜져 있나」가 보이게 둔다(끄러 오는 길의 첫 표지판이다).
  const shareState = useShareSummary();

  const rail = (
    <>
      <Link
        href="/classbot/me/progress"
        aria-label="학습 기록 — 성취기준마다 어디까지 왔는지 보기"
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
        aria-label="주간 리포트 — 봇이 본 나의 한 주 보기"
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

      <Link
        href="/classbot/me/share"
        aria-label="공유 — 부모님께 무엇을 보여드릴지 정하기"
        className="bg-card hover:bg-pullim-slate-50/50 flex items-center gap-3 rounded-2xl border p-4 transition-colors"
        data-testid="me-share-link"
      >
        <span className="bg-pullim-slate-100 text-pullim-slate-500 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Share2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-pullim-slate-900 text-sm font-bold">공유</div>
          {shareState && (
            <div className="text-pullim-slate-500 mt-0.5 truncate text-2xs">{shareState}</div>
          )}
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
              action={{ href: '/classbot/classroom', label: '참여 코드', ariaLabel: '참여 코드 넣으러 가기' }}
            />
          ) : (
            <ul className="space-y-1.5">
              {myBots.map(({ bot, enrollment }) => {
                const hex = botSignature(bot).hex;
                return (
                  // 여기서 세는 것은 봇이 아니라 소속 반이다 — 같은 봇의 두 반이 한 줄로 접히면 안 된다.
                  <li key={enrollment.classroomId} className="bg-card flex items-center gap-3 rounded-2xl border p-3">
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
              aria-label="풀림 계정으로 가기"
            >
              풀림 계정
            </ComingSoonButton>
          </div>
        </section>
      </ContextRail>
    </div>
  );
}

/**
 * 사이드 링크에 붙는 공유 상태 한 줄.
 *
 * 「켜져 있나」만 답한다 — 범위·날짜는 적지 않는다. 이 줄이 길어지면 프로필에서 결정을
 * 내리게 되는데, 그 결정에 필요한 나머지 절반(무엇이 나가나 · 되돌릴 수 없다는 것)은
 * 저쪽 화면에만 있다. 여기서는 **들어가 볼 이유**까지만 준다.
 *
 * 아직 모를 때(신원 없음·조회 전·실패)는 상태를 지어내지 않고 `null` 을 준다 —
 * 「안 보여요」라고 적었다가 실은 켜져 있으면 학생이 껐다고 착각한다.
 *
 * ## 세는 범위를 **문구가 밝힌다**
 *
 * `GET /api/me/consents` 는 타입으로 거르지 않는다 — 교사·기관 승인 흐름이 넣은 동의
 * (주간 리포트 등)도 같은 목록에 섞여 온다(계약 `MyConsentRow`). 그건 공유 화면이 켜지도
 * 끄지도 못하는 종류라 여기서 세면 안 되고(`isShareableType`), 그렇게 걸러 놓고
 * 「지금은 **아무것도** 안 보여요」라고 쓰면 **거른 만큼이 거짓말이 된다.** 그래서 문구가
 * 「여기서 켠」으로 범위를 밝힌다 — 세는 범위와 말하는 범위를 같게 둔다.
 * @returns 한 줄 문구, 아직 모르면 null
 */
function useShareSummary(): string | null {
  const hasServerIdentity = useHasServerIdentity();
  const consents = useMyConsents();

  if (!hasServerIdentity || consents.isError || consents.data === undefined) return null;

  // 응답에는 이 화면 소관이 아닌 동의도 섞여 올 수 있다 — 세기 전에 거른다(`isShareableType`).
  const mine = consents.data.consents.filter((row) => isShareableType(row.type));

  /*
    다른 보호자에게 남은 공유가 **가장 먼저** 나온다.

    지금 보호자께 켠 것이 함께 있어도 이 줄이 이긴다 — 이 한 줄의 일은 「들어가 볼 이유」를
    주는 것이고, 학생이 모르고 있을 가능성이 가장 큰 상태가 이쪽이다(주 보호자가 바뀌면
    저절로 생긴다). 누구인지는 적지 않는다 — 서버가 주지 않고 끄는 데도 필요 없다.
  */
  if (mine.some((row) => !row.toCurrentParent)) return '다른 보호자께 남은 공유가 있어요';
  if (consents.data.parent === null) return '연결된 보호자가 없어요';
  if (mine.length === 0) return '여기서 켠 공유는 없어요';
  return `${consents.data.parent.name}께 보여드리는 중`;
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
            <span className="bg-pullim-slate-100 text-pullim-slate-500 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-2xs font-bold">
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
