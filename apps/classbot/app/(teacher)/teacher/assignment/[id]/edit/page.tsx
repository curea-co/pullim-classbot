'use client';

import { use, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { EmptyState } from '@/components/classbot/empty-state';
import { SectionHeading } from '@/components/shell/section-heading';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { computeDDay, dDayValue, formatDueLabel } from '@/lib/assignment-due';
import { classRoster } from '@/lib/mock';
import { useAssignmentStore, type UserAssignment } from '@/lib/store/assignments';
import { useInterventionStore } from '@/lib/store/interventions';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import { assignmentModeBadge } from '@/lib/tokens/assignment-state';
import { statusOf } from '../../assignment-filters';

type Params = Promise<{ id: string }>;

/** 낸 뒤에 잠기는 칸과 그 이유 (`proc/spec/14 § 5.7` 잠금 행렬). */
const LOCKED: { label: string; reason: string }[] = [
  { label: '문항', reason: '같은 과제인데 사람마다 다른 시험지가 돼요' },
  { label: '모드 · 봇이 돕는 정도', reason: '이미 낸 답의 조건이 달라져요' },
  { label: '수업방 · 봇', reason: '제출·채점이 매달린 자리라 끊어져요' },
  { label: '시험 시간 제한', reason: '먼저 푼 학생과 나중 학생의 조건이 갈려요' },
];

/**
 * 낸 뒤 수정 (`proc/spec/14 § 3.3.5`).
 *
 * **내기 폼(1030줄)을 재사용하지 않는다.** 낸 뒤에 열리는 칸이 셋뿐이라(§ 5.7), 그 폼에 편집
 * 모드를 꿰는 것보다 **그 셋만 있는 화면**이 작고 잠금 행렬을 눈으로 확인할 수 있다.
 * 가르는 기준은 하나다 — **이미 푼 학생의 결과를 뒤집는 변경인가.**
 *
 * 잠긴 칸을 숨기지 않고 이유와 함께 늘어놓는 이유: 없는 것처럼 보이면 교사가 「왜 못 고치지」가
 * 아니라 「어디 갔지」를 묻게 되고, 그 물음의 답이 화면에 없다.
 */
export default function TeacherAssignmentEditPage({ params }: { params: Params }) {
  const { id } = use(params);
  return <EditScreen id={id} />;
}

function EditScreen({ id }: { id: string }) {
  const dispatched = useAssignmentStore((s) => s.dispatched);
  const drafts = useAssignmentStore((s) => s.drafts);
  const hydrated = useStoresHydrated(useAssignmentStore);
  const assignment = useMemo(
    () => [...dispatched, ...drafts].find((a) => a.id === id),
    [dispatched, drafts, id],
  );

  const shell = (children: React.ReactNode) => (
    <TeacherPageShell
      backHref={`/teacher/assignment/${id}`}
      backLabel="과제 상세"
      header={{ eyebrow: { icon: ClipboardList, text: '평가' }, title: '과제 고치기' }}
    >
      {children}
    </TeacherPageShell>
  );

  if (!hydrated) {
    return shell(
      <div className="text-pullim-slate-500 py-10 text-center text-sm">불러오는 중이에요…</div>,
    );
  }
  if (!assignment) {
    return shell(
      <EmptyState
        icon={ClipboardList}
        title="이 과제를 찾지 못했어요"
        description="지워졌거나 다른 기기에서 낸 과제일 수 있어요."
        action={{ href: '/teacher/assignment', label: '낸 과제로' }}
      />,
    );
  }
  if (statusOf(assignment) === 'withdrawn') {
    // 회수된 과제를 고치면 되돌릴 때 학생이 못 보던 내용을 갑자기 받는다.
    // 되돌린 뒤에 고치는 순서라야 학생이 보는 것과 교사가 고친 것이 어긋나지 않는다.
    return shell(
      <EmptyState
        icon={ClipboardList}
        title="회수한 과제는 고칠 수 없어요"
        description="되돌린 뒤에 고쳐 주세요."
        action={{ href: `/teacher/assignment/${id}`, label: '과제 상세로' }}
      />,
    );
  }

  return shell(<EditForm assignment={assignment} />);
}

function EditForm({ assignment }: { assignment: UserAssignment }) {
  const router = useRouter();
  const update = useAssignmentStore((s) => s.updateDispatched);
  const send = useInterventionStore((s) => s.send);

  const [title, setTitle] = useState(assignment.title);
  const [reasonHint, setReasonHint] = useState(assignment.reasonHint ?? '');
  const [dueIso, setDueIso] = useState('');
  const [notify, setNotify] = useState(true);

  const isDraft = statusOf(assignment) === 'draft';
  const mode = assignmentModeBadge[assignment.mode];

  /*
    연장인지 재는 근거가 **라벨뿐이다** — 과제에 마감 ISO 가 남지 않는다(`dueLabel` · `dDay` 만).
    그래서 새 날짜의 D-day 를 계산해 지금 것과 견준다. 둘 중 하나라도 못 읽으면 검사를
    건너뛴다(`dDayValue` 가 null) — 라벨 규약이 바뀌는 날 모든 날짜를 통과시키지 않기 위해서다.
  */
  const currentDDay = dDayValue(assignment.dDay);
  const nextDDay = dueIso ? dDayValue(computeDDay(dueIso)) : null;
  const shortensDue =
    !isDraft && currentDDay != null && nextDDay != null && nextDDay < currentDDay;

  const dirty =
    title.trim() !== assignment.title ||
    reasonHint.trim() !== (assignment.reasonHint ?? '') ||
    dueIso !== '';
  const canSave = dirty && title.trim().length > 0 && !shortensDue;

  function save() {
    if (!canSave) return;
    const patch: Partial<UserAssignment> = {
      title: title.trim(),
      reasonHint: reasonHint.trim() || undefined,
    };
    if (dueIso) {
      patch.dueLabel = formatDueLabel(dueIso);
      patch.dDay = computeDDay(dueIso);
    }
    update(assignment.id, patch);

    if (notify && !isDraft) {
      /*
        알림은 **새 통로를 만들지 않는다** — 이미 있는 리마인드 개입을 그대로 쓴다
        (`proc/spec/14 § 3.3.5`). 학생은 헤더 벨에서 다른 알림과 같은 자리에서 받는다.
        대상이 비어 있으면 반 전체라는 뜻이라 명단을 펴서 한 명씩 보낸다(개입 스토어 규약).
      */
      const targets = assignment.targetStudentIds.length > 0
        ? assignment.targetStudentIds
        : classRoster.map((s) => s.id);
      for (const studentId of targets) {
        send({
          type: 'remind',
          botId: assignment.botId,
          studentId,
          assignmentId: assignment.id,
          message: `「${title.trim()}」 과제 내용이 바뀌었어요. 다시 확인해 주세요.`,
        });
      }
    }

    toast.success(notify && !isDraft ? '고쳤어요 · 학생에게 알렸어요' : '고쳤어요');
    router.push(`/teacher/assignment/${assignment.id}`);
  }

  return (
    <>
      <section className="bg-card space-y-5 rounded-2xl border p-5 lg:p-6">
        <SectionHeading
          title="고칠 수 있는 것"
          description={isDraft
            ? '아직 아무도 못 받은 과제라 전부 고칠 수 있어요.'
            : '이미 푼 학생의 결과를 뒤집지 않는 것만 고칠 수 있어요.'}
        />

        <div className="space-y-2">
          <Label htmlFor="edit-title">제목</Label>
          <Input
            id="edit-title"
            data-testid="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
          />
          {title.trim().length === 0 && (
            <p className="text-pullim-danger text-2xs font-bold">제목은 비울 수 없어요.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-hint">봇 한 마디 (선택)</Label>
          <Textarea
            id="edit-hint"
            data-testid="edit-hint"
            value={reasonHint}
            onChange={(e) => setReasonHint(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="왜 이 과제를 받았는지 학생에게 한 줄로 알려줘요."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-due">마감</Label>
          <p className="text-pullim-slate-500 text-2xs">
            지금 <b className="text-pullim-slate-900">{assignment.dDay} ({assignment.dueLabel})</b>
            {!isDraft && ' · 늘리는 것만 돼요 — 당기면 지금 풀고 있는 학생이 잘려요.'}
          </p>
          <Input
            id="edit-due"
            data-testid="edit-due"
            type="datetime-local"
            value={dueIso}
            onChange={(e) => setDueIso(e.target.value)}
          />
          {shortensDue && (
            <p data-testid="edit-due-error" className="text-pullim-danger text-2xs font-bold">
              지금보다 이른 날짜예요. 마감은 늘리는 것만 돼요.
            </p>
          )}
        </div>
      </section>

      {!isDraft && (
        <section data-testid="edit-locked" className="bg-pullim-slate-50/60 space-y-3 rounded-2xl border border-dashed p-5">
          <div className="text-pullim-slate-600 flex items-center gap-1.5 text-xs font-bold">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            이미 낸 과제라 잠긴 것
          </div>
          <ul className="space-y-2">
            {LOCKED.map((f) => (
              <li key={f.label} className="flex flex-wrap items-baseline gap-x-2 text-2xs">
                <span className="text-pullim-slate-900 font-bold">{f.label}</span>
                <span className="text-pullim-slate-500">{f.reason}</span>
              </li>
            ))}
            <li className="flex flex-wrap items-baseline gap-x-2 text-2xs">
              <span className="text-pullim-slate-900 font-bold">대상에서 빼기</span>
              <span className="text-pullim-slate-500">그 학생이 낸 답이 갈 곳을 잃어요</span>
            </li>
          </ul>
          <p className="text-pullim-slate-500 text-2xs">
            이 중 하나를 고쳐야 하면 <b className="text-pullim-slate-900">회수하고 복제해서 다시 내요.</b>
            {' '}지금 모드는 <b className="text-pullim-slate-900">{mode.label}</b>이에요.
          </p>
        </section>
      )}

      <section className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
        {!isDraft ? (
          <label className="text-pullim-slate-600 flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              data-testid="edit-notify"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="accent-pullim-blue-600 h-4 w-4"
            />
            바뀐 내용을 학생에게 알릴까요?
          </label>
        ) : (
          <span className="text-pullim-slate-500 text-2xs">아직 안 낸 과제라 알릴 학생이 없어요.</span>
        )}
        <button
          type="button"
          data-testid="edit-save"
          onClick={save}
          disabled={!canSave}
          className="bg-pullim-slate-900 hover:bg-pullim-slate-800 disabled:bg-pullim-slate-200 disabled:text-pullim-slate-400 rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed"
        >
          저장
        </button>
      </section>
    </>
  );
}
