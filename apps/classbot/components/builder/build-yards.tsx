'use client';

import Link from 'next/link';
import { FileText, ShieldCheck, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioCard, RadioCardGroup } from '@/components/classbot/radio-card';
import { botSignature } from '@/lib/tokens/bot-signature';
import { cn } from '@/lib/utils';
import { FieldLabel } from './field-mark';
import { PickChip } from './pick-chip';
import {
  BOT_NAME_MAX,
  cloneSources, grades, sampleFiles, scopeLevels, scopeMeta,
  styleMeta, subjectIds, subjectMeta, toneMeta, wrongMeta,
  type BotDraft, type CloneSource, type FieldKey,
  type StyleId, type SubjectId, type ToneId, type WrongId,
} from './builder-types';

/**
 * 마당 셋 — 봇 소개 · 보고 답할 것 · 가르치는 법.
 *
 * 8단계에서 여기로 옮겨온 것:
 *  ① 정체성 → 마당 1, ③ 교안 → 마당 2, ⑤ Scope → 마당 2(「답 범위」), ④ 수업 방식 → 마당 3.
 * 없어진 것:
 *  ② 목소리·TTS(봇이 소리로 말하는 화면이 기획 보류라 들을 곳이 없다),
 *  ⑥ 평가 기준 — 봇 수준 5영역 가중치는 없앤다. 과제 출제의 문항별 채점 기준은
 *     이것과 다른 층이라 대체 관계가 아니다 (핸드오프 § 4.1 대응표 6a),
 *  ⑦ 학생 안전(끌 수 없으니 고를 것이 아니다 — 「채워진 것」의 고정 줄로만 보인다),
 *  ⑧ 테스트·배포(관문이 아니라 「만든 뒤 화면」이 됐다).
 */

type YardProps = {
  draft: BotDraft;
  /** 한 번의 고르기 = 한 항목의 값 + 그 항목의 own 하나. 이 한 길로만 값이 바뀐다. */
  onPick: (field: FieldKey, patch: Partial<BotDraft>, own?: boolean) => void;
};

/* ─── 마당 1 — 봇 소개 ─── */

/** 봇 카탈로그는 정적 mock 이라 렌더마다 다시 고를 이유가 없다. */
const clones = cloneSources();

export function Yard1Intro({
  draft, onPick, onClone, subjectError, nameError,
}: YardProps & {
  onClone: (source: CloneSource) => void;
  subjectError: boolean;
  nameError: boolean;
}) {
  /** 이미 고른 과목을 다시 누르는 것은 바꾸는 게 아니다 — 올린 자료를 지우지 않는다. */
  function selectSubject(id: SubjectId) {
    if (draft.subject === id) return;
    onPick('subject', pickSubject(draft, id));
  }

  return (
    <div className="space-y-4">
      <section className="bg-card rounded-2xl border p-4 lg:p-5">
        <h2 className="text-pullim-slate-900 text-base font-bold tracking-tight">지난 봇에서 가져오기</h2>
        <p className="text-pullim-slate-500 mt-0.5 text-xs leading-relaxed">
          <strong>과목 · 학년 · 말투 · 답 범위</strong> 네 가지가 따라와요.
          수업 자료와 가르치는 법, 이름은 봇마다 달라서 따라오지 않아요 — 아래에서 정하면 돼요.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {clones.map((c) => {
            const sig = botSignature({ subject: subjectMeta[c.subject].label });
            return (
              <button
                key={c.botId}
                type="button"
                onClick={() => onClone(c)}
                data-testid={`clone-${c.botId}`}
                className="border-pullim-slate-200 hover:border-pullim-blue-400 hover:bg-pullim-blue-50 focus-visible:ring-pullim-blue-400/50 flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors outline-none focus-visible:ring-3"
              >
                <span
                  aria-hidden
                  style={{ backgroundColor: sig.hex }}
                  className="text-pullim-slate-900 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                >
                  {subjectMeta[c.subject].initial}
                </span>
                <span className="min-w-0">
                  <span className="text-pullim-slate-900 block truncate text-xs font-bold">{c.name}</span>
                  <span className="text-pullim-slate-500 block truncate text-micro">{c.meta}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-card rounded-2xl border p-4 lg:p-5">
        <h2 className="text-pullim-slate-900 text-base font-bold tracking-tight">봇 소개</h2>
        <p className="text-pullim-slate-500 mt-0.5 text-xs">학생이 만날 봇이 누구인지 정해요.</p>

        <div className="mt-4 space-y-4">
          {/* 과목 — 기본값이 없는 유일한 항목 */}
          <div>
            <FieldLabel field="subject" draft={draft}>과목</FieldLabel>
            <RadioCardGroup ariaLabel="과목" cols={3}>
              {subjectIds.map((id) => {
                const meta = subjectMeta[id];
                const sig = botSignature({ subject: meta.label });
                return (
                  <RadioCard
                    key={id}
                    active={draft.subject === id}
                    onSelect={() => selectSubject(id)}
                    title={meta.label}
                    description={meta.botName}
                    icon={
                      <span
                        aria-hidden
                        style={{ backgroundColor: sig.hex }}
                        className="mt-1 block h-2.5 w-2.5 rounded-full"
                      />
                    }
                  />
                );
              })}
            </RadioCardGroup>
            <p className="text-pullim-slate-400 mt-1.5 text-micro">
              과목을 고르면 봇 이름과 색이 따라 정해져요. 이름은 아래에서 바로 고쳐요.
            </p>
            {subjectError && (
              <p role="alert" className="text-pullim-danger mt-1.5 text-micro font-bold">
                과목을 골라야 봇을 만들 수 있어요.
              </p>
            )}
          </div>

          {/* 학년 */}
          <div>
            <FieldLabel field="grade" draft={draft}>학년</FieldLabel>
            <div role="radiogroup" aria-label="학년" className="flex flex-wrap gap-1.5">
              {grades.map((g) => (
                <PickChip
                  key={g}
                  role="radio"
                  active={draft.grade === g}
                  label={g}
                  onSelect={() => onPick('grade', { grade: g })}
                />
              ))}
            </div>
            <p className="text-pullim-slate-400 mt-1.5 text-micro">
              한 학년만 골라요. 여러 반에 쓸 때는 만든 뒤에 반마다 넣어요.
            </p>
          </div>

          {/* 봇 이름 */}
          <div>
            <FieldLabel field="name" draft={draft} htmlFor="bld-name">봇 이름</FieldLabel>
            <Input
              id="bld-name"
              type="text"
              value={draft.name}
              onChange={(e) => onPick('name', { name: e.target.value }, e.target.value.trim().length > 0)}
              maxLength={BOT_NAME_MAX}
              placeholder={draft.subject ? subjectMeta[draft.subject].botName : '과목을 고르면 이름이 정해져요'}
              aria-invalid={nameError || undefined}
              className="h-10 text-sm"
            />
            <p className="text-pullim-slate-400 mt-1.5 text-micro">학생은 이 이름으로 봇을 불러요.</p>
            {nameError && (
              <p role="alert" className="text-pullim-danger mt-1.5 text-micro font-bold">
                이름은 두 글자에서 서른 글자 사이로 적어 주세요.
              </p>
            )}
          </div>

          {/* 말투 */}
          <div>
            <FieldLabel field="tone" draft={draft}>말투</FieldLabel>
            <RadioCardGroup ariaLabel="말투" cols={3}>
              {(Object.keys(toneMeta) as ToneId[]).map((t) => (
                <RadioCard
                  key={t}
                  active={draft.tone === t}
                  onSelect={() => onPick('tone', { tone: t })}
                  title={toneMeta[t].label}
                  description={toneMeta[t].description}
                />
              ))}
            </RadioCardGroup>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * 과목을 바꾸면 올려 둔 자료도 그 과목 것으로 따라간다 (데모).
 * 자료를 그대로 두면 국어봇이 기후도 필기를 읽고 있는 화면이 된다.
 */
/**
 * 과목을 **바꾸면** 올린 자료를 비운다 — 지난 과목의 수업 자료는 새 과목에서 뜻이 없다.
 * 자료를 갈아치우면서 `own.files` 를 그대로 두면 교사가 고른 적 없는 자료가 계속
 * 「내가 정함」으로 남아 항목 옆 표시와 「채워진 것」이 어긋난다(`pick()` 의 `invalidatedBy`).
 *
 * 이미 고른 과목을 다시 누르는 것은 **바꾸는 게 아니다.** 그때도 비우면 교사가 올린 자료가
 * 까닭 없이 사라진다 — 그래서 값이 같으면 아무 일도 하지 않는다.
 */
function pickSubject(draft: BotDraft, subject: SubjectId): Partial<BotDraft> {
  return { subject, files: [] };
}

/* ─── 마당 2 — 보고 답할 것 ─── */

export function Yard2Answers({ draft, onPick }: YardProps) {
  const pool = draft.subject ? sampleFiles[draft.subject] : [];

  function addFile() {
    if (!draft.subject) {
      toast.warning('과목을 먼저 골라요');
      return;
    }
    // 자리(index)가 아니라 「아직 안 올린 것」으로 고른다 —
    // 가운데 자료를 뺀 뒤 다시 올리면 자리로는 같은 자료가 두 번 들어온다
    const next = pool.find((f) => !draft.files.some((x) => x.name === f.name));
    if (!next) {
      toast.info('데모에 준비된 자료는 여기까지예요');
      return;
    }
    onPick('files', { files: [...draft.files, next] });
    toast.success('자료를 올렸어요 (데모)');
  }

  function removeFile(index: number) {
    const files = draft.files.filter((_, i) => i !== index);
    onPick('files', { files }, files.length > 0);
  }

  return (
    <section className="bg-card rounded-2xl border p-4 lg:p-5">
      <h2 className="text-pullim-slate-900 text-base font-bold tracking-tight">봇이 보고 답할 것</h2>
      <p className="text-pullim-slate-500 mt-0.5 text-xs">
        무엇을 읽고 답하는지, 어디까지 답해도 되는지를 한자리에서 정해요.
      </p>

      <div className="mt-4 space-y-4">
        {/* 수업 자료 */}
        <div>
          <FieldLabel field="files" draft={draft}>수업 자료</FieldLabel>
          <div className="bg-pullim-slate-50 border-pullim-slate-300 rounded-xl border-2 border-dashed p-6 text-center">
            <FileText className="text-pullim-slate-400 mx-auto h-7 w-7" aria-hidden />
            <p className="text-pullim-slate-700 mt-2 text-sm font-bold">여기로 끌어다 놓거나 골라서 올려요</p>
            <p className="text-pullim-slate-500 text-2xs">수업 자료(ppt·pdf) · 손으로 쓴 필기 사진 · 수업 녹화</p>
            <Button type="button" variant="secondary" size="sm" onClick={addFile} className="mt-3">
              <Upload aria-hidden />
              자료 골라 올리기
            </Button>
          </div>

          {draft.files.length > 0 && (
            <ul data-testid="file-list" className="mt-2.5 space-y-1.5">
              {draft.files.map((f, i) => (
                <li
                  key={f.name}
                  className="bg-card border-pullim-slate-200 flex items-center gap-2 rounded-lg border p-2"
                >
                  <FileText className="text-pullim-blue-600 h-4 w-4 shrink-0" aria-hidden />
                  <span className="text-pullim-slate-900 min-w-0 flex-1 truncate text-xs font-semibold">{f.name}</span>
                  <span className="text-pullim-slate-500 font-mono text-micro">{f.size}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`${f.name} 빼기`}
                    onClick={() => removeFile(i)}
                    className="text-pullim-slate-400 hover:text-pullim-danger"
                  >
                    <X aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <p className="text-pullim-slate-400 mt-1.5 text-micro leading-relaxed">
            {draft.files.length
              ? '올린 자료는 봇이 읽을 수 있게 정리하는 데 2~5분쯤 걸려요. 정리가 끝나면 답에 반영돼요.'
              : '아직 올린 자료가 없어요. 자료가 없으면 봇은 교과서 밖 일반 지식으로 답해요.'}
          </p>
        </div>

        <div className="border-pullim-slate-100 border-t" />

        {/* 답 범위 */}
        <div>
          <FieldLabel field="scope" draft={draft}>답 범위</FieldLabel>
          {/* L1→L5 는 세로로 읽어야 「어디까지 열지」가 눈금으로 보인다 */}
          <RadioCardGroup ariaLabel="답 범위" layout="list" className="flex flex-col">
            {scopeLevels.map((level) => (
              <RadioCard
                key={level}
                active={draft.scope === level}
                onSelect={() => onPick('scope', { scope: level })}
                title={
                  <span className="flex flex-wrap items-center gap-1.5">
                    {scopeMeta[level].label}
                    {level === 3 && (
                      <span className="bg-pullim-blue-50 text-pullim-blue-700 rounded-full px-1.5 py-0.5 text-micro font-bold">
                        보통 이걸로
                      </span>
                    )}
                  </span>
                }
                description={scopeMeta[level].allow}
                icon={
                  <span
                    aria-hidden
                    className={cn(
                      'flex h-6 w-8 items-center justify-center rounded font-mono text-micro font-bold',
                      draft.scope === level
                        ? 'bg-pullim-blue-600 text-white'
                        : 'bg-pullim-slate-100 text-pullim-slate-700',
                    )}
                  >
                    {scopeMeta[level].short}
                  </span>
                }
              />
            ))}
          </RadioCardGroup>
          <p className="text-pullim-slate-500 mt-2 flex items-start gap-1.5 text-micro leading-relaxed">
            <ShieldCheck className="text-pullim-slate-400 mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              밤·주말에 범위를 다르게 열고 싶으면{' '}
              <Link href="/teacher/settings?tab=safety" className="text-pullim-blue-600 font-bold hover:underline">
                봇 설정 › 안전 등급
              </Link>
              에서 시간대를 짜요.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── 마당 3 — 가르치는 법 ─── */

export function Yard3Teaching({ draft, onPick }: YardProps) {
  return (
    <section className="bg-card rounded-2xl border p-4 lg:p-5">
      <h2 className="text-pullim-slate-900 text-base font-bold tracking-tight">가르치는 법</h2>
      <p className="text-pullim-slate-500 mt-0.5 text-xs">
        평소에 어떻게 이끌지, 학생이 틀렸을 때 어떻게 할지 두 가지예요.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <FieldLabel field="style" draft={draft}>평소에</FieldLabel>
          <RadioCardGroup ariaLabel="평소에" cols={2}>
            {(Object.keys(styleMeta) as StyleId[]).map((s) => (
              <RadioCard
                key={s}
                active={draft.style === s}
                onSelect={() => onPick('style', { style: s })}
                title={styleMeta[s].label}
                description={styleMeta[s].description}
              />
            ))}
          </RadioCardGroup>
        </div>

        <div className="border-pullim-slate-100 border-t" />

        <div>
          <FieldLabel field="wrong" draft={draft}>학생이 틀렸을 때</FieldLabel>
          <RadioCardGroup ariaLabel="학생이 틀렸을 때" cols={3}>
            {(Object.keys(wrongMeta) as WrongId[]).map((w) => (
              <RadioCard
                key={w}
                active={draft.wrong === w}
                onSelect={() => onPick('wrong', { wrong: w })}
                title={wrongMeta[w].label}
                description={wrongMeta[w].description}
              />
            ))}
          </RadioCardGroup>
          <p className="text-pullim-slate-400 mt-1.5 text-micro leading-relaxed">
            배점과 채점 기준은 여기서 정하지 않아요.
          </p>
        </div>
      </div>
    </section>
  );
}
