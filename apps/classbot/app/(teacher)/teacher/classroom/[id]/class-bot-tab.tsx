'use client';

import { useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import { toast } from 'sonner';
import { ArrowLeftRight, Bot, CircleHelp, Link2, Pencil, Plus, TriangleAlert, Unplug } from 'lucide-react';
import { AlertCard } from '@/components/classbot/alert-card';
import { EmptyState } from '@/components/classbot/empty-state';
import { SectionHeading } from '@/components/shell/section-heading';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BotAttachError, useCreateBotForClass, useMyBot, useMyBots, useUpdateBot } from '@/hooks/api/bot';
import { useAssignClassBot, useClassDetail, useOperatorClasses } from '@/hooks/api/classroom';
import { isUnauthorized } from '@/lib/api/classbot-client';
import { botFailureMessage } from '@/lib/bot-failure-message';
import { classNameOf, type BotDto, type ClassBotSummaryDto, type CreateBotBody, type UpdateBotBody } from '@/lib/api/classbot-dto';
import { GRADES } from '@/lib/grades';
import { josa, scopeMeta, type ScopeLevel } from '@/lib/mock';

/**
 * 반 상세 「봇」 탭 — 이 반이 가리키는 봇(`classes.bot_id`)을 보고, 새 봇을 만들어 붙이고, 고치고, 뗀다
 * (계획 PR 5b · 완성 설계 § 5 R4 · § 6.2 「반 상세」 · api.md § 3.5b).
 *
 * 문은 넷이다: `GET /classes/:classId`(지금 붙은 봇 — `useClassDetail`) · `GET /me/bots`(내 봇 목록 — `useMyBots`) ·
 * `POST /bots` → `PUT /classes/:classId/bot {botId}`(`useCreateBotForClass`) · `PATCH /bots/:id`(`useUpdateBot` —
 * 이 탭은 이름·인사말·말투·등급만 고친다, 전체 빌더는 `/teacher/builder`) · 그리고 같은 `PUT` 이 바꾸기
 * (`{botId}`)와 떼기(`{botId:null}` — 되묻는다)를 겸한다.
 *
 * **「지금 붙은 봇」은 여전히 셋으로 갈라 그린다 — 모른다 · 없다 · 이 봇.** 다만 계획 PR 5d 부터 「모른다」의 뜻이
 * 바뀌었다: 종전에는 「이 세션에서 손대지 않은 반은 영영 모른다」였고(읽기 문이 없었다), 이제는 **읽는 중이거나
 * 읽기가 실패했다**뿐이다(pullim-api #672). 「모른다」를 「없다」로 그리면 교사가 멀쩡한 봇 위에 새 봇을 만드므로
 * 그 갈래는 그대로 둔다 — 첫 상태는 안내 카드이고 「새 봇 만들어 붙이기」도 **없다고 알 때만** 으뜸 버튼이다.
 *
 * **「다른 봇으로 바꾸기」가 생긴 것이 이 탭의 큰 변화다.** 내 봇 목록을 읽는 문이 열려(`GET /me/bots`) 고르개를
 * 화면에서 지어내지 않고 세울 수 있다. 고르개는 지금 붙은 봇을 빼고 보여 주고, 봇마다 **이미 붙어 있는 반**을
 * 함께 적는다(`BotDto.classIds`) — 반 하나에 봇 하나라 남의 반에서 옮겨 오는 것이 아니라 **같은 봇이 여러 반을
 * 겸하는** 것이고, 그 사실을 고르기 전에 보여야 한다.
 *
 * 「만들어 붙이기」가 **붙이는 쪽에서만** 실패하면(`BotAttachError`) 봇은 이미 내 것으로 생겼다. 그때 폼을 다시 보내면
 * `POST /bots` 가 또 가서 같은 이름의 봇이 는다 — 그래서 폼을 닫고 만든 봇을 들고 **「다시 붙이기」(`PUT` 만)** 로
 * 바꾼다(#355 리뷰 S2). 봇을 지우는 문은 여전히 없다(목록에는 이제 보인다 — `/teacher/bots`).
 *
 * 실패 문구 표(`botFailureMessage`)는 이 파일에 있었는데 `lib/bot-failure-message.ts` 로 옮겼다 — 같은 문 넷을
 * 두드리는 화면이 넷이 돼서다(이 탭 · 봇 관리 상세 · 빌더 만들기 · 빌더 수정). 문구는 그대로다.
 */

/** 등급 고르개 한 줄 — `L3 · 교과 범위`. */
function scopeOptionLabel(level: ScopeLevel): string {
  return `${scopeMeta[level].short} · ${scopeMeta[level].label}`;
}

const levels: ScopeLevel[] = [1, 2, 3, 4, 5];

/** 폼 컨트롤 공통 결 — 반 만들기 폼과 같은 눈금. */
const controlClass =
  'border-pullim-slate-200 focus:border-pullim-blue-500 w-full rounded-lg border px-3 py-2 text-sm outline-none';

export function ClassBotTab({
  classId,
  classroomName,
}: {
  /** 반 id(pullim-api). */
  classId: string;
  /** 반 이름 — 떼기 판의 문장에 들어간다. */
  classroomName: string;
}) {
  const known = useClassDetail(classId).data;
  /** `undefined` 모른다(읽는 중·실패) · `null` 없다 · 요약 = 이 봇. */
  const summary: ClassBotSummaryDto | null | undefined = known === undefined ? undefined : known.bot;
  // 붙은 봇의 과목·학년·말투·등급은 내 봇 목록에서 온다 — 반 상세가 주는 요약에는 id·이름·아바타뿐이다.
  const currentBot = useMyBot(summary?.id).bot;

  const [mode, setMode] = useState<'idle' | 'create' | 'edit' | 'swap'>('idle');
  const [detachOpen, setDetachOpen] = useState(false);
  const detachRef = useRef<HTMLButtonElement>(null);
  const assign = useAssignClassBot();

  function handleDetach() {
    assign.mutate(
      { classId, botId: null },
      {
        onSuccess: () => {
          setMode('idle');
          toast.success('봇을 뗐어요', { description: '새 봇을 붙일 때까지 학생은 대화를 보낼 수 없어요.' });
        },
        onError: (error) => toast.error(botFailureMessage(error, 'detach')),
      },
    );
  }

  return (
    <>
      <SectionHeading
        title="봇"
        description="이 반의 학생이 대화하는 봇이에요. 봇이 없으면 학생은 대화를 보낼 수 없어요."
      />

      <CurrentBot summary={summary} bot={currentBot} />

      <div className="mt-4 flex flex-wrap gap-2" data-testid="class-bot-actions">
        {/* 으뜸 버튼은 「없다」고 알 때만 — 모르는 반에서 새 봇으로 미는 모양이면 멀쩡한 봇 위에 새 봇을 만든다(머리주석). */}
        <Button
          type="button"
          variant={summary === null ? 'pullim' : 'outline'}
          size="lg"
          onClick={() => setMode(mode === 'create' ? 'idle' : 'create')}
          aria-expanded={mode === 'create'}
          data-testid="class-bot-create-toggle"
        >
          <Plus />
          새 봇 만들어 붙이기
        </Button>
        {/*
          「바꾸기」는 **모를 때도** 낸다. 고르개가 여는 것은 내 봇 목록이고 그 목록은 지금 붙은 봇을 몰라도 읽힌다 —
          여기서 고른 봇은 어차피 `PUT` 으로 덮어쓰므로, 모른다고 길을 막을 이유가 없다.
        */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setMode(mode === 'swap' ? 'idle' : 'swap')}
          aria-expanded={mode === 'swap'}
          data-testid="class-bot-swap-toggle"
        >
          <ArrowLeftRight />
          다른 봇으로 바꾸기
        </Button>
        {summary && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setMode(mode === 'edit' ? 'idle' : 'edit')}
            aria-expanded={mode === 'edit'}
            data-testid="class-bot-edit-toggle"
          >
            <Pencil />
            봇 고치기
          </Button>
        )}
        {summary && (
          <Button
            ref={detachRef}
            type="button"
            variant="ghost"
            size="lg"
            className="text-pullim-slate-600 hover:text-pullim-slate-900"
            onClick={() => setDetachOpen(true)}
            disabled={assign.isPending}
            data-testid="class-bot-detach"
          >
            <Unplug />
            {assign.isPending ? '떼는 중…' : '봇 떼기'}
          </Button>
        )}
      </div>

      {mode === 'create' && (
        <NewBotForm classId={classId} replacing={summary !== null} onDone={() => setMode('idle')} />
      )}
      {mode === 'swap' && (
        <SwapBotForm
          classId={classId}
          classroomName={classroomName}
          currentBotId={summary?.id ?? null}
          onDone={() => setMode('idle')}
        />
      )}
      {mode === 'edit' && summary && (
        <EditBotForm key={summary.id} summary={summary} bot={currentBot} onDone={() => setMode('idle')} />
      )}

      {summary && (
        <DetachBotDialog
          botName={summary.name}
          classroomName={classroomName}
          open={detachOpen}
          onOpenChange={setDetachOpen}
          onConfirm={handleDetach}
          finalFocus={detachRef}
        />
      )}
    </>
  );
}

/** 지금 붙은 봇 — 모른다 · 없다 · 이 봇(머리주석). */
function CurrentBot({ summary, bot }: { summary: ClassBotSummaryDto | null | undefined; bot: BotDto | undefined }) {
  if (summary === undefined) {
    return (
      <AlertCard tone="notice" icon={CircleHelp} title="지금 붙은 봇을 아직 불러올 수 없어요">
        <p className="text-pullim-slate-700 text-sm" data-testid="class-bot-unknown">
          여기서 봇을 붙이거나 떼면 그때부터 보여요.
        </p>
      </AlertCard>
    );
  }
  if (summary === null) {
    return (
      <div data-testid="class-bot-none">
        <EmptyState
          icon={Bot}
          size="md"
          title="붙은 봇이 없어요"
          description="새 봇을 만들어 붙이면 학생이 대화를 시작할 수 있어요."
        />
      </div>
    );
  }
  return (
    <div className="bg-card rounded-2xl border p-5" data-testid="class-bot-current">
      <div className="flex items-start gap-3">
        <span
          className="bg-pullim-blue-50 text-pullim-blue-600 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl"
          aria-hidden
        >
          {summary.avatarEmoji ?? <Bot className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-pullim-slate-500 text-2xs font-bold">지금 붙은 봇</p>
          <h3 className="text-pullim-slate-900 truncate text-base font-bold" data-testid="class-bot-name">
            {summary.name}
          </h3>
          {bot ? (
            <>
              <BotFactChips bot={bot} className="mt-2" data-testid="class-bot-facts" />
              {bot.greeting && (
                <p className="text-pullim-slate-700 mt-2 text-sm break-keep" data-testid="class-bot-greeting">
                  “{bot.greeting}”
                </p>
              )}
            </>
          ) : (
            <p className="text-pullim-slate-500 mt-1 text-2xs" data-testid="class-bot-facts-unknown">
              과목·말투·등급을 불러오는 중이에요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** 1~5 인가 — 서버 `number` 를 화면 라벨표의 키로 좁힌다(`lib/mock/tutor.ts` 규칙). */
function isScopeLevel(n: number): n is ScopeLevel {
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

/**
 * 봇 한 줄이 드는 사실들 — 과목·학년·말투·등급. 없는 칸은 칩을 내지 않는다(빈 칩이 「비었다」로 읽히지 않게).
 * 지금 붙은 봇 카드와 바꾸기 고르개가 같은 칩을 쓴다 — 한 화면에서 같은 봇이 두 모양으로 보이면 안 된다.
 * @param bot - 정본 봇 한 행
 * @param className - 바깥 여백만 조정한다
 * @param data-testid - 테스트 손잡이
 * @returns 칩 줄
 */
function BotFactChips({
  bot,
  className = 'mt-1.5',
  'data-testid': testId,
}: {
  bot: BotDto;
  className?: string;
  'data-testid'?: string;
}) {
  return (
    <div className={`${className} flex flex-wrap items-center gap-1.5`} data-testid={testId}>
      {bot.subject && <Chip tone="info">{bot.subject}</Chip>}
      {bot.grade && <Chip tone="outline">{bot.grade}</Chip>}
      {bot.tone && <Chip tone="outline">말투 · {bot.tone}</Chip>}
      <Chip tone="neutral">{isScopeLevel(bot.scope) ? scopeOptionLabel(bot.scope) : `등급 ${bot.scope}`}</Chip>
    </div>
  );
}

/**
 * 「다른 봇으로 바꾸기」 — 내 봇 목록(`GET /me/bots`)에서 하나 골라 `PUT /classes/:classId/bot {botId}`.
 *
 * 지금 붙은 봇은 목록에서 뺀다 — 같은 값을 다시 보내는 것은 서버가 멱등 200 으로 받지만, 교사에게는 「바꾸기」로
 * 보이면서 아무 일도 안 일어나는 자리라 아예 고를 수 없게 한다.
 *
 * 봇마다 **이미 붙어 있는 반**을 함께 적는다(`BotDto.classIds` → `GET /bots?role=teacher` 의 반 이름으로 옮긴다).
 * 반 하나가 드는 봇은 하나라(`classes.bot_id`) 이 고르개로 봇을 붙이면 그 반의 **옛 봇은 떨어진다** — 반대로
 * 한 봇이 여러 반을 겸하는 것은 정상이다. 그 비대칭을 고르기 전에 말해야 교사가 놀라지 않는다.
 * @param classId - 이 반 id
 * @param classroomName - 이 반 이름 — 성공 토스트에 들어간다
 * @param currentBotId - 지금 붙은 봇 id · 없거나 모르면 null
 * @param onDone - 닫기
 */
function SwapBotForm({
  classId,
  classroomName,
  currentBotId,
  onDone,
}: {
  classId: string;
  classroomName: string;
  currentBotId: string | null;
  onDone: () => void;
}) {
  const bots = useMyBots();
  const classes = useOperatorClasses();
  const assign = useAssignClassBot();
  const [picked, setPicked] = useState<string | null>(null);

  /**
   * 반 id → **반** 이름. 목록을 아직 못 읽었으면 비어 있고, 그때는 id 대신 개수만 말한다.
   * 카드의 `name` 은 이제 봇 이름이라(pullim-api #679) 그걸 쓰면 「이 봇이 이미 붙은 반」 줄이
   * 봇 이름만 늘어놓는다 — 같은 봇이 걸린 반들이라 전부 같은 글자가 된다.
   */
  const classNames = new Map((classes.data ?? []).map((room) => [room.id, classNameOf(room)] as const));

  /*
    지금 붙은 봇을 빼는 잣대가 **둘**이다.

    ① `currentBotId` — 반 상세(`useClassDetail`)가 준다. 그런데 그 문이 **읽는 중이거나 실패하면 `null`** 이라
       (호출부 `summary?.id ?? null`) 이 잣대 하나로는 그 사이 지금 붙은 봇이 목록에 그대로 선다. 교사가 그것을
       고르면 서버는 **멱등 200** 으로 받고 화면은 「봇을 바꿨어요」라고 한다 — 아무것도 안 바뀌었는데.
    ② `bot.classIds` — **내 봇 목록이 직접 들고 온다**(`GET /me/bots` 한 행 = `classes.bot_id` 가 이 봇을
       가리키는 반). 반 상세와 **다른 문**이라 그쪽이 아직이어도 서 있다.

    그래서 ② 를 더해 「모를 때도 고르개는 연다」는 결정(위 [바꾸기] 버튼 주석)을 그대로 지키면서 헛걸음만 막는다 —
    길을 막는 쪽(고르개를 잠그는 쪽)을 고르지 않은 이유가 이것이다.
  */
  const choices = (bots.data ?? []).filter(
    (bot) => bot.id !== currentBotId && !bot.classIds.includes(classId),
  );

  function handleAttach(bot: BotDto) {
    if (assign.isPending) return;
    setPicked(bot.id);
    assign.mutate(
      { classId, botId: bot.id },
      {
        onSuccess: () => {
          toast.success('봇을 바꿨어요', { description: `「${classroomName}」의 봇이 ${bot.name} 이에요.` });
          onDone();
        },
        onError: (error) => toast.error(botFailureMessage(error, 'attach')),
      },
    );
  }

  return (
    <section className="bg-card mt-4 rounded-2xl border p-5" aria-label="다른 봇으로 바꾸기" data-testid="class-bot-swap-form">
      <h3 className="text-pullim-slate-900 text-sm font-bold">내 봇 중에서 고르기</h3>
      <p className="text-pullim-slate-500 mt-1 text-2xs">
        고른 봇이 이 반의 봇이 돼요. 한 반에는 봇 하나만 붙어요 — 지금 붙은 봇은 떨어져요.
      </p>

      {bots.isPending ? (
        <p className="text-pullim-slate-500 mt-3 text-sm" data-testid="class-bot-swap-pending">
          내 봇을 불러오는 중이에요.
        </p>
      ) : bots.isError ? (
        <p className="text-pullim-slate-700 mt-3 text-sm" data-testid="class-bot-swap-error">
          {isUnauthorized(bots.error) ? '로그인이 필요해요.' : '내 봇을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'}
        </p>
      ) : choices.length === 0 ? (
        <p className="text-pullim-slate-700 mt-3 text-sm" data-testid="class-bot-swap-empty">
          바꿀 만한 다른 봇이 아직 없어요. 「새 봇 만들어 붙이기」로 하나 만들어 주세요.
        </p>
      ) : (
        <ul className="mt-3 space-y-2" data-testid="class-bot-swap-list">
          {choices.map((bot) => {
            const rooms = bot.classIds.map((id) => classNames.get(id)).filter((name): name is string => Boolean(name));
            const busy = assign.isPending && picked === bot.id;
            return (
              <li
                key={bot.id}
                className="border-pullim-slate-200 flex flex-wrap items-start justify-between gap-3 rounded-xl border p-3"
                data-testid={`class-bot-swap-${bot.id}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-pullim-slate-900 truncate text-sm font-bold">
                    {bot.avatarEmoji ? `${bot.avatarEmoji} ` : ''}
                    {bot.name}
                  </p>
                  <BotFactChips bot={bot} />
                  {/*
                    **이름은 전부 찾았을 때만 잇는다 — 아니면 개수로 물러선다.**
                    일부만 찾아 그것만 이으면 못 찾은 반이 **말없이 사라져**, 두 반에 붙은 봇이 한 반에만 붙은 것처럼
                    보인다. 「방금 만든 봇」 배너(`app/(teacher)/teacher/classbot/page.tsx`)가 쓰는 규칙과 같다.
                  */}
                  <p className="text-pullim-slate-500 mt-1.5 text-2xs" data-testid={`class-bot-swap-rooms-${bot.id}`}>
                    {bot.classIds.length === 0
                      ? '아직 어느 반에도 안 붙어 있어요'
                      : rooms.length === bot.classIds.length
                        ? `지금 붙어 있는 반 · ${rooms.join(' · ')}`
                        : `지금 붙어 있는 반 ${bot.classIds.length}개`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={assign.isPending}
                  aria-label={`${bot.name} 붙이기`}
                  data-testid={`class-bot-swap-pick-${bot.id}`}
                  onClick={() => handleAttach(bot)}
                >
                  {busy ? '붙이는 중…' : '이 봇으로'}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          그만두기
        </Button>
      </div>
    </section>
  );
}

/**
 * 새 봇 만들어 붙이기 — `POST /bots` 뒤 `PUT /classes/:classId/bot`. 이름만 필수(`CreateBotDto`).
 * 비운 칸은 보내지 않는다(서버가 null 로 둔다) — 등급만 기본 3 을 고르개에 보인다.
 *
 * 붙이기만 실패하면(`BotAttachError`) 만든 봇을 `orphan` 으로 들고 폼을 접는다 — 제출을 다시 살려 두면 봇이 하나 더
 * 생긴다. 남는 길은 「다시 붙이기」(`PUT` 만)와 「그만두기」뿐이다(머리주석).
 */
function NewBotForm({
  classId,
  replacing,
  onDone,
}: {
  classId: string;
  /** 지금 붙은 봇이 있거나 모르면 true — 「바뀐다」고 미리 말한다. */
  replacing: boolean;
  onDone: () => void;
}) {
  const fieldId = useId();
  const create = useCreateBotForClass();
  const attach = useAssignClassBot();
  const [name, setName] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [tone, setTone] = useState('');
  const [greeting, setGreeting] = useState('');
  const [scope, setScope] = useState<ScopeLevel>(3);
  /** 만들어졌지만 붙지 못한 봇 — 이게 서면 폼은 닫히고 「다시 붙이기」만 남는다. */
  const [orphan, setOrphan] = useState<BotDto | null>(null);
  const [attachReason, setAttachReason] = useState<string | null>(null);

  const filled = name.trim() !== '';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!filled || create.isPending || orphan) return;
    const bot: CreateBotBody = {
      name: name.trim(),
      scope,
      ...(avatarEmoji.trim() ? { avatarEmoji: avatarEmoji.trim() } : {}),
      ...(subject.trim() ? { subject: subject.trim() } : {}),
      ...(grade ? { grade } : {}),
      ...(tone.trim() ? { tone: tone.trim() } : {}),
      ...(greeting.trim() ? { greeting: greeting.trim() } : {}),
    };
    create.mutate(
      { classId, bot },
      {
        onSuccess: ({ bot: made }) => {
          toast.success('봇을 만들어 붙였어요', { description: made.name });
          onDone();
        },
        onError: (error) => {
          if (error instanceof BotAttachError) {
            setOrphan(error.bot);
            setAttachReason(botFailureMessage(error.cause, 'attach'));
          }
        },
      },
    );
  }

  function handleRetryAttach() {
    if (!orphan || attach.isPending) return;
    const made = orphan;
    attach.mutate(
      { classId, botId: made.id },
      {
        onSuccess: () => {
          toast.success('봇을 붙였어요', { description: made.name });
          onDone();
        },
        onError: (error) => setAttachReason(botFailureMessage(error, 'attach')),
      },
    );
  }

  if (orphan) {
    return (
      <div className="mt-4 max-w-xl" data-testid="class-bot-orphan">
        <AlertCard tone="notice" icon={Link2} title={`「${orphan.name}」 봇은 만들어졌어요`}>
          <p className="text-pullim-slate-700 text-sm" data-testid="class-bot-orphan-reason">
            이 반에 붙이지 못했어요 — {attachReason} 다시 붙이면 봇을 새로 만들지 않아요.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="pullim"
              size="lg"
              onClick={handleRetryAttach}
              disabled={attach.isPending}
              data-testid="class-bot-attach-retry"
            >
              <Link2 />
              {attach.isPending ? '붙이는 중…' : '다시 붙이기'}
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={onDone} disabled={attach.isPending}>
              그만두기
            </Button>
          </div>
        </AlertCard>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card mt-4 max-w-xl space-y-4 rounded-2xl border p-5"
      data-testid="class-bot-create-form"
      aria-label="새 봇 만들어 붙이기"
    >
      {replacing && (
        <p className="text-pullim-slate-500 text-2xs" data-testid="class-bot-replace-note">
          지금 붙은 봇이 있으면 새 봇으로 바뀌어요. 지금까지의 대화 기록은 남아요.
        </p>
      )}
      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <Field label="봇 이름" htmlFor={`${fieldId}-name`}>
          <Input
            id={`${fieldId}-name`}
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 100))}
            placeholder="예: 문학 도우미"
            data-testid="bot-name-input"
            className="h-10 text-sm"
          />
        </Field>
        <Field label="아바타" hint="선택" htmlFor={`${fieldId}-avatar`}>
          <Input
            id={`${fieldId}-avatar`}
            value={avatarEmoji}
            onChange={(e) => setAvatarEmoji(e.target.value.slice(0, 16))}
            placeholder="📚"
            data-testid="bot-avatar-input"
            className="h-10 text-center text-sm"
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="과목" hint="선택" htmlFor={`${fieldId}-subject`}>
          <Input
            id={`${fieldId}-subject`}
            value={subject}
            onChange={(e) => setSubject(e.target.value.slice(0, 50))}
            placeholder="예: 국어"
            data-testid="bot-subject-input"
            className="h-10 text-sm"
          />
        </Field>
        <Field label="학년" hint="선택" htmlFor={`${fieldId}-grade`}>
          <select
            id={`${fieldId}-grade`}
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            data-testid="bot-grade-select"
            className={controlClass}
          >
            <option value="">안 정함</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </Field>
        <Field label="말투" hint="선택" htmlFor={`${fieldId}-tone`}>
          <Input
            id={`${fieldId}-tone`}
            value={tone}
            onChange={(e) => setTone(e.target.value.slice(0, 100))}
            placeholder="예: 친근"
            data-testid="bot-tone-input"
            className="h-10 text-sm"
          />
        </Field>
        <Field label="안전 등급" htmlFor={`${fieldId}-scope`}>
          <select
            id={`${fieldId}-scope`}
            value={scope}
            onChange={(e) => setScope(Number(e.target.value) as ScopeLevel)}
            data-testid="bot-scope-select"
            className={controlClass}
          >
            {levels.map((level) => (
              <option key={level} value={level}>{scopeOptionLabel(level)}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="인사말" hint="선택" htmlFor={`${fieldId}-greeting`}>
        <Textarea
          id={`${fieldId}-greeting`}
          value={greeting}
          onChange={(e) => setGreeting(e.target.value.slice(0, 1000))}
          placeholder="예: 안녕! 오늘은 무엇을 공부할까?"
          data-testid="bot-greeting-input"
          rows={2}
          className="text-sm"
        />
      </Field>

      {create.isError && (
        <p className="text-pullim-danger text-2xs font-bold" role="alert" data-testid="class-bot-create-error">
          {botFailureMessage(create.error, 'create')}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="pullim" size="lg" disabled={!filled || create.isPending} data-testid="class-bot-create-submit">
          <Plus />
          {create.isPending ? '만드는 중…' : '만들어 붙이기'}
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={onDone} disabled={create.isPending}>
          그만두기
        </Button>
      </div>
    </form>
  );
}

/**
 * 봇 고치기 — `PATCH /bots/:id`. 이 탭은 **이름 · 인사말 · 말투 · 등급**만 고친다(나머지는 빌더 · 별건 5d).
 * 바뀐 칸만 보낸다(`undefined` = 그대로): 알던 값을 지우면 `null`(비움), 모르던 칸(`bot` 없이 요약만 알 때)을 비워 두면
 * 안 보낸다 — 모르는 값을 지우지 않는다. 바꾼 것이 없으면 서버를 두드리지 않는다.
 */
function EditBotForm({
  summary,
  bot,
  onDone,
}: {
  summary: ClassBotSummaryDto;
  /** 이 세션이 아는 전체 모양 — 없으면 이름만 알고 시작한다. */
  bot: BotDto | undefined;
  onDone: () => void;
}) {
  const fieldId = useId();
  const update = useUpdateBot();
  const base = {
    name: bot?.name ?? summary.name,
    greeting: bot?.greeting ?? '',
    tone: bot?.tone ?? '',
    scope: bot && isScopeLevel(bot.scope) ? String(bot.scope) : '',
  };
  const [name, setName] = useState(base.name);
  const [greeting, setGreeting] = useState(base.greeting);
  const [tone, setTone] = useState(base.tone);
  const [scope, setScope] = useState(base.scope);
  // 아는 봇이면 빈 칸이 「없앰」(null)이고, 모르는 봇이면 빈 칸은 「안 보냄」이다 — 힌트가 그 차이를 말한다.
  const emptyHint = bot ? '비우면 없앰' : '비우면 그대로';

  function buildPatch(): UpdateBotBody {
    const patch: UpdateBotBody = {};
    if (name.trim() && name.trim() !== base.name) patch.name = name.trim();
    if (greeting.trim() !== base.greeting.trim()) patch.greeting = greeting.trim() ? greeting.trim() : null;
    if (tone.trim() !== base.tone.trim()) patch.tone = tone.trim() ? tone.trim() : null;
    if (scope !== '' && scope !== base.scope) patch.scope = Number(scope);
    return patch;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (update.isPending) return;
    const patch = buildPatch();
    if (Object.keys(patch).length === 0) {
      toast.message('바꾼 것이 없어요');
      onDone();
      return;
    }
    update.mutate(
      { botId: summary.id, patch },
      {
        onSuccess: (saved) => {
          toast.success('봇을 고쳤어요', { description: `붙어 있는 반 ${saved.classIds.length}개에 바로 적용돼요.` });
          onDone();
        },
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card mt-4 max-w-xl space-y-4 rounded-2xl border p-5"
      data-testid="class-bot-edit-form"
      aria-label="봇 고치기"
    >
      {!bot && (
        <p className="text-pullim-slate-500 text-2xs" data-testid="class-bot-edit-partial-note">
          지금은 이름만 알아요. 비워 둔 칸은 그대로 두고, 적은 칸만 바꿔요.
        </p>
      )}
      <Field label="봇 이름" htmlFor={`${fieldId}-name`}>
        <Input
          id={`${fieldId}-name`}
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 100))}
          data-testid="bot-edit-name-input"
          className="h-10 text-sm"
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="말투" hint={emptyHint} htmlFor={`${fieldId}-tone`}>
          <Input
            id={`${fieldId}-tone`}
            value={tone}
            onChange={(e) => setTone(e.target.value.slice(0, 100))}
            data-testid="bot-edit-tone-input"
            className="h-10 text-sm"
          />
        </Field>
        <Field label="안전 등급" htmlFor={`${fieldId}-scope`}>
          <select
            id={`${fieldId}-scope`}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            data-testid="bot-edit-scope-select"
            className={controlClass}
          >
            {!bot && <option value="">그대로</option>}
            {levels.map((level) => (
              <option key={level} value={String(level)}>{scopeOptionLabel(level)}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="인사말" hint={emptyHint} htmlFor={`${fieldId}-greeting`}>
        <Textarea
          id={`${fieldId}-greeting`}
          value={greeting}
          onChange={(e) => setGreeting(e.target.value.slice(0, 1000))}
          data-testid="bot-edit-greeting-input"
          rows={2}
          className="text-sm"
        />
      </Field>

      {update.isError && (
        <p className="text-pullim-danger text-2xs font-bold" role="alert" data-testid="class-bot-edit-error">
          {botFailureMessage(update.error, 'update')}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="pullim" size="lg" disabled={update.isPending || !name.trim()} data-testid="class-bot-edit-submit">
          {update.isPending ? '고치는 중…' : '고치기'}
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={onDone} disabled={update.isPending}>
          그만두기
        </Button>
      </div>
    </form>
  );
}

/**
 * 봇을 떼기 전에 한 번 묻는 판 — `components/classbot/bot-delete-dialog.tsx` 와 같은 골격(alertdialog · 바깥 눌러
 * 안 닫힘 · 포커스는 「그만두기」에 먼저). 떼기는 되돌릴 수 있지만(다시 붙이면 된다) 그 사이 학생이 대화를 못 보내니
 * 묻는다. 기록은 남는다(`messages.bot_id` · api.md § 3.5b).
 */
function DetachBotDialog({
  botName,
  classroomName,
  open,
  onOpenChange,
  onConfirm,
  finalFocus,
}: {
  botName: string;
  classroomName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  finalFocus: RefObject<HTMLElement | null>;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const particle = josa(botName, '을/를').slice(botName.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent
        role="alertdialog"
        showCloseButton={false}
        initialFocus={cancelRef}
        finalFocus={finalFocus}
        data-testid="class-bot-detach-dialog"
        className="gap-3"
      >
        <div className="flex items-start gap-2">
          <TriangleAlert className="text-pullim-danger mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <DialogTitle className="text-pullim-slate-900 text-base font-bold break-keep [overflow-wrap:anywhere]">
            {botName}
            {particle} 「{classroomName}」에서 뗄까요?
          </DialogTitle>
        </div>
        <DialogDescription className="text-pullim-slate-700 text-sm leading-relaxed break-keep">
          새 봇을 붙일 때까지 이 반의 학생은 대화를 보낼 수 없어요. 지금까지의 대화 기록은 남아요.
        </DialogDescription>
        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose
            render={<Button ref={cancelRef} type="button" variant="outline" size="touch" />}
            data-testid="class-bot-detach-cancel"
          >
            그만두기
          </DialogClose>
          <Button
            type="button"
            variant="pullim-danger"
            size="touch"
            aria-label={`${botName} 떼기`}
            data-testid="class-bot-detach-confirm"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            떼기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** 이름표 + 컨트롤 한 쌍 — 반 만들기 폼의 `Field` 와 같은 모양. */
function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="text-pullim-slate-700 mb-1 flex items-center justify-between text-xs font-bold">
        <span>{label}</span>
        {hint && <span className="text-pullim-slate-500 text-2xs">{hint}</span>}
      </Label>
      {children}
    </div>
  );
}
