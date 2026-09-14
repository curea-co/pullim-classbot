import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight, UserRound } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { SectionHeading } from '@/components/shell/section-heading';
import { ContextRail } from '@/components/shell/context-rail';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';
import { FilterPills } from '@/components/classbot/filter-pills';
import { EmptyState } from '@/components/classbot/empty-state';
import { BotNote } from '@/components/classbot/bot-note';
import {
  depthLabels, lastSeenText, reachLabels,
} from '@/lib/mock/classbot-monitoring';
import {
  buildStudentReport, findStudent, isReportPeriod, reportPeriods, siblingStudents,
  type ReportPeriod,
} from '@/lib/mock/classbot-student-report';
import { gradingItemsOfStudent } from '@/lib/mock/classbot-grading-roster';
import { entryTarget, resolveEntrySource } from './entry-source';
import { TranscriptViewer } from './transcript-viewer';
import { ProcessEvaluationPanel } from './process-evaluation-panel';
import { StuckPointsPanel } from './stuck-points-panel';
import { StudentGradingPanel } from './student-grading-panel';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ period?: string; from?: string }>;


/**
 * 학생별 대화기록 리포트 · 과정 평가 (SCR-C-32 / FR-C-33).
 *
 * 이 화면의 숫자는 전부 `classbot-student-report.ts` 한 곳을 통과한다.
 * 관제소(`/teacher/monitor`)도 같은 곳을 읽으므로 이탈·지름길 수치가 두 화면에서 어긋나지 않는다.
 *
 * 기간 고르기는 지금 **표시만** 한다 — 데이터는 같은 스냅샷이다.
 *
 * 채점 허브(`/teacher/grading`)의 학생 목록이 여기로 보낸다. 그래서 이 화면은 세 가지를 답해야 한다
 * (spec 11 § 3.3.3) — **어떤 봇과**(헤더) · **어떤 대화**를 했고(대화 기록 뷰어) ·
 * **어디서 막혔나**(막힌 지점 패널). 채점 허브로 돌아가는 길은 「이 학생의 채점」 패널이 맡는다.
 */
export default async function TeacherStudentReportPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { period: rawPeriod, from: rawFrom } = await searchParams;

  const student = findStudent(id);
  if (!student) notFound();

  const period: ReportPeriod = isReportPeriod(rawPeriod) ? rawPeriod : 'today';
  const from = resolveEntrySource(rawFrom);
  const entry = entryTarget(rawFrom);
  // 이동·기간 링크가 진입 source 를 그대로 이어받는다 — 몇 명을 넘겨도 되돌아갈 곳이 유지된다.
  const query = (p: ReportPeriod) => `?period=${p}&from=${from}`;
  const report = buildStudentReport(student);
  const { prev, next, index, total } = siblingStudents(id);
  const gradingItems = gradingItemsOfStudent(student.id);

  return (
    <TeacherPageShell
      backHref={entry.href}
      backLabel={entry.label}
      header={{
        eyebrow: { icon: UserRound, text: '학생 기록' },
        title: student.name,
        description: `${student.grade} · ${report.classroomLabel} · ${report.botName} · ${report.unit}`,
        action: (
          <nav aria-label="학생 이동" className="flex items-center gap-1.5">
            <StudentStep href={prev ? `/teacher/students/${prev.id}${query(period)}` : undefined} dir="prev" name={prev?.name} />
            <span className="text-pullim-slate-500 font-mono text-2xs">
              {index + 1}/{total}
            </span>
            <StudentStep href={next ? `/teacher/students/${next.id}${query(period)}` : undefined} dir="next" name={next?.name} />
          </nav>
        ),
      }}
    >
      {/* 기간 고르기 — 지금은 표시만, 데이터는 같은 스냅샷 */}
      <section className="bg-card rounded-2xl border p-4">
        <FilterPills
          label="기간"
          options={reportPeriods}
          current={period}
          href={v => `/teacher/students/${id}${query(v)}`}
        />
        <p className="text-pullim-slate-500 mt-2 text-xs">
          기간을 바꿔도 지금은 같은 스냅샷을 보여줘요. (준비 중)
        </p>
      </section>

      {/* 관제소 명단에 뜨는 값과 같은 값 — 같은 함수를 통과한다 */}
      <div className="space-y-2">
        <KpiStatBar cols={6}>
          <KpiStat label="도달 상태" value={reachLabels[student.reach]} tone={student.reach === 'not-reached' ? 'alert' : 'accent'} />
          <KpiStat label="요구 수준" value={`${student.targetDepth}단계`} />
          <KpiStat
            label="닿은 수준"
            value={`${student.actualDepth}단계`}
            tone={student.actualDepth < student.targetDepth ? 'alert' : 'default'}
          />
          <KpiStat
            label="지름길 시도"
            value={`${report.shortcutCount}회`}
            action={{ label: '과제 문항 손보기', href: '/teacher/builder' }}
          />
          <KpiStat
            label="범위 이탈"
            value={`${report.scopeExitCount}회`}
            // 관제소 mock 은 이 학생이 어느 봇을 쓰는지 모른다 — 봇은 목록에서 고른다.
            // 목록이 tab 을 그대로 이어 붙여 고른 봇의 「이탈 대응」으로 들여보낸다.
            action={{ label: '이탈 대응 강도', href: '/teacher/bots?tab=drift' }}
          />
          <KpiStat label="마지막 활동" value={lastSeenText(student)} />
        </KpiStatBar>

        <p className="text-pullim-slate-500 text-2xs">
          요구 수준 <b className="text-pullim-slate-700">{student.targetDepth}단계 · {depthLabels[student.targetDepth]}</b>,
          {' '}닿은 수준 <b className="text-pullim-slate-700">{student.actualDepth}단계 · {depthLabels[student.actualDepth]}</b>
        </p>
      </div>

      <ContextRail
        railWidth="md"
        rail={
          <>
            {/* 대화 주제 분포 */}
            <section className="bg-card rounded-2xl border p-5">
              <SectionHeading title="대화 주제 분포" description="학생이 말한 턴만 세요." />
              <ul className="space-y-2.5">
                {report.topicMix.map(slice => (
                  <li key={slice.kind}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-pullim-slate-900 text-xs font-bold">{slice.label}</span>
                      <span className="text-pullim-slate-500 font-mono text-2xs">
                        {slice.count}턴 · {slice.pct}%
                      </span>
                    </div>
                    <div className="bg-pullim-slate-100 mt-1 h-1.5 w-full overflow-hidden rounded-full">
                      <div
                        className="bg-pullim-blue-500 h-full rounded-full"
                        style={{ width: `${slice.pct}%` }}
                      />
                    </div>
                    <p className="text-pullim-slate-500 mt-1 text-2xs leading-relaxed">{slice.soWhat}</p>
                  </li>
                ))}
              </ul>
            </section>

            {/* 이탈 이력 — 건수는 관제소와 같은 값 */}
            <section className="bg-card rounded-2xl border p-5">
              <SectionHeading
                title={`이탈 이력 ${report.scopeExitCount}건`}
                description="봇이 수업 범위 밖 요청을 되돌린 기록이에요."
              />
              {report.scopeExitLog.length === 0 ? (
                <EmptyState tone="plain" size="sm" title="범위를 벗어난 요청이 없었어요" />
              ) : (
                <ol className="space-y-2">
                  {report.scopeExitLog.map(entry => (
                    <li key={entry.id} className="bg-pullim-slate-50 rounded-lg p-2.5">
                      <div className="text-pullim-slate-400 font-mono text-micro">{entry.at}</div>
                      <p className="text-pullim-slate-900 mt-0.5 text-2xs font-semibold">{entry.ask}</p>
                      <p className="text-pullim-slate-500 mt-1 text-2xs leading-relaxed">
                        <b className="text-pullim-slate-600">봇 대응</b> · {entry.handled}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
              <p className="text-pullim-slate-500 mt-2.5 text-xs leading-relaxed">
                이 건수는 학급 관제소 명단의 <b className="text-pullim-slate-700">{student.name} 이탈 {report.scopeExitCount}회</b>와 같은 값이에요.
              </p>
            </section>
          </>
        }
      >
        {/* 어디서 막혔나 — 대화 기록보다 먼저. 교사가 훑을 때 먼저 찾는 것이다 */}
        <StuckPointsPanel
          stuckPoints={report.stuckPoints}
          studentName={student.name}
          botName={report.botName}
        />

        <TranscriptViewer
          turns={report.transcript}
          studentName={student.name}
          botName={report.botName}
        />

        {/* 채점 허브로 돌아가는 길 */}
        <StudentGradingPanel items={gradingItems} studentName={student.name} />

        <ProcessEvaluationPanel
          studentId={student.id}
          studentName={student.name}
          criteria={report.evaluation}
        />

        <BotNote>
          이 리포트는 <b>무엇을 물었고 어떻게 되짚었는지</b>만 봐요.
          감정·집중도·체류시간은 담지 않았어요.
        </BotNote>
      </ContextRail>
    </TeacherPageShell>
  );
}

function StudentStep({ href, dir, name }: { href?: string; dir: 'prev' | 'next'; name?: string }) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
  const label = dir === 'prev' ? '이전 학생' : '다음 학생';
  const className =
    'inline-flex items-center gap-0.5 rounded-lg px-2 py-1.5 text-2xs font-bold transition-colors';

  if (!href) {
    return (
      <span className={`${className} text-pullim-slate-300`} aria-disabled="true">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">{label} 없음</span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`${className} text-pullim-slate-600 hover:bg-pullim-slate-100`}
      aria-label={`${label} ${name ?? ''}`}
    >
      {dir === 'prev' && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {name}
      {dir === 'next' && <Icon className="h-3.5 w-3.5" aria-hidden />}
    </Link>
  );
}
