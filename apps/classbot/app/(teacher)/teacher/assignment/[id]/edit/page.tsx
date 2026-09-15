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
import { computeDDay, formatDueLabel } from '@/lib/assignment-due';
import { useAssignmentStore, type UserAssignment } from '@/lib/store/assignments';
import { useStoresHydrated } from '@/lib/store/use-hydrated';
import { assignmentModeBadge } from '@/lib/tokens/assignment-state';
import { statusOf } from '../../assignment-filters';
import { useAssignmentWrite } from '../../use-assignment-write';

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
  const { write, isPending } = useAssignmentWrite();

  const [title, setTitle] = useState(assignment.title);
  const [reasonHint, setReasonHint] = useState(assignment.reasonHint ?? '');
  const [dueIso, setDueIso] = useState('');
  const [dueError, setDueError] = useState<string | null>(null);

  const isDraft = statusOf(assignment) === 'draft';
  const mode = assignmentModeBadge[assignment.mode];

  /*
    마감을 견주는 값은 **시각이지 라벨이 아니다.**

    종전에는 `dDay` 라벨끼리 견줬는데 두 방향으로 틀렸다.
      ① 당기기를 통과시켰다 — `computeDDay` 는 지금보다 이른 시각을 **전부** `'오늘'`(=0)로
         접는다. 그래서 지금 마감이 `'오늘'` 인 과제는 **어제로도** 옮겨졌다(`0 < 0` 이 거짓).
      ② 연장을 거절했다 — `dDay` 는 낼 때 굳은 문자열이라 안 움직인다. 닷새 전에 `'D-7'` 로
         낸 과제는 오늘도 `'D-7'` 이고, 이틀 뒤로 **늘리는** 것이 `2 < 7` 로 걸렸다.

    그래서 실제 마감 시각(`dueAt`)을 견준다. 옛 행에는 그 값이 없으므로 그때는 **연장 여부를
    모른다** — 모를 때 통과시키지 않고 지킬 수 있는 최소선만 지킨다: 마감은 지금보다 뒤여야 한다.

    판정을 **고를 때** 하고 렌더에서는 하지 않는다. 렌더에서 `Date.now()` 를 읽으면 순수하지
    않을뿐더러(lint), 탭을 오래 열어 둔 사이 기준이 흘러 같은 화면이 다른 답을 낸다.
  */
  const knownCurrent = assignment.dueAt != null && Number.isFinite(new Date(assignment.dueAt).getTime());

  function pickDue(next: string) {
    setDueIso(next);
    if (!next || isDraft) {
      setDueError(null);
      return;
    }
    const nextAt = new Date(next).getTime();
    if (!Number.isFinite(nextAt)) {
      setDueError('날짜를 읽지 못했어요. 다시 골라 주세요.');
      return;
    }
    if (nextAt <= Date.now()) {
      setDueError('지금보다 이른 날짜예요. 마감은 지난 시각으로 옮길 수 없어요.');
      return;
    }
    const currentAt = assignment.dueAt ? new Date(assignment.dueAt).getTime() : NaN;
    if (Number.isFinite(currentAt) && nextAt <= currentAt) {
      setDueError('지금 마감보다 이르거나 같아요. 마감은 늘리는 것만 돼요.');
      return;
    }
    setDueError(null);
  }

  const dirty =
    title.trim() !== assignment.title ||
    reasonHint.trim() !== (assignment.reasonHint ?? '') ||
    dueIso !== '';
  const canSave = dirty && title.trim().length > 0 && dueError == null;

  async function save() {
    if (!canSave) return;
    const patch: Partial<UserAssignment> = {
      title: title.trim(),
      reasonHint: reasonHint.trim() || undefined,
    };
    if (dueIso) {
      patch.dueLabel = formatDueLabel(dueIso);
      patch.dDay = computeDDay(dueIso);
      // 라벨과 **함께** 시각을 적는다 — 다음 수정이 견줄 값이 이것이다(위 주석).
      patch.dueAt = new Date(dueIso).toISOString();
    }
    /*
      서버가 먼저다 — 로그인한 교사의 과제는 DB 행으로도 있고 학생은 그쪽을 읽는다(그 훅 주석).
      실패하면 로컬도 안 고치고 화면도 안 떠난다: 성공 토스트와 오류 토스트가 나란히 뜨면
      교사는 둘 중 무엇을 믿을지 모른다.

      **초안은 건너뛴다.** 초안은 클라이언트 스토어에만 산다(`saveDraft` 는 서버로 안 간다).
      그대로 부르면 소유권 조회가 0행이라 404 → `'failed'` → 편집이 조용히 버려지고 오류만 뜬다.
      마감도 **시각으로** 보낸다 — 라벨은 서버가 만든다(그 라우트 `@param`).
    */
    if (!isDraft) {
      const outcome = await write({
        id: assignment.id,
        title: patch.title,
        reasonHint: patch.reasonHint ?? '',
        ...(dueIso ? { dueAt: new Date(dueIso).toISOString() } : {}),
      });
      if (outcome === 'failed') return;
    }

    update(assignment.id, patch);

    toast.success('고쳤어요');
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
            지금 <b className="text-pullim-slate-900">{assignment.dueLabel}</b>
            {!isDraft && (knownCurrent
              ? ' · 늘리는 것만 돼요 — 당기면 지금 풀고 있는 학생이 잘려요.'
              : ' · 지난 시각으로는 못 옮겨요.')}
          </p>
          <Input
            id="edit-due"
            data-testid="edit-due"
            type="datetime-local"
            value={dueIso}
            onChange={(e) => pickDue(e.target.value)}
          />
          {dueError && (
            <p data-testid="edit-due-error" className="text-pullim-danger text-2xs font-bold">
              {dueError}
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
        {/*
          **「학생에게 알리기」는 아직 없다.** 첫 판에서는 기존 리마인드 개입을 그대로 쓰려 했는데,
          그러면 그 과제의 진짜 리마인드가 죽는다 — `useRemindedStudentIds` 가 `type === 'remind'`
          와 과제 id 만으로 「이미 보냈다」를 판정해서, 수정 알림 한 번이 전 학생에게 remind 이벤트를
          남기고 상세의 [미제출 N명 리마인드] 가 영영 비활성으로 잠긴다.
          제 통로(개입 타입)를 따로 내는 것이 맞고, 그건 별건이다.
        */}
        <span className="text-pullim-slate-500 text-2xs">
          {isDraft ? '아직 안 낸 과제라 알릴 학생이 없어요.' : '바뀐 내용은 학생이 과제를 열 때 보여요.'}
        </span>
        <button
          type="button"
          data-testid="edit-save"
          onClick={() => void save()}
          disabled={!canSave || isPending}
          className="bg-pullim-slate-900 hover:bg-pullim-slate-800 disabled:bg-pullim-slate-200 disabled:text-pullim-slate-400 rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed"
        >
          저장
        </button>
      </section>
    </>
  );
}
