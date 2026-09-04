'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft, Send, Save, Eye, Sparkles,
  CheckCircle2, Users, Calendar, BookOpen, Shield, Plus, Scale, Split, School,
} from 'lucide-react';
import { AlertCard } from '@/components/classbot/alert-card';
import { BotNote } from '@/components/classbot/bot-note';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  classBots,
  getBotCurriculum,
  type AssignmentMode, type BotCurriculumUnit,
  type Assignment, type ScopeLevel,
} from '@/lib/mock';
import { ApiClientError } from '@/lib/api/client-fetch';
import { useClassroomStudents, useTeacherClassrooms } from '@/hooks/api/classroom';
import { useDispatchAssignment } from '@/hooks/api/assignment-dispatch';
import type { TeacherClassroomItem } from '@/hooks/api/types';
import { useAssignmentStore, nextAssignmentId, type UserAssignment } from '@/lib/store/assignments';
import {
  QuestionListEditor, PointsTally, createDefaultQuestions, makeQuestion,
  evenlySplitPoints, sumPoints, authoredCount, gradingTally, toAssignmentQuestions,
  missingAnswerNumbers, isPartiallyAuthored, maxQuestionsFor,
  MIN_QUESTIONS, TOTAL_POINTS, type DraftQuestion,
} from './question-editor';
import { formatDueLabel, computeDDay } from '@/lib/assignment-due';
import { cn } from '@/lib/utils';
import { assignmentModeBadge } from '@/lib/tokens/assignment-state';

type ModeMeta = { label: string; description: string; color: string; defaultScope: ScopeLevel };

const modeOptions: Record<AssignmentMode, ModeMeta> = {
  practice: {
    label: '연습',
    description: '봇이 단계별 힌트로 도와주는 학습용 과제',
    color: assignmentModeBadge.practice.outline,
    defaultScope: 4,
  },
  exam: {
    label: '시험',
    description: '봇 잠금 + 시간 제한 — 평가 환경',
    color: assignmentModeBadge.exam.outline,
    defaultScope: 1,
  },
  'wrong-conquest': {
    label: '오답정복',
    description: '봇이 정답·반례까지 즉시 노출 — 패턴 정복용',
    color: assignmentModeBadge['wrong-conquest'].outline,
    defaultScope: 5,
  },
};

const difficultyOptions = ['하', '중', '상'] as const;

function defaultDueLabel(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(22, 0, 0, 0);
  return tomorrow.toISOString().slice(0, 16);
}

// formatDueLabel/computeDDay 는 재발사(제출 현황 시트)와 공유 — lib/assignment-due.ts 로 추출됨.

/** 봇이 붙은 수업방 — 과제는 `bot_id` 로 방에 매이므로 봇 없는 반에는 낼 수 없다. */
type DispatchableRoom = TeacherClassroomItem & { botId: string };

/**
 * `initialBotId` — 운영 화면 봇 카드의 「과제 내기」가 어느 봇에서 눌렸는지 (`?bot=`).
 * 실어 오지 않거나 내 방이 아닌 봇이면 목록 첫 방으로 연다.
 *
 * 발사 봇 목록은 **DB 의 내 수업방**(`GET /api/teacher/classrooms`)에서 온다.
 * mock 카탈로그(`classBots`)를 쓰면 안 된다 — 발사는 `POST /api/teacher/assignments` 가
 * `class_bots.teacher_id = 나` 로 소유권을 검사하므로, 카탈로그에만 있는 봇 id 는
 * 그 자리에서 404 로 튕긴다. 대상 학생도 같은 이유로 **그 방의 실제 참여자**여야 한다
 * (서버가 `enrollments` 로 대조한다).
 */
export function AssignmentForm({ initialBotId = '' }: { initialBotId?: string }) {
  const router = useRouter();
  const dispatch = useAssignmentStore((s) => s.dispatch);

  const classroomsQuery = useTeacherClassrooms();
  const dispatchAssignment = useDispatchAssignment();

  // 입력 state — 초기값으로 자동 채움
  const [botId, setBotId] = useState<string>(initialBotId);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<AssignmentMode>('practice');
  const [difficulty, setDifficulty] = useState<'하' | '중' | '상'>('중');
  const [unitId, setUnitId] = useState<string>('');
  const [questions, setQuestions] = useState<DraftQuestion[]>(createDefaultQuestions);
  /** 지정 대상. `null` = 아직 손대지 않음 = 반 전체 — 명단이 늦게 도착해도 고른 것이 어긋나지 않는다. */
  const [targetIds, setTargetIds] = useState<string[] | null>(null);
  const [dueIso, setDueIso] = useState(defaultDueLabel());
  const [botMessage, setBotMessage] = useState('');
  const [examTimeLimit, setExamTimeLimit] = useState(60);

  const [preview, setPreview] = useState(false);

  /*
    고른 방은 **state 가 아니라 파생**이다 — 목록이 늦게 도착하므로, 첫 방으로 되돌리는 일을
    effect 로 하면 교사가 고른 방을 나중에 덮어쓸 수 있다. 고른 id 가 목록에 없으면
    (아직 안 왔거나 남의 봇이면) 그때만 첫 방으로 읽는다.
  */
  /*
    비로그인(401)은 **오류가 아니라 데모 상태**다.
    prod(classbot.pullim.ai)는 공개 화면이라 방문자에게 세션이 없고, prod-verify 도 쿠키 없이
    이 화면을 친다. 401 을 오류로 그리면 공개 데모에서 이 화면이 통째로 죽는다 —
    같은 판단을 학생 쪽 `app/(student)/classbot/classroom/page.tsx` 가 이미 하고 있다.
    그래서 세션이 없을 때는 mock 카탈로그로 폼을 굴리고, 발사도 API 를 건드리지 않고
    로컬 사본에만 쓴다(아래 handleDispatch). mock 봇 id 를 서버로 보내면 소유권 검사에서
    404 로 튕기므로, **두 경로를 섞지 않는 것**이 이 분기의 핵심이다.
  */
  const signedOut =
    classroomsQuery.isError &&
    classroomsQuery.error instanceof ApiClientError &&
    classroomsQuery.error.status === 401;

  const demoRooms = useMemo<DispatchableRoom[]>(
    () =>
      classBots.map((b) => ({
        classroomId: `demo_${b.id}`,
        label: `${b.grade} ${b.subject}`,
        organization: b.organization,
        botId: b.id,
        botName: b.name,
        subject: b.subject,
        grade: b.grade,
        studentCount: 0,
        joinCode: null,
        isPublished: false,
        publishedAt: null,
        publishBlurb: null,
      })),
    [],
  );

  const rooms = useMemo<DispatchableRoom[]>(
    () =>
      signedOut
        ? demoRooms
        : (classroomsQuery.data?.classrooms ?? []).filter(
            (r): r is DispatchableRoom => typeof r.botId === 'string' && r.botId.length > 0,
          ),
    [signedOut, demoRooms, classroomsQuery.data],
  );
  const room = rooms.find(r => r.botId === botId) ?? rooms[0];
  const selectedBotId = room?.botId ?? '';
  const noRooms = !classroomsQuery.isPending && !classroomsQuery.isError && rooms.length === 0;

  /*
    대상 명단 — 이 방에 실제로 들어와 있는 학생. 방을 고르기 전에는 조회하지 않는다.

    **비로그인 데모에서도 조회하지 않는다.** 그때 `room` 은 위 `demoRooms` 라 classroomId 가
    `demo_*` — 서버에 없는 id 다. 보내 봐야 401 이 돌아오고, 그 401 을 아래 ③ 대상 섹션이
    「명단을 불러오지 못했어요」 오류로 그리면 **공개 데모가 고장난 화면으로 보인다.**
    위 `signedOut` 주석이 정한 「두 경로를 섞지 않는다」가 명단에도 그대로 걸린다.
  */
  const studentsQuery = useClassroomStudents(signedOut ? undefined : room?.classroomId);
  const students = useMemo(() => studentsQuery.data?.students ?? [], [studentsQuery.data]);
  const selectedIds = targetIds ?? students.map(s => s.id);
  // 전원 = 반 전체(빈 배열)로 보낸다 — 나중에 들어오는 학생도 같은 과제를 받는다.
  const allSelected = targetIds === null || selectedIds.length === students.length;

  // 자동 채움 — 단원 카탈로그는 mock 이 소유한다(DB 에 커리큘럼 테이블이 없다).
  // 새로 연 수업방의 봇은 카탈로그에 없어 단원이 비는데, 그때는 「단원 미정」으로 낸다.
  const curriculum = useMemo<BotCurriculumUnit[]>(() => getBotCurriculum(selectedBotId), [selectedBotId]);
  const selectedUnit = curriculum.find(u => u.id === unitId) ?? curriculum[0];

  // 봇 변경 핸들러 — 단원·대상은 그 방의 것으로 다시 잡는다
  function handleBotChange(nextBotId: string) {
    setBotId(nextBotId);
    setUnitId('');
    setTargetIds(null);
  }

  // 검증
  const titleValid = title.trim().length >= 5 && title.trim().length <= 50;
  /*
    명단을 **못 읽은 상태**를 「학생 0명인 반」과 같이 취급하면 안 된다.

    조회가 실패하면 `students` 가 빈 배열이라 예전 조건은 그대로 통과했고, 그때 나가는
    `targetPayload` 는 빈 배열 — 서버가 **반 전체**로 읽는 값이다. 즉 명단을 못 본 채로
    전원 발사가 나갔다. 아직 안 온 상태(pending)도 같은 이유로 막는다(빈 명단과 구별이 안 된다).

    비로그인 데모는 예외다 — 거기서는 명단 조회가 401 이고 발사도 서버로 가지 않는다.
  */
  const rosterUnknown =
    !signedOut && !!room && (studentsQuery.isPending || studentsQuery.isError);
  /*
    아직 아무도 안 들어온 방에도 낼 수 있다 — 반 전체로 나가고, 뒤에 들어온 학생이 받는다.

    ⚠ 이것은 **문서보다 앞선 규칙이다.** spec 14 §5.1 은 발사 전 조건으로 「대상 학생 1명
    이상」을 요구한다. 그 문서는 명단이 먼저 있고 교사가 거기서 고르는 흐름을 전제했는데,
    참여 코드가 생기면서 **학생이 뒤에 들어오는 반**이 정상 상태가 됐다. 빈 방 발사를 막으면
    교사는 반을 열어 놓고 학생이 들어올 때까지 아무것도 낼 수 없다.

    유지하기로 **결정된 사항**이고(2026-09-04), spec 14 §5.1 을 이 동작에 맞추는 문서 갱신은
    **PR #272** 가 따로 담고 있다 — 이 리포는 FE/BE·문서를 한 PR 에 섞지 않으므로(루트 CLAUDE.md
    최상위 규칙) 문서와 코드가 각각 다른 PR 로 가는 게 정상 경로다. 그 PR 이 dev 에 들어가면
    base 스냅샷의 §5.1 이 이 조건과 같아진다.

    막는 쪽으로 뒤집으려면 `students.length === 0` 항을 빼면 된다.
  */
  const targetValid = !rosterUnknown && (students.length === 0 || selectedIds.length >= 1);
  const dueValid = new Date(dueIso).getTime() > Date.now();
  const pointsTotal = sumPoints(questions);
  // 문항 수 상한 — 종전 `문항 수` 슬라이더의 max 를 편집기가 물려받는다(연습·오답정복 50 / 시험 60).
  const maxQuestions = maxQuestionsFor(mode);
  const countValid = questions.length >= MIN_QUESTIONS && questions.length <= maxQuestions;
  const atMaxQuestions = questions.length >= maxQuestions;
  // 발문을 일부만 쓴 채 발사하면 쓴 발문이 통째로 버려지고 단원 RAG 로 대체된다 — 그 전에 막는다.
  const partiallyAuthored = isPartiallyAuthored(questions);
  // 정답을 안 정한 자동 채점 문항이 있으면 발사를 막는다 — 그대로 나가면 그 문항이 채점에서
  // 통째로 빠지거나(단답·수치), 선생님이 고르지 않은 보기가 정답으로 굳는다(객관식).
  const missingAnswers = missingAnswerNumbers(questions);
  const answersValid = missingAnswers.length === 0;

  /**
   * ② 문항 섹션이 발사를 막는 이유 한 줄 — null 이면 걸린 게 없다.
   * 먼저 걸리는 것부터 하나만 보여 준다(문항 수 → 배점 → 발문 → 정답).
   */
  function questionBlockedReason(): string | null {
    if (questions.length < MIN_QUESTIONS) return '문항을 최소 1개는 넣어야 발사할 수 있어요';
    if (questions.length > maxQuestions) {
      return `${modeOptions[mode].label} 과제는 ${maxQuestions}문항까지예요 — 지금 ${questions.length}문항`;
    }
    if (pointsTotal !== TOTAL_POINTS) return `배점 합계 ${pointsTotal}/${TOTAL_POINTS}점 — 맞춰야 발사할 수 있어요`;
    if (partiallyAuthored) {
      return `발문은 전부 쓰거나 전부 비워야 해요 — 지금 ${authoredCount(questions)}/${questions.length}개`;
    }
    if (!answersValid) return `${missingAnswers.join('·')}번 문항 정답을 정해야 발사할 수 있어요`;
    return null;
  }
  const blockedReason = questionBlockedReason();

  const canDispatch =
    !!room && titleValid && targetValid && dueValid && blockedReason === null && !dispatchAssignment.isPending;

  /** 서버가 받는 대상 — 전원이면 빈 배열(반 전체)이다. 스키마가 정한 규약. */
  const targetPayload = allSelected ? [] : selectedIds;

  /**
   * 로컬 사본 한 벌 — **문항 본문은 아직 DB 에 없다.**
   * `assignments` 테이블에는 문항 수만 있고 발문·보기·정답을 담을 자리가 없어서,
   * 교사가 쓴 문항은 지금도 localStorage 스토어가 갖는다(학생 풀이 화면이 그걸 읽는다).
   * 그래서 id 를 **서버가 준 것**으로 맞춰 둔다 — 두 벌이 같은 과제를 가리켜야
   * 학생이 연 링크와 문항이 어긋나지 않는다.
   */
  function buildAssignment(id: string = nextAssignmentId()): UserAssignment {
    // 발문을 전부 채웠을 때만 문항을 실어 보낸다 — 하나라도 비면 단원 RAG 자동 추출 규약.
    const authored = toAssignmentQuestions(id, questions);
    const assignment: UserAssignment = {
      id,
      botId: selectedBotId,
      title: title.trim(),
      scope: selectedUnit?.fullPath ?? '단원 미정',
      subject: room?.subject ?? '',
      grade: room?.grade ?? '',
      chapterFrom: selectedUnit?.fullPath ?? '',
      chapterTo: selectedUnit?.fullPath ?? '',
      achievementCodes: selectedUnit?.achievementCodes ?? [],
      questionCount: questions.length,
      difficulty,
      mode,
      scopeOverride: mode === 'exam' ? 1 : undefined,
      source: 'teacher-assigned',
      assignedBy: room?.botName ?? '',
      assignedAt: '방금 발사',
      dueLabel: formatDueLabel(dueIso),
      dDay: computeDDay(dueIso),
      completedCount: 0,
      state: 'todo',
      reasonHint: botMessage.trim() || undefined,
      solveHref: `/classbot/assignment/${id}/solve?step=1`,
      // UserAssignment 확장 필드
      dispatchStatus: 'sent',
      targetStudentIds: targetPayload,
      examTimeLimitMin: mode === 'exam' ? examTimeLimit : undefined,
      questions: authored ?? undefined,
    };
    return assignment;
  }

  /**
   * 발사 — **DB 가 먼저**다. 서버가 행을 만든 뒤에야 로컬 사본을 쓴다.
   * 낙관적으로 먼저 로컬에 쓰면, 소유권(404)·대상(400)에서 튕겼을 때 화면에는 낸 것으로
   * 보이는데 학생에게는 아무것도 안 간 상태가 남는다.
   */
  async function handleDispatch() {
    if (!canDispatch || !room) return;

    // 비로그인 데모 — 서버로 보내지 않는다. mock 봇 id 는 소유권 검사에서 404 다.
    if (signedOut) {
      const a = buildAssignment(nextAssignmentId());
      dispatch(a);
      toast.success('데모라서 이 브라우저에만 저장했어요', {
        description: `"${a.title}" · 로그인하면 실제 수업방 학생에게 나갑니다`,
      });
      router.push('/teacher/classbot');
      return;
    }

    try {
      const { assignment } = await dispatchAssignment.mutateAsync({
        botId: room.botId,
        title: title.trim(),
        dueLabel: formatDueLabel(dueIso),
        questionCount: questions.length,
        difficulty,
        mode,
        // 교사가 고른 단원 — 서버가 저장한다. 안 실으면 서버에서 읽는 학생·학부모 화면이
        // 단원을 잃는다(계약 14 §1·§3.3.1·§5.4). 로컬 사본과 같은 값을 쓴다.
        scope: selectedUnit?.fullPath,
        chapterFrom: selectedUnit?.fullPath,
        chapterTo: selectedUnit?.fullPath,
        targetStudentIds: targetPayload,
      });

      // 서버가 준 id 로 로컬 사본(문항 본문)을 맞춘다 — 위 buildAssignment 주석 참고.
      const a = buildAssignment(assignment.id);
      dispatch(a);

      const sentCount = targetPayload.length === 0 ? students.length : targetPayload.length;
      toast.success(`${a.assignedBy}이 ${sentCount}명에게 보냈어요`, {
        description: `"${a.title}" · ${a.dueLabel}`,
      });
      router.push('/teacher/classbot');
    } catch (error) {
      // ApiClientError.message 는 서버가 준 우리말 문구다 — 그대로 보여준다.
      toast.error(error instanceof Error ? error.message : '과제를 내지 못했어요.');
    }
  }

  // 진행도
  const progress = [
    !!room,
    titleValid,
    blockedReason === null,
    targetValid,
    dueValid,
  ].filter(Boolean).length;

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        {/* 상단 컨텍스트 바 */}
        <div className="flex items-center justify-between">
          <Link
            href="/teacher/classbot"
            className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="h-3 w-3" />
            취소
          </Link>
          <span className="text-pullim-slate-500 font-mono text-2xs">진행도 {progress}/5</span>
        </div>

        <PageHeader
          eyebrow={{ icon: Send, text: '새 과제' }}
          title="과제 발사하기"
          description={
            room
              ? `${room.label} · ${room.botName ?? '봇'} · ${room.subject ?? ''} ${room.grade ?? ''}`.trim()
              : '먼저 수업방을 선택해주세요'
          }
        />
      </div>

      <div className="max-w-3xl space-y-6">
        {/* 수업방을 못 읽으면 발사 봇 목록이 비어 폼 전체가 뜻을 잃는다 — 이유를 먼저 말한다.
            단 401 은 제외한다: 그건 고장이 아니라 로그인 안 한 데모 상태이고(위 signedOut),
            그때 폼은 mock 카탈로그로 정상 동작한다. 오류 카드를 함께 띄우면 분기 의미가 무너진다 —
            학생 쪽 `app/(student)/classbot/classroom/page.tsx` 가 같은 규약을 쓴다. */}
        {classroomsQuery.isError && !signedOut && (
          <AlertCard tone="danger" icon={School} title="수업방을 불러오지 못했어요">
            <p className="text-pullim-slate-700 text-sm" data-testid="rooms-error">
              {classroomsQuery.error.message}
            </p>
          </AlertCard>
        )}

        {/* 방이 없으면 낼 곳이 없다 — 폼을 붙잡고 있게 두지 않고 만들러 보낸다 */}
        {noRooms && (
          <AlertCard tone="notice" icon={School} title="아직 수업방이 없어요">
            <p className="text-pullim-slate-700 text-sm" data-testid="rooms-empty">
              과제는 수업방에 내는 거예요. 먼저 수업방을 열고 참여 코드를 학생에게 알려주세요.
            </p>
            <Link
              href="/teacher/classroom"
              className="bg-pullim-blue-600 hover:bg-pullim-blue-700 mt-3 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              수업방 만들기
            </Link>
          </AlertCard>
        )}
        {/* ① 정체성 */}
        <section className="bg-card rounded-2xl border p-5">
          <SectionHeading
            title={<><span className="text-pullim-blue-600 font-mono mr-1">①</span> 정체성</>}
          />

          <div className="space-y-3">
            <Field label="발사 봇" htmlFor="af-bot">
              <select
                id="af-bot"
                value={selectedBotId}
                onChange={(e) => handleBotChange(e.target.value)}
                disabled={rooms.length === 0}
                data-testid="bot-select"
                className="border-pullim-slate-200 focus:border-pullim-blue-500 w-full rounded-lg border px-3 py-2 text-sm outline-none disabled:bg-pullim-slate-50 disabled:text-pullim-slate-400"
              >
                {rooms.length === 0 ? (
                  <option value="">
                    {classroomsQuery.isPending ? '수업방을 불러오는 중…' : '아직 수업방이 없어요'}
                  </option>
                ) : (
                  rooms.map(r => (
                    <option key={r.botId} value={r.botId}>
                      {r.label} — {r.subject ?? ''} {r.grade ?? ''} ({r.studentCount}명)
                    </option>
                  ))
                )}
              </select>
            </Field>

            <Field label="과제 제목" hint="5~50자" htmlFor="af-title">
              <Input
                id="af-title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 50))}
                placeholder="예: 일차함수 그래프 마무리 2탄"
                data-testid="title-input"
                aria-invalid={title !== '' && !titleValid}
                aria-describedby={title !== '' && !titleValid ? 'af-title-err' : undefined}
                className="h-10 text-sm"
              />
              {title !== '' && !titleValid && (
                <p id="af-title-err" className="text-pullim-danger mt-1 text-xs">제목은 5~50자 사이여야 해요.</p>
              )}
            </Field>

            <Field label="봇 개입 강도 (모드)">
              <p className="text-pullim-slate-500 mb-1.5 text-2xs leading-relaxed">
                모드는 <b>푸는 동안</b> 봇이 어디까지 도와줄지를 정해요. 점수를 누가 매기는지(채점 방식)는
                아래 ② 문항의 <b>유형</b>이 정해요 — 서로 다른 축이에요.
              </p>
              <div role="radiogroup" aria-label="과제 모드" className="grid grid-cols-3 gap-2">
                {(['practice', 'exam', 'wrong-conquest'] as AssignmentMode[]).map(m => {
                  const meta = modeOptions[m];
                  const active = mode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setMode(m)}
                      data-testid={`mode-${m}`}
                      className={cn(
                        'rounded-lg border-2 px-3 py-2 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50',
                        active
                          ? meta.color
                          : 'border-pullim-slate-200 bg-white hover:border-pullim-slate-400',
                      )}
                    >
                      <div className="text-pullim-slate-900 text-xs font-bold">{meta.label}</div>
                      <div className="text-pullim-slate-500 mt-0.5 text-xs leading-tight">{meta.description}</div>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="난이도">
              <div role="radiogroup" aria-label="난이도" className="flex gap-1.5">
                {difficultyOptions.map(d => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={difficulty === d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      'flex-1 rounded-lg border-2 py-1.5 text-xs font-bold transition-all outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50',
                      difficulty === d
                        ? 'border-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700'
                        : 'border-pullim-slate-200 bg-white text-pullim-slate-600',
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </section>

        {/* ② 문항 */}
        <section className="bg-card rounded-2xl border p-5">
          <SectionHeading
            title={<><span className="text-pullim-blue-600 font-mono mr-1">②</span> 문항</>}
          />

          <div className="space-y-3">
            <Field label="단원" htmlFor="af-unit">
              <select
                id="af-unit"
                value={selectedUnit?.id ?? ''}
                onChange={(e) => setUnitId(e.target.value)}
                disabled={curriculum.length === 0}
                data-testid="unit-select"
                className="border-pullim-slate-200 focus:border-pullim-blue-500 w-full rounded-lg border px-3 py-2 text-sm outline-none disabled:bg-pullim-slate-50 disabled:text-pullim-slate-400"
              >
                {/* 새로 연 수업방의 봇은 단원 카탈로그에 아직 없다 — 그때는 「단원 미정」으로 낸다 */}
                {curriculum.length === 0 ? (
                  <option value="">단원 미정</option>
                ) : (
                  curriculum.map(u => (
                    <option key={u.id} value={u.id}>{u.fullPath}</option>
                  ))
                )}
              </select>
              <BotNote icon={BookOpen} className="mt-1">
                발문은 <b>전부 쓰거나 전부 비우거나</b> 둘 중 하나예요 — 전부 비우면 선택 단원의
                RAG 인덱스에서 자동 추출돼요. 일부만 쓰면 쓴 발문이 버려지니 발사를 막아요.
                {' '}지금 직접 쓴 발문 {authoredCount(questions)}/{questions.length}개.
              </BotNote>
            </Field>

            <PointsTally questions={questions} />

            <BotNote icon={Scale}>
              <b>객관식 · 단답 · 수치</b>는 봇이 자동으로 채점하고, <b>서술형</b>은 선생님이 채점 허브에서 직접 봐요.
              서술형은 기준을 미리 적어 두면 채점이 빨라져요.
            </BotNote>

            <QuestionListEditor questions={questions} onChange={setQuestions} />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuestions([...questions, makeQuestion('mc', 0)])}
                data-testid="question-add"
                // 상한에 닿으면 잠근다 — 51번째 문항을 만들어 두고 발사에서 막는 것보다 앞에서 막는다.
                disabled={atMaxQuestions}
                title={atMaxQuestions ? `${modeOptions[mode].label} 과제는 ${maxQuestions}문항까지예요` : undefined}
              >
                <Plus />
                문항 더하기
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setQuestions(evenlySplitPoints(questions))}
                data-testid="question-even-split"
                aria-label="배점 고르게 나누기"
                className="text-pullim-blue-600 hover:text-pullim-blue-700"
              >
                <Split />
                고르게 나누기
              </Button>
              <span
                className={cn('ml-auto font-mono text-2xs', countValid ? 'text-pullim-slate-500' : 'text-pullim-danger font-bold')}
                data-testid="question-count"
              >
                {questions.length}/{maxQuestions}문항 · {pointsTotal}점
              </span>
            </div>
          </div>
        </section>

        {/* ③ 대상 */}
        <section className="bg-card rounded-2xl border p-5">
          <SectionHeading
            title={<><span className="text-pullim-blue-600 font-mono mr-1">③</span> 대상</>}
            description={
              students.length === 0
                ? '이 수업방 참여 학생'
                : `${selectedIds.length}/${students.length}명 선택됨`
            }
            action={
              students.length > 0 ? (
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  onClick={() => setTargetIds(allSelected ? [] : null)}
                  className="text-pullim-blue-600 hover:text-pullim-blue-700"
                >
                  <Users />
                  {allSelected ? '전체 해제' : '전체 선택'}
                </Button>
              ) : undefined
            }
          />

          {/*
            비로그인 데모는 위에서 조회 자체를 걸어 뒀다 — 그러면 react-query 는 `isPending`
            에 머무르므로, 두 분기 다 `signedOut` 을 먼저 본다. 데모는 「학생 0명인 방」
            안내로 내려가고, 그건 mock 방(studentCount 0)의 사실과도 맞는다.
          */}
          {!signedOut && studentsQuery.isPending && room ? (
            <p className="text-pullim-slate-500 text-2xs" data-testid="students-loading">
              참여 학생을 불러오는 중이에요…
            </p>
          ) : !signedOut && studentsQuery.isError ? (
            <p className="text-pullim-danger text-2xs" role="alert" data-testid="students-error">
              {studentsQuery.error.message}
            </p>
          ) : students.length === 0 ? (
            /*
              아직 아무도 안 들어온 방 — 발사를 막지 않는다. 반 전체(빈 배열)로 나가므로
              나중에 참여 코드로 들어오는 학생이 그대로 이 과제를 받는다.
            */
            <BotNote icon={Users}>
              이 수업방에 들어온 학생이 아직 없어요. 지금 내면 <b>반 전체</b>로 나가서,
              나중에 참여 코드로 들어오는 학생도 이 과제를 받아요.
            </BotNote>
          ) : (
            <div role="group" aria-label="대상 학생" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {students.map(s => {
                const active = selectedIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTargetIds(
                      active ? selectedIds.filter(id => id !== s.id) : [...selectedIds, s.id]
                    )}
                    data-testid={`student-${s.id}`}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border-2 px-2 py-1.5 text-xs font-bold transition-all outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50',
                      active
                        ? 'border-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700'
                        : 'border-pullim-slate-200 bg-white text-pullim-slate-600 hover:border-pullim-slate-400',
                    )}
                  >
                    {active && <CheckCircle2 className="h-3 w-3" aria-hidden />}
                    {s.name}
                  </button>
                );
              })}
            </div>
          )}
          {!targetValid && (
            <p className="text-pullim-danger mt-2 text-xs">최소 1명을 선택해주세요.</p>
          )}
        </section>

        {/* ④ 일정 */}
        <section className="bg-card rounded-2xl border p-5">
          <SectionHeading
            title={<><span className="text-pullim-blue-600 font-mono mr-1">④</span> 일정</>}
          />

          <div className="space-y-3">
            <Field label="마감 일시" htmlFor="af-due">
              <Input
                id="af-due"
                type="datetime-local"
                value={dueIso}
                onChange={(e) => setDueIso(e.target.value)}
                data-testid="due-input"
                aria-invalid={!dueValid}
                aria-describedby={!dueValid ? 'af-due-err' : 'af-due-hint'}
                className="h-10 text-sm"
              />
              <p id="af-due-hint" className="text-pullim-slate-500 mt-1 text-2xs">
                <Calendar className="-mt-0.5 mr-0.5 inline h-3 w-3" />
                {formatDueLabel(dueIso)} ({computeDDay(dueIso)})
              </p>
              {!dueValid && (
                <p id="af-due-err" className="text-pullim-danger mt-1 text-xs">미래 시각으로 설정해주세요.</p>
              )}
            </Field>

            <Field label="봇 한 마디 (선택)" hint="200자" htmlFor="af-message">
              <Textarea
                id="af-message"
                value={botMessage}
                onChange={(e) => setBotMessage(e.target.value.slice(0, 200))}
                rows={2}
                placeholder="예: 어제 부호 변화에서 막혔던 사람들 다시 짚자"
                className="text-sm"
              />
            </Field>
          </div>
        </section>

        {/* 시험 모드 추가 */}
        {mode === 'exam' && (
          <AlertCard tone="danger" icon={Shield} title="시험 모드 설정">
            <p className="text-pullim-slate-500 mb-3 text-2xs">발사 후 봇이 자동 잠기고 시간이 측정돼요</p>
            <div className="space-y-3">
              <Field label="시간 제한 (분)" htmlFor="af-time">
                <div className="flex items-center gap-3">
                  <Slider
                    id="af-time"
                    min={10}
                    max={180}
                    step={10}
                    value={examTimeLimit}
                    onValueChange={(v) => setExamTimeLimit(Array.isArray(v) ? v[0] : v)}
                    aria-valuetext={`${examTimeLimit}분`}
                    accentClassName="bg-pullim-danger"
                    thumbClassName="bg-pullim-danger focus-visible:ring-pullim-danger/50"
                    className="flex-1"
                  />
                  <span className="bg-white text-pullim-danger inline-flex h-8 w-12 items-center justify-center rounded-lg font-mono text-sm font-bold">
                    {examTimeLimit}분
                  </span>
                </div>
              </Field>

              <BotNote icon={Shield}>Scope L1 자동 — 발사 후엔 변경할 수 없어요.</BotNote>
            </div>
          </AlertCard>
        )}
      </div>

      {/* Sticky bottom 액션 바 */}
      <div className="bg-card sticky bottom-2 flex items-center gap-2 rounded-2xl border p-4 shadow-pullim-md">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setPreview(true)}
          className="bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-700"
        >
          <Eye />
          미리보기
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled
          aria-disabled="true"
          title="준비 중 (v2)"
          className="bg-pullim-slate-50 text-pullim-slate-400"
        >
          <Save />
          임시저장
        </Button>
        {blockedReason ? (
          <span className="text-pullim-danger ml-auto text-2xs font-bold" data-testid="dispatch-blocked">
            {blockedReason}
          </span>
        ) : dispatchAssignment.isError ? (
          /* 서버가 막은 이유 — 문구는 서버가 준 우리말 그대로다(대상·소유권·입력) */
          <span className="text-pullim-danger ml-auto text-2xs font-bold" role="alert" data-testid="dispatch-error">
            {dispatchAssignment.error.message}
          </span>
        ) : null}
        <Button
          type="button"
          variant={mode === 'exam' ? 'pullim-danger' : 'pullim'}
          size="lg"
          onClick={handleDispatch}
          disabled={!canDispatch}
          data-testid="dispatch-btn"
          className={cn(blockedReason || dispatchAssignment.isError ? 'ml-2' : 'ml-auto')}
        >
          <Send />
          {dispatchAssignment.isPending ? '보내는 중…' : '발사 →'}
        </Button>
      </div>

      {/* 미리보기 모달 */}
      {preview && room && (
        <PreviewModal
          assignment={buildAssignment()}
          botName={room.botName ?? '봇'}
          questions={questions}
          targetCount={targetPayload.length === 0 ? students.length : targetPayload.length}
          onClose={() => setPreview(false)}
        />
      )}
    </div>
  );
}

function Field({
  label, hint, htmlFor, children,
}: {
  label: string; hint?: string; htmlFor?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <Label
        htmlFor={htmlFor}
        className="text-pullim-slate-700 mb-1 flex items-center justify-between text-xs font-bold"
      >
        <span>{label}</span>
        {hint && <span className="text-pullim-slate-500 font-mono text-2xs">{hint}</span>}
      </Label>
      {children}
    </div>
  );
}

function PreviewModal({
  assignment, botName, questions, targetCount, onClose,
}: {
  assignment: Assignment; botName: string; questions: DraftQuestion[];
  targetCount: number; onClose: () => void;
}) {
  const meta = modeOptions[assignment.mode];
  const tally = gradingTally(questions);
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-pullim-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-md rounded-3xl p-6 shadow-pullim-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-pullim-slate-900 text-base font-bold">학생들에게 이렇게 보여요</h3>
        <p className="text-pullim-slate-500 mt-1 text-xs">{targetCount}명 학생 홈에 등장</p>

        <div className={cn('mt-4 rounded-2xl border-2 p-4', meta.color)}>
          <div className="flex items-center gap-2 text-2xs">
            <span className="bg-pullim-slate-900 text-white rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">
              {meta.label}
            </span>
            <span className="text-pullim-slate-700 font-bold">{assignment.dDay}</span>
          </div>
          <h4 className="text-pullim-slate-900 mt-2 text-base font-bold">{assignment.title}</h4>
          <p className="text-pullim-slate-600 mt-0.5 text-xs">{assignment.scope}</p>
          <p className="text-pullim-slate-500 mt-1 text-2xs">
            {assignment.questionCount}문항 · {sumPoints(questions)}점 · 난이도 {assignment.difficulty} · {botName}
          </p>
          <p className="text-pullim-slate-500 mt-0.5 text-2xs">
            자동 채점 {tally.auto.count}문항 · 선생님이 채점 {tally.teacher.count}문항
          </p>
          {assignment.reasonHint && (
            <p className="bg-white mt-2 rounded-lg p-2 text-2xs">
              <Sparkles className="text-pullim-blue-600 -mt-0.5 mr-0.5 inline h-2.5 w-2.5" />
              {assignment.reasonHint}
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          className="bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-700 mt-4 w-full rounded-xl"
        >
          닫기
        </Button>
      </div>
    </div>
  );
}
