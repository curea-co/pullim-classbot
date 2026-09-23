'use client';

import { useRef, useState } from 'react';
import { ClipboardList, Lock, MessageCircle, SearchX, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/classbot/empty-state';
import { LifecycleConfirmDialog } from '@/components/classbot/lifecycle-confirm-dialog';
import { ReadErrorState } from '@/components/classbot/read-state';
import { SectionHeading } from '@/components/shell/section-heading';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { useClassMembers, useRemoveClassMember } from '@/hooks/api/classroom';
import { isNotFound, isUnauthorized, statusOf } from '@/lib/api/classbot-client';
import type { ClassMemberDto } from '@/lib/api/classbot-dto';
import { memberLabel } from '@/lib/interventions';
import { InterventionDialog, type InterventionKind } from './intervention-dialog';

/**
 * 반 상세 「명단」 탭 — `GET /classbot/classes/:classId/members`(`useClassMembers` · 계획 PR 5b · 완성 설계 § 5 R3 ·
 * § 6.2 「반 상세」). 계획 PR 5a 가 카드에서 내린 같은 오리진 명단(`classroom-roster.tsx` · #351 삭제)을 **정본 문**으로
 * 되살린 것이다 — 반 id 가 정본 것이라 같은 화면의 코드·과제와 같은 세계다.
 *
 * **머리글 있는 진짜 표**다(#264 「표 아닌 표」): 한 줄에 값이 넷(이름 · 들어온 날 · 마지막 활동 · 활성)이라 무엇이
 * 무엇인지 말하는 자리가 머리글밖에 없다. 관제소 표 껍데기(`components/classbot/roster-table.tsx`)를 빌리지 않는
 * 이유는 그 표가 `MonitoredStudent`(도달·이탈)를 전제해서다 — 여기 줄은 정본 `ClassMemberDto` 다.
 *
 * 칸마다 정본이 준 대로 그린다:
 *  - `displayName` 은 auth 프로필 투영이라 **null 로 올 수 있다**(탈퇴·부재 · 완성 설계 해소 5). 이름을 지어내지 않고
 *    「이름 없음」 + sub 앞 여덟 자로 구분만 되게 한다.
 *  - `lastActiveAt` 은 대화·제출 중 최신 시각(없으면 null) — 「무활동」 파생의 원천이다(완성 설계 § 7 장시간 무활동).
 *    분·시간·일로 끊어 읽고, 없으면 「아직 없음」. 날짜로 떨어질 때는 들어온 날과 같은 시간대(Asia/Seoul)다.
 *  - 활성 멤버십만 온다(서버 필터) — 그래도 `isActive` 칸은 그린다. 그 뜻이 바뀌는 날 화면이 먼저 알아채게.
 *
 * 남의 반은 정본이 **403**, 없는 반은 404 — 머리(`class-detail.tsx`)가 이미 갈라 말했겠지만 이 탭도 제 상태로
 * 선다(탭은 머리와 다른 문을 두드린다 — 머리가 열렸는데 명단만 닫힐 수 있다).
 *
 * **줄 끝의 「리마인드」·「코멘트」**(계획 PR 5c)는 `POST /classbot/classes/:classId/interventions` 로 가는 문이다 —
 * 판은 `./intervention-dialog.tsx` 하나를 돌려 쓴다(줄마다 한 벌씩 두면 명단만큼 폼이 선다). 비활성 멤버에게는
 * 버튼을 내지 않는다 — 서버가 비멤버·비활성 대상을 400 으로 막는다(`intervention.service.ts` `send`).
 */

/** 표의 시간대 — 저장은 UTC ISO, 보여줄 때는 한국 시각. 두 열이 같은 기준을 쓴다. */
const ROSTER_TIME_ZONE = 'Asia/Seoul';

/** 들어온 날 — `9월 16일`. */
const enrolledFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: ROSTER_TIME_ZONE,
  month: 'long',
  day: 'numeric',
});

/** 오래된 활동 — `9/1`(월/일). */
const staleFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: ROSTER_TIME_ZONE,
  month: 'numeric',
  day: 'numeric',
});

/**
 * 들어온 날 라벨.
 * @param iso - `enrolledAt`
 * @returns `9월 16일` · 못 읽으면 `—`
 */
export function formatEnrolledAt(iso: string): string {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? '—' : enrolledFormatter.format(at);
}

/**
 * 마지막 활동 라벨 — 교사가 이 값으로 하는 결정은 「요즘 하고 있나」 하나라 분·시간·일로만 끊는다.
 * @param iso - `lastActiveAt`(null = 활동 없음)
 * @param now - 지금(테스트 주입용)
 * @returns `방금` · `n분 전` · `n시간 전` · `n일 전` · 그보다 오래면 `M/D`(Asia/Seoul) · 없으면 `아직 없음`
 */
export function lastActiveLabel(iso: string | null, now: number = Date.now()): string {
  if (!iso) return '아직 없음';
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return '—';
  const min = Math.floor((now - at) / 60_000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  if (min < 24 * 60) return `${Math.floor(min / 60)}시간 전`;
  if (min < 7 * 24 * 60) return `${Math.floor(min / (24 * 60))}일 전`;
  return staleFormatter.format(new Date(at));
}

/** 머리글 칸 — 한국어라 12px(`text-2xs`)이 하한이다. */
const headCell = 'text-pullim-slate-500 px-2 pb-2 text-left text-2xs font-bold whitespace-nowrap';

/** 값 칸 — 줄 사이 선은 칸에 그린다(표가 `border-separate` 라 줄에 그리면 안 보인다). */
const cell = 'border-pullim-slate-100 border-t px-2 py-2.5 align-middle whitespace-nowrap';

export function ClassroomRoster({
  classId,
  classroomName,
  readOnly = false,
}: {
  /** 반 id(pullim-api). */
  classId: string;
  /** 반 이름 — 표 이름에 넣는다(낭독기에 어느 반 표인지). */
  classroomName: string;
  readOnly?: boolean;
}) {
  const query = useClassMembers(classId);
  /** 열려 있는 개입 판 — 명단 전체가 판 하나를 돌려 쓴다. */
  const [target, setTarget] = useState<{ member: ClassMemberDto; kind: InterventionKind } | null>(null);
  /** 판이 닫힐 때 포커스를 돌려줄 자리 — 방금 누른 줄의 버튼. */
  const openerRef = useRef<HTMLButtonElement>(null);
  const rosterRef = useRef<HTMLDivElement>(null);
  const [removeTarget, setRemoveTarget] = useState<ClassMemberDto | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const remove = useRemoveClassMember();

  const heading = (
    <SectionHeading
      title={query.isSuccess ? `명단 ${query.data.length}명` : '명단'}
      description="들어온 순서예요. 마지막 활동은 대화·제출 중 최근 것이에요."
    />
  );

  if (query.isPending) {
    return (
      <>
        {heading}
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      </>
    );
  }

  if (query.isError) {
    // 401 은 머리가 이미 게이트로 섰거나 로그인으로 가는 중이다 — 여기서 또 말하지 않는다.
    if (isUnauthorized(query.error)) return heading;
    if (statusOf(query.error) === 403) {
      return (
        <>
          {heading}
          <EmptyState
            icon={Lock}
            size="md"
            title="이 반의 명단은 볼 수 없어요"
            description="반의 운영 교사만 명단을 볼 수 있어요."
          />
        </>
      );
    }
    if (isNotFound(query.error)) {
      return (
        <>
          {heading}
          <EmptyState icon={SearchX} size="md" title="없는 반이에요" description="주소가 바뀌었거나 반이 닫혔을 수 있어요." />
        </>
      );
    }
    return (
      <>
        {heading}
        <ReadErrorState onRetry={() => void query.refetch()} />
      </>
    );
  }

  const members = query.data;

  if (members.length === 0) {
    return (
      <>
        {heading}
        <EmptyState
          icon={Users}
          size="md"
          title="아직 들어온 학생이 없어요"
          description="위 참여 코드를 학생에게 알려 주세요."
        />
      </>
    );
  }

  return (
    <>
      {heading}
      {/* 가로로 미는 것은 표뿐이다 — 본문은 가로 스크롤을 갖지 않는다. */}
      <div ref={rosterRef} tabIndex={-1} className="overflow-x-auto rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50">
        <table
          aria-label={`${classroomName} 명단 ${members.length}명`}
          style={{ minWidth: '38rem' }}
          className="w-full border-separate border-spacing-0"
          data-testid="classroom-roster"
        >
          <thead>
            <tr>
              <th scope="col" className={headCell}>이름</th>
              <th scope="col" className={headCell}>들어온 날</th>
              <th scope="col" className={headCell}>마지막 활동</th>
              <th scope="col" className={headCell}>활성</th>
              <th scope="col" className={headCell}>보내기</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <MemberRow
                key={m.membershipId}
                member={m}
                readOnly={readOnly}
                onSend={(kind, button) => {
                  openerRef.current = button;
                  setTarget({ member: m, kind });
                }}
                onRemove={(button) => {
                  openerRef.current = button;
                  setRemoveTarget(m);
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      {target && (
        <InterventionDialog
          classId={classId}
          kind={target.kind}
          member={target.member}
          open
          onOpenChange={(next) => {
            if (!next) setTarget(null);
          }}
          finalFocus={openerRef}
        />
      )}
      {removeTarget && (
        <LifecycleConfirmDialog
          open
          onOpenChange={(open) => { if (!open) { setRemoveTarget(null); setRemoveError(null); } }}
          title={`${memberLabel(removeTarget)} 학생을 「${classroomName}」에서 내보낼까요?`}
          description="이후 새 과제와 반 대화에 참여할 수 없어요. 기존 제출과 대화 기록은 남아요. 다시 참여하려면 새 참여 코드가 필요해요."
          confirmLabel="내보내기"
          pendingLabel="내보내는 중…"
          isPending={remove.isPending}
          error={removeError}
          finalFocus={openerRef}
          onConfirm={() => {
            setRemoveError(null);
            remove.mutate(
              { classId, memberId: removeTarget.memberId },
              {
                onSuccess: () => {
                  const label = memberLabel(removeTarget);
                  setRemoveTarget(null);
                  toast.success(`${label} 학생을 반에서 내보냈어요.`);
                  requestAnimationFrame(() => rosterRef.current?.focus());
                },
                onError: () => setRemoveError('학생을 내보내지 못했어요. 명단을 새로고침한 뒤 다시 시도해 주세요.'),
              },
            );
          }}
        />
      )}
    </>
  );
}

/** 명단 한 줄. 이름이 비면 지어내지 않는다 — 「이름 없음」과 sub 앞 여덟 자. */
function MemberRow({
  member: m,
  onSend,
  onRemove,
  readOnly,
}: {
  member: ClassMemberDto;
  onSend: (kind: InterventionKind, button: HTMLButtonElement) => void;
  onRemove: (button: HTMLButtonElement) => void;
  readOnly: boolean;
}) {
  const name = m.displayName?.trim() || null;
  return (
    <tr data-testid={`classroom-member-${m.memberId}`}>
      <th scope="row" className={`${cell} text-left font-normal`}>
        <span className="flex items-center gap-2">
          <span className="bg-pullim-slate-100 text-pullim-slate-700 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-2xs font-bold">
            {name ? name.slice(0, 1) : '?'}
          </span>
          {name ? (
            <span className="text-pullim-slate-900 text-sm leading-tight font-bold">{name}</span>
          ) : (
            <span className="text-pullim-slate-500 text-sm leading-tight">
              이름 없음 <span className="font-mono text-2xs">{m.memberId.slice(0, 8)}</span>
            </span>
          )}
        </span>
      </th>
      <td className={`${cell} text-pullim-slate-500 text-2xs`}>{formatEnrolledAt(m.enrolledAt)}</td>
      <td className={`${cell} text-pullim-slate-700 text-2xs`} data-testid={`classroom-member-active-${m.memberId}`}>
        {lastActiveLabel(m.lastActiveAt)}
      </td>
      <td className={cell}>
        {m.isActive ? <Chip tone="info">활성</Chip> : <Chip tone="neutral">비활성</Chip>}
      </td>
      <td className={cell}>
        {m.isActive && !readOnly ? (
          <span className="flex items-center gap-1">
            <RowAction member={m} kind="remind" icon={ClipboardList} label="리마인드" onSend={onSend} />
            <RowAction member={m} kind="comment" icon={MessageCircle} label="코멘트" onSend={onSend} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-pullim-danger h-9 px-2.5"
              aria-label={`${memberLabel(m)} 학생 내보내기`}
              onClick={(event) => onRemove(event.currentTarget)}
            >
              <Trash2 aria-hidden className="h-3.5 w-3.5" />
              내보내기
            </Button>
          </span>
        ) : (
          <span className="text-pullim-slate-400 text-2xs">—</span>
        )}
      </td>
    </tr>
  );
}

/**
 * 줄 끝 버튼 하나 — 글자는 단어 하나라 어느 학생인지가 빠진다. 낭독기에는 이름을 실어 준다.
 * 버튼 자신을 콜백에 넘겨 판이 닫힐 때 여기로 포커스가 돌아오게 한다.
 */
function RowAction({
  member,
  kind,
  icon: Icon,
  label,
  onSend,
}: {
  member: ClassMemberDto;
  kind: InterventionKind;
  icon: typeof ClipboardList;
  label: string;
  onSend: (kind: InterventionKind, button: HTMLButtonElement) => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 px-2.5"
      aria-label={`${memberLabel(member)} 학생에게 ${label}`}
      data-testid={`intervention-${kind}-${member.memberId}`}
      onClick={(event) => onSend(kind, event.currentTarget)}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
