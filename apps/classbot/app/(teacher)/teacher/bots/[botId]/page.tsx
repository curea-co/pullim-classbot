import { notFound } from 'next/navigation';
import { AlarmClock, Compass, Settings, Shield } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { SectionHeading } from '@/components/shell/section-heading';
import { FilterPills } from '@/components/classbot/filter-pills';
import { EmptyState } from '@/components/classbot/empty-state';
import { ComingSoonButton } from '@/components/classbot/coming-soon-button';
import { BotNote } from '@/components/classbot/bot-note';
import { Chip } from '@/components/ui/chip';
import { scopeMeta } from '@/lib/mock/tutor';
import {
  botPolicyTabs, currentDriftLevel, driftAlertThreshold, driftLevels,
  examOverride, getManagedBot, safetySchedule, type ManagedBot,
} from '@/lib/mock/classbot-bot-policy';
import { cn } from '@/lib/utils';

type Params = Promise<{ botId: string }>;
type SearchParams = Promise<{ tab?: string }>;

/**
 * 봇 관리 — 봇별 설정 (SCR-C-25 / FR-C-06, `proc/spec/03 § 4.4`).
 *
 * 종전 봇 설정 한 화면이 이 자리로 왔다. 달라진 것은 **설정이 봇 하나에 매인다**는 것뿐이고,
 * 탭 여섯과 그 안의 내용은 그대로다.
 *
 * 지금은 껍데기다. 탭으로 자리만 잡고 **실제로 보이는 것은 둘**이다.
 *   ① 안전 등급(L1~L5) 시간대 스케줄
 *   ② 이탈 대응 강도
 * 나머지 탭은 「준비 중」으로 자리만 남긴다.
 *
 * 저장은 아직 없다 — 각 탭의 저장 버튼은 ComingSoonButton 이고,
 * BE 가 붙을 자리는 각 섹션 주석에 표시해 뒀다.
 *
 * ⚠ 봇마다 다른 스케줄·이탈 강도는 아직 없다. 데모 기본값 한 벌을 모든 봇이 같이 본다
 * (`lib/mock/classbot-bot-policy.ts` 주석). **봇마다 다른 것은 헤더가 읽는 정체와 지금 안전 등급**이고,
 * 그건 카탈로그가 실제로 갖고 있는 값이다.
 */
export default async function TeacherBotSettingsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { botId } = await params;
  const { tab: rawTab } = await searchParams;

  const bot = getManagedBot(botId);
  if (!bot) notFound();

  const active = botPolicyTabs.find(t => t.value === rawTab) ?? botPolicyTabs[0];
  const scope = scopeMeta[bot.scope];

  return (
    <TeacherPageShell
      backHref="/teacher/bots"
      backLabel="봇 관리"
      header={{
        eyebrow: { icon: Settings, text: '봇 관리' },
        title: `${bot.botName} 운영 규칙`,
        description: describeBot(bot),
        // 지금 이 봇에 걸려 있는 등급 — 목록·운영 화면의 배지와 같은 출처(scopeMeta)를 읽는다
        action: (
          <Chip tone="outline" data-testid="bot-scope-chip" className="py-1">
            <Shield className="text-pullim-blue-600" aria-hidden />
            <span>
              <span className="sr-only">안전 등급 </span>
              <span className="font-mono">{scope.short}</span> {scope.label}
            </span>
          </Chip>
        ),
      }}
    >
      {/* 탭 — URL 로 옮긴다(서버 렌더 유지). 준비 중 탭도 자리를 차지한다. */}
      <section className="bg-card rounded-2xl border p-4">
        <FilterPills
          options={botPolicyTabs.map(t => ({
            value: t.value,
            label: t.ready ? t.label : `${t.label} (준비 중)`,
          }))}
          current={active.value}
          href={v => `/teacher/bots/${bot.botId}?tab=${v}`}
        />
      </section>

      {active.value === 'safety' && <SafetyTab />}
      {active.value === 'drift' && <DriftTab />}
      {!active.ready && (
        <EmptyState
          icon={Settings}
          title={`${active.label} 설정은 준비 중이에요`}
          description={active.placeholder}
          size="md"
        />
      )}
    </TeacherPageShell>
  );
}

/** 헤더 부제 — 과목·학년에 붙은 학급을 잇는다. 아직 안 붙였으면 그렇다고 말한다. */
function describeBot(bot: ManagedBot) {
  const where = bot.classroomLabels.length
    ? bot.classroomLabels.join(' · ')
    : '아직 붙은 학급이 없어요';
  return `${bot.subject} · ${bot.grade} · ${where}`;
}

/* ── ① 안전 등급 시간대 스케줄 ─────────────────────────────── */

function SafetyTab() {
  return (
    <>
      <section className="bg-card rounded-2xl border p-5">
        <SectionHeading
          title="안전 등급 시간대 스케줄"
          description="시간대마다 봇이 답할 수 있는 범위를 다르게 둘 수 있어요. 수업 중에는 좁게, 밤에는 넓게 두는 것이 기본이에요."
        />

        <ul className="space-y-2">
          {safetySchedule.map(slot => {
            const meta = scopeMeta[slot.scope];
            return (
              <li
                key={slot.id}
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

        {/* TODO(BE): 저장 자리 — PUT /api/teacher/bots/{botId}/safety-schedule */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ComingSoonButton
            asButton
            note="시간대 추가·수정"
            icon={AlarmClock}
          >
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
          {([1, 2, 3, 4, 5] as const).map(level => {
            const meta = scopeMeta[level];
            const inUse = safetySchedule.some(s => s.scope === level);
            return (
              <li
                key={level}
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
                  <span className={cn('font-mono text-xs font-bold', inUse ? 'text-pullim-blue-700' : 'text-pullim-slate-500')}>
                    {meta.short}
                  </span>
                  {inUse && (
                    <span className="text-pullim-blue-700 ml-auto text-2xs font-bold">쓰는 중</span>
                  )}
                </div>
                <div className="text-pullim-slate-900 mt-1 text-xs font-bold">{meta.label}</div>
                <p className="text-pullim-slate-500 mt-0.5 text-2xs leading-relaxed">{meta.allow}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <BotNote>
        등급을 바꾸면 언제 · 누가 바꿨는지 기록에 남아요.
      </BotNote>
    </>
  );
}

/* ── ② 이탈 대응 강도 ──────────────────────────────────────── */

function DriftTab() {
  return (
    <>
      <section className="bg-card rounded-2xl border p-5">
        <SectionHeading
          title="이탈 대응 강도"
          description="학생이 수업 범위 밖 이야기를 꺼냈을 때 봇이 어떻게 되돌릴지 정해요."
        />

        <ul className="grid gap-3 sm:grid-cols-3">
          {driftLevels.map(level => {
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
                  <span className={cn('text-xs font-bold', active ? 'text-pullim-slate-900' : 'text-pullim-slate-700')}>
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
          한 학생이 <b className="font-mono">{driftAlertThreshold}회</b> 넘게 범위를 벗어나면
          학급 관제소 명단에 표시돼요.
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
