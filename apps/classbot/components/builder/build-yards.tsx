'use client';

import Link from 'next/link';
import { FileText, ShieldCheck, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioCard, RadioCardGroup } from '@/components/classbot/radio-card';
import { cn } from '@/lib/utils';
import { FieldError, FieldLabel } from './field-mark';
import { PickChip } from './pick-chip';
import {
  BOT_NAME_MAX, faultAnchorId,
  grades, sampleFiles, scopeLevels, scopeMeta,
  styleMeta, subjectIds, subjectMeta, toneMeta, wrongMeta,
  type BotDraft, type Fault, type FieldKey,
  type StyleId, type SubjectId, type ToneId, type WrongId,
} from './builder-types';

/**
 * 마당 셋 — 봇 소개 · 보고 답할 것 · 가르치는 법.
 *
 * ## 마당 카드 안의 간격
 *
 * ```
 *   카드 패딩            20 → 24px  p-5 lg:p-6
 *   카드 제목 ↔ 본문      16px      mt-4
 *   항목 ↔ 항목          20px      space-y-5   ← 과목 · 학년 · 봇 이름 · 말투 사이
 *   항목 이름 ↔ 고르는 것  8px      mb-2        (FieldLabel)
 * ```
 *
 * `space-y-5`(20px)인 까닭 — 항목 사이를 가르는 것은 **여백뿐이다.** 이름·칩·카드가 모두
 * 왼끝에 맞아 있어 선도 배경도 경계를 만들어 주지 않는다. 종전 16px 은 이름 ↔ 고르는 것
 * 8px 의 딱 두 배라, 한 항목 안인지 다음 항목인지가 눈으로 갈리지 않고 한 덩어리로 뭉쳤다.
 * 20px 이 그 8px 과 카드 패딩 **사이**에 들어가야 「바깥이 안쪽보다 넓다」가 선다.
 * 종전 패딩 `p-4 lg:p-5`(16→20px)에는 그 사이가 없었다 — 좁은 폭에서는 항목 사이(20px)가
 * 테두리까지 거리(16px)보다 넓어 항목이 카드 밖으로 새어 나가 보이고, lg 에서도 20 = 20 동률이다.
 * 그래서 패딩을 `p-5 lg:p-6`(20→24px)로 한 칸 올렸다.
 *
 * **lg 미만은 여전히 패딩 20 = 항목 사이 20 동률이다.** 폭이 좁아 패딩을 더 키우면 본문을 먹는다.
 * 카드 **안**에서의 동률은 받아들인다 — 「바깥이 안쪽보다 넓다」가 막으려던 것은 카드끼리
 * 붙어 보이던 섹션 층의 결함이고, 한 카드 안에서 테두리까지 거리와 항목 사이가 같은 것은
 * 고른 리듬으로 읽히지 경계를 지우지 않는다.
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
  /** 값이 바뀌는 단 하나의 길. `field` 는 그 항목의 오류 표시를 지우는 데 쓴다. */
  onPick: (field: FieldKey, patch: Partial<BotDraft>) => void;
};

/* ─── 마당 1 — 봇 소개 ─── */

export function Yard1Intro({
  draft, onPick, fault,
}: YardProps & {
  /** 지금 앞을 막고 있는 항목 — 「다음」과 「이대로 만들기」가 같은 판정으로 넣는다 */
  fault: Fault | null;
}) {
  /** 이름 입력칸은 라벨이 가리키는 자리이자 막혔을 때 초점이 오는 자리라, id 를 한 번만 짓는다. */
  const nameId = faultAnchorId('name');

  /** 이미 고른 과목을 다시 누르는 것은 바꾸는 게 아니다 — 올린 자료를 지우지 않는다. */
  function selectSubject(id: SubjectId) {
    if (draft.subject === id) return;
    onPick('subject', pickSubject(draft, id));
  }

  return (
    <section className="bg-card rounded-2xl border p-5 lg:p-6">
      <h2 className="text-pullim-slate-900 text-base font-bold tracking-tight">봇 소개</h2>

      <div className="mt-4 space-y-5">
        {/* 과목 — 기본값이 없는 유일한 항목 */}
        <div>
          <FieldLabel field="subject">과목</FieldLabel>
          {/*
            막혔을 때 초점이 오는 자리. 고를 것이 라디오 묶음이라 붙일 입력칸이 없어
            묶음 자체를 초점 대상으로 삼는다 — 초점이 오면 낭독기가 묶음 이름(「과목」)을 읽는다.
          */}
          {/*
            **다섯 칸 한 줄**(`cols={5}`)이다. 세 칸이던 종전에는 카드 하나가 226px 로 벌어져
            두 글자짜리 낱말(「과학」 28px) 하나를 담았다 — 남는 자리가 카드마다 170px 이라
            고르는 버튼이 아니라 덜 채운 입력칸으로 보였다. 게다가 다섯을 3+2 로 접어
            둘째 줄 오른쪽이 빈 칸으로 남았다. 한 줄에 다섯이면 그 두 가지가 함께 사라진다.
            좁힌 것은 **패딩이 아니라 폭**이다 — `p-3`(12px)은 이미 좁고, 남아 보이던 여백은
            전부 가로 여유분이었다.

            폭을 좁히고도 **131 : 52** 는 여전히 가로로 누워, 두 글자를 뺀 101px 이 남았다.
            그래서 남는 자리를 **채운다** — 카드를 72px 로 세우고(`min-h-18`), 이름을 바닥
            왼끝에 앉히고(세로 flex + `justify-end`), 가장 크게 비던 오른쪽 위를 과목 무늬로
            메운다. 무늬는 모서리 밖으로 8px 걸쳐 `overflow-hidden` 이 `rounded-xl` 을 따라 자른다.

            종전의 `align="center"` 는 **남는 자리를 양쪽으로 가르는 회피책**이었다. 그 자리가
            그림으로 차면 회피할 것이 없어지고, 왼끝 정렬이라야 바로 아래 학년 칩·봇 이름 칸과
            왼끝이 맞는다. 그래서 `align` 은 기본값(`start`)으로 두고 넘기지 않는다.

            무늬는 **알아보라고 두는 그림이 아니다** — 8px 잘린 데다 색이 `slate-200`(고르면
            `blue-200`)이라 이름과 겨루지 않는다. 그래서 낭독기에서는 통째로 뺀다(`aria-hidden`) —
            카드가 부르는 이름은 여전히 과목 이름 하나다.

            봇 시그니처 5색은 **여기서 쓰지 않는다** — 색 점은 다섯 과목을 가르지 못한다.
            `botSignature` 를 지우지는 않았다(학생 홈 봇 목록·챗이 그대로 쓴다). 여기서만 뺀다.
            「과학봇」 밑줄도 그대로 없다 — 바로 아래 「봇 이름」 칸 placeholder 가 같은 말을 한다.

            **이름이 세 글자인 과목이 생기면 무늬와 이름이 부딪친다.** 가장 좁은 768 의 78px
            카드에서 이름 오른끝 39.6px · 무늬 왼끝 44px 로 가로 여유가 4.4px 뿐이다.
            과목을 늘릴 때 이 값을 다시 재라.
          */}
          <RadioCardGroup ariaLabel="과목" cols={5} id={faultAnchorId('subject')} focusable>
            {subjectIds.map((id) => {
              const { label, icon: Mark } = subjectMeta[id];
              const on = draft.subject === id;
              return (
                <RadioCard
                  key={id}
                  active={on}
                  onSelect={() => selectSubject(id)}
                  className="relative flex min-h-18 flex-col justify-end overflow-hidden"
                  title={
                    <>
                      <Mark
                        aria-hidden
                        className={cn(
                          'pointer-events-none absolute -top-2 -right-2 h-10 w-10',
                          on ? 'text-pullim-blue-200' : 'text-pullim-slate-200',
                        )}
                      />
                      {label}
                    </>
                  }
                />
              );
            })}
          </RadioCardGroup>
          <FieldError fault={fault} field="subject" />
        </div>

        {/* 학년 */}
        <div>
          <FieldLabel field="grade">학년</FieldLabel>
          {/*
            gap 이 `gap-1`(4px)인 까닭 — 390px 기기에서 여섯 칩(합 278px)이 한 줄에 들어가야 한다.
            가용폭 300px 에 `gap-1.5`(6px×5=30)면 308px 로 넘쳐 「고1」이 혼자 둘째 줄로 떨어졌다.
            4px×5=20 이면 298px 로 들어간다. 여유가 2px 뿐이니 칩을 늘리거나 라벨을 길게 하면
            다시 접힌다 — 그때는 접히는 편이 맞다(억지로 한 줄에 밀어 넣지 마라).
          */}
          <div role="radiogroup" aria-label="학년" className="flex flex-wrap gap-1">
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
        </div>

        {/* 봇 이름 */}
        <div>
          <FieldLabel field="name" htmlFor={nameId}>봇 이름</FieldLabel>
          <Input
            id={nameId}
            type="text"
            value={draft.name}
            onChange={(e) => onPick('name', { name: e.target.value })}
            maxLength={BOT_NAME_MAX}
            placeholder={draft.subject ? subjectMeta[draft.subject].botName : '과목을 고르면 이름이 정해져요'}
            aria-invalid={fault?.field === 'name' || undefined}
            className="h-10 text-sm"
          />
          <FieldError fault={fault} field="name" />
        </div>

        {/* 말투 */}
        <div>
          <FieldLabel field="tone">말투</FieldLabel>
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
  );
}

/**
 * 과목을 바꾸면 올려 둔 자료도 그 과목 것으로 따라간다 (데모).
 * 자료를 그대로 두면 국어봇이 기후도 필기를 읽고 있는 화면이 된다.
 */
/**
 * 과목을 **바꾸면** 올린 자료를 비운다 — 지난 과목의 수업 자료는 새 과목에서 뜻이 없다.
 * 그대로 두면 국어봇이 기후도 필기를 읽고 있는 화면이 된다.
 *
 * 이미 고른 과목을 다시 누르는 것은 **바꾸는 게 아니다.** 그때도 비우면 교사가 올린 자료가
 * 까닭 없이 사라진다 — 그래서 값이 같으면 아무 일도 하지 않는다(`selectSubject` 의 이른 return).
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
    onPick('files', { files: draft.files.filter((_, i) => i !== index) });
  }

  return (
    <section className="bg-card rounded-2xl border p-5 lg:p-6">
      <h2 className="text-pullim-slate-900 text-base font-bold tracking-tight">봇이 보고 답할 것</h2>

      <div className="mt-4 space-y-5">
        {/* 수업 자료 */}
        <div>
          <FieldLabel field="files">수업 자료</FieldLabel>
          <div className="bg-pullim-slate-50 border-pullim-slate-300 rounded-xl border-2 border-dashed p-6 text-center">
            <FileText className="text-pullim-slate-400 mx-auto h-7 w-7" aria-hidden />
            <p className="text-pullim-slate-700 mt-2 text-sm font-bold">여기로 끌어다 놓거나 골라서 올려요</p>
            <p className="text-pullim-slate-500 text-2xs">수업 자료(ppt·pdf) · 손으로 쓴 필기 사진 · 수업 녹화</p>
            <Button type="button" variant="secondary" size="sm" onClick={addFile} aria-label="수업 자료 골라 올리기" className="mt-3">
              <Upload aria-hidden />
              올리기
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

          <p className="text-pullim-slate-400 mt-1.5 text-2xs leading-relaxed">
            {draft.files.length
              ? '올린 자료는 봇이 읽을 수 있게 정리하는 데 2~5분쯤 걸려요. 정리가 끝나면 답에 반영돼요.'
              : '아직 올린 자료가 없어요. 자료가 없으면 봇은 교과서 밖 일반 지식으로 답해요.'}
          </p>
        </div>

        <div className="border-pullim-slate-100 border-t" />

        {/* 답 범위 */}
        <div>
          <FieldLabel field="scope">답 범위</FieldLabel>
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
                      <span className="bg-pullim-blue-50 text-pullim-blue-700 rounded-full px-1.5 py-0.5 text-2xs font-bold">
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
          <p className="text-pullim-slate-500 mt-2 flex items-start gap-1.5 text-2xs leading-relaxed">
            <ShieldCheck className="text-pullim-slate-400 mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              밤·주말에 범위를 다르게 열고 싶으면{' '}
              {/* 아직 만들기 전이라 이 봇의 id 가 없다 — 봇 관리 목록으로 보내고 탭만 실어 나른다 */}
              <Link href="/teacher/bots?tab=safety" className="text-pullim-blue-600 font-bold hover:underline">
                봇 관리 › 안전 등급
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
    <section className="bg-card rounded-2xl border p-5 lg:p-6">
      <h2 className="text-pullim-slate-900 text-base font-bold tracking-tight">가르치는 법</h2>

      <div className="mt-4 space-y-5">
        <div>
          <FieldLabel field="style">평소에</FieldLabel>
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
          <FieldLabel field="wrong">학생이 틀렸을 때</FieldLabel>
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
          <p className="text-pullim-slate-400 mt-1.5 text-2xs leading-relaxed">
            배점과 채점 기준은 여기서 정하지 않아요.
          </p>
        </div>
      </div>
    </section>
  );
}
