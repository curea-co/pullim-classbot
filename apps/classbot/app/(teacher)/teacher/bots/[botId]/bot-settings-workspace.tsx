'use client';

/**
 * 봇별 설정 본문 — 봇 하나의 **정체**(이름·인사말·말투·안전 등급)를 고치고, 운영 규칙을 보여준다
 * (SCR-C-25 / FR-C-06 · `proc/spec/03 § 4.4` · 계획 PR 5d).
 *
 * ## 무엇이 정본이고 무엇이 아직 목인가 — 이 갈림이 이 파일의 전부다
 *
 * **정본**: 봇 그 자체다. `useMyBot` 이 내 봇 목록(`GET /classbot/me/bots` · api.md § 3.5b)에서 이 봇을 고르고,
 * 고치기는 `PATCH /classbot/bots/:id`(owner 만 · 남의 봇 404)로 간다. 머리의 이름·과목·학년·등급·붙은 반 수와
 * 아래 「이 봇」 칸의 값은 전부 그 한 행(`BotDto`)에서 온다.
 *
 * **목**: **시간대 스케줄·이탈 대응은 아직 서버에 없다 — `bots` 표에 칸이 없어 이 화면 안의 목이다.
 * 서버 상태를 지어내지 않는다.** `getSafetySchedule`·`examOverride`·`driftLevels`·`currentDriftLevel`·
 * `driftAlertThreshold` 는 `lib/mock/classbot-bot-policy.ts` 의 데모 기본값이고, 저장 버튼은 전부
 * `ComingSoonButton` 이다(BE 가 붙을 자리는 각 섹션의 `TODO(BE)` 주석). 스케줄의 가운데 두 칸만 **이 봇의
 * 실제 등급**을 따라간다 — 그래야 머리 배지와 아래 L1~L5 표가 같은 말을 한다.
 *
 * 목에서 걷어 낸 것은 **봇 카탈로그 쪽 절반**이다(`getManagedBot`·`getManagedBots`·`ManagedBot`).
 * 그 모듈 자체는 남는다 — 탭 목록과 위 규칙값을 다른 자리도 읽는다.
 *
 * ## 서버에 없는 값을 말하지 않는다
 *
 * 종전 머리 부제는 붙은 학급의 **이름**을 이었다(`classroomLabels`). 정본 `BotDto` 에는 `classIds` 뿐이라
 * 이름을 지어낼 수 없다 — 그래서 「붙은 반 N개」로 센다. `subject`·`grade`·`tone`·`greeting` 도 null 이 될 수
 * 있고, 그때는 그 칸을 통째로 뺀다.
 *
 * ## 고치기 폼은 탭 바 **위**에 선다
 *
 * 고치는 것은 탭 하나의 설정이 아니라 봇 그 자체라, 어느 탭을 보고 있든 같은 자리에서 고쳐야 한다.
 * 그래서 `botPolicyTabs` 에 있던 「봇 이름·말투」 탭(`ready:false` · 「준비 중」)을 **걷었다** —
 * 그 탭이 「준비 중」이라 적어 둔 일(이름·말투·첫 인사말 고치기)을 바로 위 칸이 이미 하고 있어,
 * 같은 화면이 제 말을 뒤집고 있었다.
 */

import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { AlarmClock, Archive, Compass, Pencil, RotateCcw, SearchX, Settings, Shield } from 'lucide-react';
import { BotNote } from '@/components/classbot/bot-note';
import { ComingSoonButton } from '@/components/classbot/coming-soon-button';
import { EmptyState } from '@/components/classbot/empty-state';
import { FilterPills } from '@/components/classbot/filter-pills';
import { ReadErrorState, ReadLoginGate } from '@/components/classbot/read-state';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { SectionHeading } from '@/components/shell/section-heading';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useMyBot, useMyBots, useRestoreBot, useUpdateBot } from '@/hooks/api/bot';
import { isUnauthorized, statusOf } from '@/lib/api/classbot-client';
import type { BotDto, UpdateBotBody } from '@/lib/api/classbot-dto';
import { botFailureMessage } from '@/lib/bot-failure-message';
import {
  botPolicyTabs,
  currentDriftLevel,
  driftAlertThreshold,
  driftLevels,
  examOverride,
  getSafetySchedule,
} from '@/lib/mock/classbot-bot-policy';
import { isScopeLevel, scopeMeta, type ScopeLevel } from '@/lib/mock/tutor';
import { cn } from '@/lib/utils';
import { ScopeChip } from '../bots-workspace';

/**
 * 봇별 설정 화면.
 *
 * 상태를 넷으로 가른다 — 읽는 중 · 세션 끊김(로그인 안내) · 읽기 실패(다시 시도) · **내 봇이 아님.**
 * 마지막 것이 종전 `notFound()` 자리다: `useMyBot` 이 「읽는 중」이 아닌데 봇을 못 찾았다면 그건 「모른다」가
 * 아니라 **「내 봇 중에 없다」** 다(지워졌거나 남의 봇 — `hooks/api/bot.ts`). 읽는 중에 그 말을 하면 멀쩡한 봇을
 * 없다고 하는 것이라, 두 칸을 반드시 갈라 본다.
 *
 * @param botId - 정본 `bots` 행 id
 * @param tab - 열린 탭 값(`page.tsx` 가 `?tab=` 에서 걸러 넘긴다)
 * @returns 봇별 설정 화면
 */
export function BotSettingsWorkspace({ botId, tab }: { botId: string; tab: string }) {
  const { bot, isPending, error } = useMyBot(botId);
  /*
    「다시 시도」는 **목록을 다시 읽는 것**이다 — `useMyBot` 은 그 목록에서 고르기만 해 재시도 손잡이가 없다.
    같은 쿼리라 구독이 하나 더 붙을 뿐 요청이 둘로 늘지는 않는다.
  */
  const { refetch } = useMyBots('all');

  if (isPending) {
    return (
      <Shell title="봇 설정">
        <div className="space-y-3" aria-busy="true" data-testid="bot-settings-loading">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </Shell>
    );
  }

  if (error) {
    // 401 은 고장이 아니다 — `classbotRead` 가 이미 로그인으로 보내는 중이고, 그 한 박자를 게이트가 든다.
    // 라벨은 `${label}를 보려면` 에 들어가므로 받침 없는 말이어야 한다(「봇 설정를」 ✗).
    return (
      <Shell title="봇 설정">
        {isUnauthorized(error) ? <ReadLoginGate label="봇 관리" /> : <ReadErrorState onRetry={() => void refetch()} />}
      </Shell>
    );
  }

  if (!bot) {
    return (
      <Shell title="봇 설정">
        <EmptyState
          icon={SearchX}
          title="없는 봇이에요"
          description="지워졌거나 내 봇이 아니에요. 봇 관리 목록에서 봇을 골라 주세요."
          action={{ href: '/teacher/bots', label: '봇 관리' }}
        />
      </Shell>
    );
  }

  const active = botPolicyTabs.find((t) => t.value === tab) ?? botPolicyTabs[0];
  // 등급은 서버가 `number` 로 준다 — 다섯으로 좁혀지지 않으면 시간대 표를 그리지 않는다(아래 `SafetyTab`).
  const level = isScopeLevel(bot.scope) ? bot.scope : null;
  const archived = bot.state === 'archived';

  return (
    <Shell
      title={`${bot.name} 운영 규칙`}
      description={describeBot(bot)}
      // 이 봇의 기본 등급 — 목록·운영 화면의 배지와 같은 출처(scopeMeta)를 읽는다
      action={archived ? <ArchivedBotRestore bot={bot} /> : <ScopeChip scope={bot.scope} testId="bot-scope-chip" />}
    >
      {archived && (
        <div className="bg-pullim-slate-50 text-pullim-slate-700 flex items-start gap-2 rounded-xl border p-3 text-sm">
          <Archive className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          보관된 봇은 읽기 전용이에요. 다시 사용하거나 고치려면 먼저 복구해 주세요.
        </div>
      )}
      <BotIdentityCard bot={bot} readOnly={archived} />

      {/* 탭 — URL 로 옮긴다. 준비 중 탭도 자리를 차지한다. */}
      <section className="bg-card rounded-2xl border p-4">
        <FilterPills
          options={botPolicyTabs.map((t) => ({
            value: t.value,
            label: t.ready ? t.label : `${t.label} (준비 중)`,
          }))}
          current={active.value}
          href={(v) => `/teacher/bots/${encodeURIComponent(bot.id)}?tab=${encodeURIComponent(v)}`}
        />
      </section>

      {active.value === 'safety' && <SafetyTab scope={level} />}
      {active.value === 'drift' && <DriftTab />}
      {!active.ready && (
        <EmptyState
          icon={Settings}
          title={`${active.label} 설정은 준비 중이에요`}
          description={active.placeholder}
          size="md"
        />
      )}
    </Shell>
  );
}

/**
 * 이 화면의 골격 — 뒤로 가기는 늘 봇 관리 목록이다.
 * @param title - 머리 제목(봇을 아직 모를 때는 「봇 설정」)
 * @param description - 머리 부제
 * @param action - 머리 오른쪽(등급 칩)
 * @param children - 본문
 * @returns 교사 화면 골격
 */
function Shell({
  title,
  description,
  action,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <TeacherPageShell
      backHref="/teacher/bots"
      backLabel="봇 관리"
      header={{ eyebrow: { icon: Settings, text: '봇 관리' }, title, description, action }}
    >
      {children}
    </TeacherPageShell>
  );
}

/**
 * 머리 부제 — 과목·학년에 붙어 있는 반 **수**를 잇는다.
 *
 * 반 **이름**은 정본에 없다(`BotDto.classIds` 는 id 뿐이고 반 하나를 읽는 문도 아직 없다 — dto 머리주석).
 * 그래서 세기만 한다. 없는 칸(과목·학년)은 빼고, 아무것도 없으면 붙은 반 이야기만 남는다.
 *
 * @param bot - 정본 한 행
 * @returns 부제 한 줄
 */
function describeBot(bot: BotDto): string {
  const where = bot.classIds.length > 0 ? `붙은 반 ${bot.classIds.length}개` : '아직 붙은 학급이 없어요';
  return [bot.subject, bot.grade, where].filter((v): v is string => Boolean(v)).join(' · ');
}

/* ── 봇 정체 — 정본을 고치는 유일한 자리 ─────────────────────── */

/**
 * 「이 봇」 칸 — 지금 말투·인사말을 보여주고, [봇 고치기] 로 폼을 연다.
 *
 * 탭 바 **위**에 두는 까닭: 고치는 것은 탭 하나의 설정이 아니라 봇 그 자체라, 어느 탭을 보고 있든 같은 자리에서
 * 고쳐야 한다. 과목·학년·등급은 바로 위 머리가 이미 말하므로 여기서 또 말하지 않는다 — 여기 남는 것은 머리에
 * 없는 둘(말투·인사말)뿐이다.
 *
 * @param bot - 정본 한 행
 * @returns 봇 정체 칸
 */
function BotIdentityCard({ bot, readOnly = false }: { bot: BotDto; readOnly?: boolean }) {
  const [editing, setEditing] = useState(false);

  return (
    <section className="bg-card rounded-2xl border p-5" data-testid="bot-identity">
      <SectionHeading
        title="이 봇"
        description="이름 · 인사말 · 말투 · 안전 등급을 여기서 고쳐요. 붙어 있는 반 전부에 바로 적용돼요."
        action={!readOnly ? (
          <Button
            type="button"
            variant={editing ? 'outline' : 'pullim'}
            size="lg"
            onClick={() => setEditing(!editing)}
            aria-expanded={editing}
            data-testid="bot-edit-toggle"
          >
            <Pencil />
            봇 고치기
          </Button>
        ) : undefined}
      />

      {editing ? (
        <EditBotForm key={bot.id} bot={bot} onDone={() => setEditing(false)} />
      ) : (
        <div data-testid="bot-identity-facts">
          <div className="flex flex-wrap items-center gap-1.5">
            {bot.tone ? (
              <Chip tone="outline">말투 · {bot.tone}</Chip>
            ) : (
              <span className="text-pullim-slate-500 text-2xs">말투를 아직 안 정했어요.</span>
            )}
          </div>
          {bot.greeting ? (
            <p className="text-pullim-slate-700 mt-2 text-sm break-keep" data-testid="bot-greeting">
              “{bot.greeting}”
            </p>
          ) : (
            <p className="text-pullim-slate-500 mt-2 text-2xs">
              첫 인사말을 적어 두면 학생이 대화를 열 때 봇이 먼저 건네요.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function ArchivedBotRestore({ bot }: { bot: BotDto }) {
  const restore = useRestoreBot();
  return (
    <Button
      type="button"
      size="touch"
      variant="outline"
      disabled={restore.isPending}
      onClick={() => restore.mutate(bot.id, {
        onSuccess: () => toast.success('봇을 복구했어요.'),
        onError: (error) => toast.error(
          statusOf(error) === 404
            ? '봇을 찾을 수 없어요. 목록으로 돌아가 새로고침해 주세요.'
            : '봇을 복구하지 못했어요. 잠시 후 다시 시도해 주세요.',
        ),
      })}
    >
      <RotateCcw aria-hidden /> {restore.isPending ? '복구 중…' : '봇 복구'}
    </Button>
  );
}

/** 등급 고르개 한 줄 — `L3 · 교과 범위`. 반 상세 「봇」 탭과 같은 글자다. */
function scopeOptionLabel(level: ScopeLevel): string {
  return `${scopeMeta[level].short} · ${scopeMeta[level].label}`;
}

const levels: ScopeLevel[] = [1, 2, 3, 4, 5];

/** 폼 컨트롤 공통 결 — 반 상세 「봇」 탭의 폼과 같은 눈금. */
const controlClass =
  'border-pullim-slate-200 focus:border-pullim-blue-500 w-full rounded-lg border px-3 py-2 text-sm outline-none';

/**
 * 봇 고치기 — `PATCH /classbot/bots/:id`. **이름 · 인사말 · 말투 · 안전 등급** 넷만 고친다
 * (과목·학년·아바타·빠른 질문은 빌더 몫 — `/teacher/builder`).
 *
 * `UpdateBotBody` 규약 그대로 **바뀐 칸만** 싣는다: 안 건드린 칸은 `undefined`(그대로), 적혀 있던 글을 지우면
 * `null`(비움). 이름과 등급은 null 을 받지 않아 비우면 안 보낸다. 바꾼 것이 없으면 서버를 두드리지 않는다.
 *
 * @param bot - 고칠 봇(정본 한 행 — 여기서는 늘 전체 모양을 안다)
 * @param onDone - 닫기
 * @returns 고치기 폼
 */
function EditBotForm({ bot, onDone }: { bot: BotDto; onDone: () => void }) {
  const fieldId = useId();
  const update = useUpdateBot();
  const base = {
    name: bot.name,
    greeting: bot.greeting ?? '',
    tone: bot.tone ?? '',
    // 서버 값이 1~5 밖이면 「그대로」로 연다 — 지어낸 등급으로 덮어쓰지 않는다.
    scope: isScopeLevel(bot.scope) ? String(bot.scope) : '',
  };
  const [name, setName] = useState(base.name);
  const [greeting, setGreeting] = useState(base.greeting);
  const [tone, setTone] = useState(base.tone);
  const [scope, setScope] = useState(base.scope);

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
      { botId: bot.id, patch },
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
      className="max-w-xl space-y-4"
      data-testid="bot-edit-form"
      aria-label="봇 고치기"
    >
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
        <Field label="말투" hint="비우면 없앰" htmlFor={`${fieldId}-tone`}>
          <Input
            id={`${fieldId}-tone`}
            value={tone}
            onChange={(e) => setTone(e.target.value.slice(0, 100))}
            placeholder="예: 친근"
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
            {base.scope === '' && <option value="">그대로</option>}
            {levels.map((level) => (
              <option key={level} value={String(level)}>
                {scopeOptionLabel(level)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="인사말" hint="비우면 없앰" htmlFor={`${fieldId}-greeting`}>
        <Textarea
          id={`${fieldId}-greeting`}
          value={greeting}
          onChange={(e) => setGreeting(e.target.value.slice(0, 1000))}
          placeholder="예: 안녕! 오늘은 무엇을 공부할까?"
          data-testid="bot-edit-greeting-input"
          rows={2}
          className="text-sm"
        />
      </Field>

      {update.isError && (
        <p className="text-pullim-danger text-2xs font-bold" role="alert" data-testid="bot-edit-error">
          {botFailureMessage(update.error, 'update')}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant="pullim"
          size="lg"
          disabled={update.isPending || !name.trim()}
          data-testid="bot-edit-submit"
        >
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
 * 이름표 + 컨트롤 한 쌍 — 반 상세 「봇」 탭의 `Field` 와 같은 모양.
 * @param label - 이름표
 * @param hint - 오른쪽 작은 글씨
 * @param htmlFor - 묶을 컨트롤 id
 * @param children - 컨트롤
 * @returns 폼 한 칸
 */
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

/* ── ① 안전 등급 시간대 스케줄 (목) ─────────────────────────── */

/**
 * 시간대 스케줄 — **목이다**(파일 머리주석). 서버 `bots` 표에 시간대 칸이 없어 값은 데모 기본값이고,
 * 가운데 두 칸만 이 봇의 **실제 등급**을 따라간다. 한 벌짜리 상수였을 때는 L4 봇의 머리 배지와 아래 L1~L5 표가
 * 서로 다른 말을 했다.
 *
 * 등급이 L1~L5 밖이면 표를 그리지 않는다 — 그 봇이 어느 칸을 쓰는지 화면이 모르는데 아무 칸이나 칠하면
 * 지어내는 것이다. 지금 몇 시인지도 보지 않는다(시계를 타면 테스트와 prod-verify 가 흔들린다).
 *
 * @param scope - 이 봇의 기본 등급. 서버 값이 1~5 밖이면 null
 * @returns 안전 등급 탭
 */
function SafetyTab({ scope }: { scope: ScopeLevel | null }) {
  const schedule = scope === null ? [] : getSafetySchedule(scope);

  return (
    <>
      <section className="bg-card rounded-2xl border p-5">
        <SectionHeading
          title="안전 등급 시간대 스케줄"
          description="시간대마다 봇이 답할 수 있는 범위를 다르게 둘 수 있어요. 수업 중에는 좁게, 밤에는 넓게 두는 것이 기본이에요. 나머지 시간은 이 봇의 기본 등급을 그대로 써요."
        />

        {scope === null ? (
          <p className="text-pullim-slate-500 text-sm" data-testid="safety-scope-unreadable">
            이 봇의 기본 등급이 L1~L5 밖이라 시간대 표를 그릴 수 없어요. 위 [봇 고치기] 에서 등급을 다시 정해 주세요.
          </p>
        ) : (
          <ul className="space-y-2">
            {schedule.map((slot) => {
              const meta = scopeMeta[slot.scope];
              return (
                <li
                  key={slot.id}
                  data-testid={`safety-slot-${slot.id}`}
                  className="bg-pullim-slate-50 grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-xl p-3"
                >
                  <span className="text-pullim-slate-700 font-mono text-xs font-bold">
                    {slot.from}–{slot.to}
                  </span>
                  <span className="bg-pullim-blue-100 text-pullim-blue-700 rounded-full px-2 py-0.5 text-center font-mono text-2xs font-bold">
                    {meta.short}
                  </span>
                  <span className="min-w-0">
                    <span className="text-pullim-slate-900 block text-xs font-bold">{meta.label}</span>
                    <span className="text-pullim-slate-500 block text-2xs">{slot.why}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {/* TODO(BE): 저장 자리 — PUT /api/teacher/bots/{botId}/safety-schedule */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ComingSoonButton asButton note="시간대 추가·수정" icon={AlarmClock}>
            시간대 손보기
          </ComingSoonButton>
          <span className="text-pullim-slate-500 text-2xs">
            시험 기간 덮어쓰기: {examOverride.enabled ? '켜짐' : '꺼짐'} · {examOverride.note}
          </span>
        </div>
      </section>

      {/* L1~L5 가 각각 무엇인지 — 등급 숫자만 두면 읽을 수 없다 */}
      <section className="bg-card rounded-2xl border p-5">
        <SectionHeading title="안전 등급 L1~L5" description="등급마다 봇이 답할 수 있는 범위예요." />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {levels.map((level) => {
            const meta = scopeMeta[level];
            // 「쓰는 중」은 이 봇의 스케줄이 정한다 — 머리 배지와 어긋나지 않게
            const inUse = schedule.some((s) => s.scope === level);
            return (
              <li
                key={level}
                data-testid={`safety-level-${level}`}
                className={cn(
                  'rounded-xl border p-3',
                  inUse ? 'border-pullim-blue-200 bg-pullim-blue-50/60' : 'border-pullim-slate-200',
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Shield
                    className={cn('h-3 w-3', inUse ? 'text-pullim-blue-600' : 'text-pullim-slate-400')}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      'font-mono text-xs font-bold',
                      inUse ? 'text-pullim-blue-700' : 'text-pullim-slate-500',
                    )}
                  >
                    {meta.short}
                  </span>
                  {inUse && <span className="text-pullim-blue-700 ml-auto text-2xs font-bold">쓰는 중</span>}
                </div>
                <div className="text-pullim-slate-900 mt-1 text-xs font-bold">{meta.label}</div>
                <p className="text-pullim-slate-500 mt-0.5 text-2xs leading-relaxed">{meta.allow}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <BotNote>등급을 바꾸면 언제 · 누가 바꿨는지 기록에 남아요.</BotNote>
    </>
  );
}

/* ── ② 이탈 대응 강도 (목) ─────────────────────────────────── */

/**
 * 이탈 대응 강도 — **목이다**(파일 머리주석). 강도·알림 기준은 봇마다 갈리지 않는 데모 기본값 한 벌이고,
 * 서버에 그 칸이 생기기 전에 봇 수만큼 값을 지어내면 화면이 사실이 아닌 것을 말한다.
 * @returns 이탈 대응 탭
 */
function DriftTab() {
  return (
    <>
      <section className="bg-card rounded-2xl border p-5">
        <SectionHeading
          title="이탈 대응 강도"
          description="학생이 수업 범위 밖 이야기를 꺼냈을 때 봇이 어떻게 되돌릴지 정해요."
        />

        <ul className="grid gap-3 sm:grid-cols-3">
          {driftLevels.map((level) => {
            const active = level.value === currentDriftLevel;
            return (
              <li
                key={level.value}
                className={cn(
                  'rounded-xl border-2 p-3',
                  active ? 'border-pullim-blue-500 bg-pullim-blue-50' : 'border-pullim-slate-200',
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Compass
                    className={cn('h-3.5 w-3.5', active ? 'text-pullim-blue-600' : 'text-pullim-slate-400')}
                    aria-hidden
                  />
                  <span
                    className={cn('text-xs font-bold', active ? 'text-pullim-slate-900' : 'text-pullim-slate-700')}
                  >
                    {level.label}
                  </span>
                  {active && (
                    <span className="bg-pullim-blue-600 ml-auto rounded-full px-1.5 py-0.5 text-2xs font-bold text-white">
                      지금 설정
                    </span>
                  )}
                </div>
                <p className="text-pullim-slate-500 mt-1 text-2xs leading-relaxed">{level.description}</p>
                <p className="text-pullim-slate-700 mt-2 rounded-lg bg-white px-2 py-1.5 text-2xs leading-relaxed">
                  “{level.example}”
                </p>
              </li>
            );
          })}
        </ul>

        {/* TODO(BE): 저장 자리 — PUT /api/teacher/bots/{botId}/drift-policy */}
        <div className="mt-3">
          <ComingSoonButton asButton note="강도 바꾸기" icon={Compass}>
            강도 바꾸기
          </ComingSoonButton>
        </div>
      </section>

      <section className="bg-card rounded-2xl border p-5">
        <SectionHeading title="언제 선생님께 알릴까" />
        <p className="text-pullim-slate-700 text-sm">
          한 학생이 <b className="font-mono">{driftAlertThreshold}회</b> 넘게 범위를 벗어나면 학급 관제소 명단에
          표시돼요.
        </p>
        <p className="text-pullim-slate-500 mt-1 text-2xs leading-relaxed">
          이탈 횟수는 학생을 나무랄 숫자가 아니라 과제 문항과 봇 규칙을 손볼 신호로 읽어주세요.
        </p>
        {/* TODO(BE): 저장 자리 — PUT /api/teacher/bots/{botId}/drift-policy (threshold) */}
        <div className="mt-3">
          <ComingSoonButton asButton note="알림 기준 바꾸기">
            기준 바꾸기
          </ComingSoonButton>
        </div>
      </section>
    </>
  );
}
