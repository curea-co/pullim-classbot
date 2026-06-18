'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, FileText, Presentation, PenLine, Video, X, Mic, Music, Sparkles, Shield,
  Check, AlertTriangle, Copy, Send, GraduationCap, Hourglass, Rocket,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { scopeMeta } from '@/lib/mock';
import {
  type BuilderForm, toneMeta, teachingStyleMeta, voicePresetMeta, feedbackStyleMeta,
} from './builder-types';
import { RequiredMark } from '@/components/shell/required-mark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioCard, RadioCardGroup } from '@/components/classbot/radio-card';

type Props = {
  form: BuilderForm;
  setForm: (next: BuilderForm) => void;
};

/* ─── Step 1 ─── */
export function Step1Identity({ form, setForm }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="bld-name" className="text-pullim-slate-700 mb-1 block text-xs font-bold">
          봇 이름<RequiredMark />
        </Label>
        <Input
          id="bld-name"
          type="text"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="예: 수학이 형 · 영어 박쌤"
          className="h-10 text-sm"
        />
        <p className="text-pullim-slate-400 mt-1 text-[10px]">학생이 부를 이름. 친근할수록 학생 참여 ↑</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="bld-subject" className="text-pullim-slate-700 mb-1 block text-xs font-bold">과목</Label>
          <select
            id="bld-subject"
            value={form.subject}
            onChange={e => setForm({ ...form, subject: e.target.value })}
            className="border-pullim-slate-200 focus-visible:border-pullim-blue-500 focus-visible:ring-3 focus-visible:ring-pullim-blue-400/30 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          >
            {['수학Ⅰ', '수학Ⅱ', '미적분', '확률과 통계', '영어 독해', '영어 어법', '국어 비문학', '물리Ⅰ', '화학Ⅰ', '생명과학Ⅰ'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="bld-grade" className="text-pullim-slate-700 mb-1 block text-xs font-bold">대상 학년</Label>
          <select
            id="bld-grade"
            value={form.grade}
            onChange={e => setForm({ ...form, grade: e.target.value })}
            className="border-pullim-slate-200 focus-visible:border-pullim-blue-500 focus-visible:ring-3 focus-visible:ring-pullim-blue-400/30 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          >
            {['중1', '중2', '중3', '고1', '고2', '고3', '재수'].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label className="text-pullim-slate-700 mb-2 block text-xs font-bold">캐릭터 톤</Label>
        <RadioCardGroup ariaLabel="캐릭터 톤" cols={3}>
          {(['formal', 'friendly', 'spartan'] as const).map(t => {
            const meta = toneMeta[t];
            const Icon = meta.Icon;
            return (
              <RadioCard
                key={t}
                active={form.tone === t}
                onSelect={() => setForm({ ...form, tone: t })}
                title={meta.label}
                description={meta.description}
                icon={<Icon className="h-5 w-5 text-pullim-blue-600" />}
              />
            );
          })}
        </RadioCardGroup>
      </div>
    </div>
  );
}

/* ─── Step 2 ─── */
export function Step2Voice({ form, setForm }: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-pullim-blue-50 border-pullim-blue-100 rounded-lg border p-3 text-xs leading-relaxed">
        <strong className="text-pullim-blue-700 inline-flex items-center gap-1">
          <Mic className="h-3.5 w-3.5" aria-hidden />
          목소리 복제는 교사 동의 필수
        </strong>
        <p className="text-pullim-blue-700/80 mt-1">학생 음성은 저장하지 않아요. 교사 음성도 30일 자동 삭제 옵션.</p>
      </div>

      <div>
        <Label className="text-pullim-slate-700 mb-2 block text-xs font-bold">선택 방식</Label>
        <RadioCardGroup ariaLabel="음성 선택 방식" cols={2}>
          <RadioCard
            active={form.voiceMode === 'preset'}
            onSelect={() => setForm({ ...form, voiceMode: 'preset' })}
            title={<span className="inline-flex items-center gap-1.5"><Music className="h-3.5 w-3.5" aria-hidden />TTS 프리셋</span>}
            size="sm"
          />
          <RadioCard
            active={form.voiceMode === 'clone'}
            onSelect={() => setForm({ ...form, voiceMode: 'clone' })}
            title={<span className="inline-flex items-center gap-1.5"><Mic className="h-3.5 w-3.5" aria-hidden />내 음성 복제</span>}
            size="sm"
          />
        </RadioCardGroup>
      </div>

      {form.voiceMode === 'preset' ? (
        <div>
          <Label className="text-pullim-slate-700 mb-2 block text-xs font-bold">TTS 프리셋 (5종)</Label>
          <RadioCardGroup ariaLabel="TTS 프리셋" layout="list">
            {(['tts1','tts2','tts3','tts4','tts5'] as const).map(p => {
              const meta = voicePresetMeta[p];
              return (
                // sample trigger is an absolute sibling, NOT RadioCard's `trailing`
                // slot — that would nest a <button> inside RadioCard's role=radio
                // <button> (invalid HTML).
                <div key={p} className="relative">
                  <RadioCard
                    active={form.voicePreset === p}
                    onSelect={() => setForm({ ...form, voicePreset: p })}
                    title={meta.label}
                    description={meta.description}
                    className="pr-20"
                    icon={
                      <span className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full',
                        form.voicePreset === p ? 'bg-pullim-blue-600 text-white' : 'bg-pullim-slate-100',
                      )}>
                        <Mic className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={e => { e.stopPropagation(); toast.info('샘플 재생 (데모)'); }}
                    aria-label={`${meta.label} 샘플 재생`}
                    className="text-pullim-blue-600 hover:bg-pullim-blue-50 absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold"
                  >
                    ▶ 샘플
                  </Button>
                </div>
              );
            })}
          </RadioCardGroup>
        </div>
      ) : (
        <div className="bg-pullim-slate-50 rounded-lg p-4 text-center">
          <Mic className="text-pullim-slate-400 mx-auto h-10 w-10" />
          <p className="text-pullim-slate-700 mt-2 text-sm font-bold">음성 샘플 업로드</p>
          <p className="text-pullim-slate-500 text-[11px]">2~5분 분량 권장 · WAV/MP3 · 최대 100MB</p>
          <Button
            type="button"
            variant="pullim"
            size="sm"
            className="mt-3"
          >
            <Upload />
            파일 선택
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Step 3 ─── */
const fileIcon = {
  pdf:   FileText,
  ppt:   Presentation,
  note:  PenLine,
  video: Video,
} as const;

export function Step3Materials({ form, setForm }: Props) {
  const total = form.files.length;
  const totalSize = form.files.reduce((s, f) => s + parseFloat(f.size), 0);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div className="bg-pullim-slate-50 border-pullim-slate-300 rounded-xl border-2 border-dashed p-6 text-center">
        <Upload className="text-pullim-slate-400 mx-auto h-10 w-10" />
        <p className="text-pullim-slate-700 mt-2 text-sm font-bold">
          파일을 끌어다 놓거나 클릭해서 업로드
        </p>
        <p className="text-pullim-slate-500 text-[11px]">
          PPT · PDF · 손글씨 노트 · 수업 녹화 (.mp4)
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setForm({
              ...form,
              files: [...form.files, { name: '연습문제_세트1.pdf', size: '1.8MB', type: 'pdf' }],
            });
            toast.success('파일 추가됨');
          }}
          className="bg-pullim-slate-900 hover:bg-pullim-slate-800 mt-3 text-white"
        >
          <Upload />
          샘플 파일 추가 (데모)
        </Button>
      </div>

      <div>
        <div className="text-pullim-slate-700 mb-2 flex items-center justify-between text-xs font-bold">
          <span>업로드된 자료 ({total}개)</span>
          <span className="text-pullim-slate-500 font-mono">{totalSize.toFixed(1)}MB</span>
        </div>
        <ul className="space-y-1.5">
          {form.files.map((f, i) => {
            const Icon = fileIcon[f.type];
            return (
              <li key={i} className="bg-card border-pullim-slate-200 flex items-center gap-2 rounded-lg border p-2">
                <Icon className="text-pullim-blue-600 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-pullim-slate-900 truncate text-xs font-semibold">{f.name}</div>
                  <div className="text-pullim-slate-500 font-mono text-[10px]">{f.size}</div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`${f.name} 삭제`}
                  onClick={() => setForm({ ...form, files: form.files.filter((_, j) => j !== i) })}
                  className="text-pullim-slate-400 hover:text-pullim-danger"
                >
                  <X />
                </Button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="bg-pullim-blue-50 text-pullim-blue-700 flex items-start gap-1.5 rounded-lg p-2.5 text-[11px]">
        <Hourglass className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>업로드 후 RAG 인덱스 생성에 약 2~5분 소요. 인덱스 완료 후 봇 응답에 자료가 반영됩니다.</span>
      </div>
    </div>
  );
}

/* ─── Step 4 ─── */
export function Step4Style({ form, setForm }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-pullim-slate-600 text-xs">
        봇의 기본 응답 전략. 단원·시간대별로 시스템이 자동 전환할 수도 있어요.
      </p>
      <RadioCardGroup ariaLabel="교수 스타일" cols={2}>
        {(['lecture', 'discussion', 'problem', 'mixed'] as const).map(s => {
          const meta = teachingStyleMeta[s];
          const Icon = meta.Icon;
          return (
            <RadioCard
              key={s}
              active={form.teachingStyle === s}
              onSelect={() => setForm({ ...form, teachingStyle: s })}
              title={meta.label}
              description={meta.description}
              icon={<Icon className="h-5 w-5 text-pullim-blue-600" />}
            />
          );
        })}
      </RadioCardGroup>
    </div>
  );
}

/* ─── Step 5 ─── */
export function Step5Scope({ form, setForm }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-pullim-slate-700 mb-2 block text-xs font-bold">기본 Scope 단계</Label>
        <RadioCardGroup ariaLabel="기본 Scope 단계" layout="list">
          {([1,2,3,4,5] as const).map(l => {
            const meta = scopeMeta[l];
            return (
              <RadioCard
                key={l}
                active={form.scopeDefault === l}
                onSelect={() => setForm({ ...form, scopeDefault: l })}
                title={meta.label}
                description={meta.allow}
                icon={
                  <span className={cn(
                    'flex h-7 w-9 items-center justify-center rounded font-mono text-[11px] font-bold',
                    form.scopeDefault === l ? 'bg-pullim-blue-600 text-white' : 'bg-pullim-slate-100 text-pullim-slate-700',
                  )}>
                    {meta.short}
                  </span>
                }
                trailing={l === 3 ? <Shield className="text-pullim-blue-500 h-4 w-4" /> : undefined}
              />
            );
          })}
        </RadioCardGroup>
        <p className="text-pullim-slate-400 mt-2 text-[10px]">L3 (교과 범위) 가 일반 수업의 추천 기본값</p>
      </div>

      <label className="bg-pullim-slate-50 flex items-center gap-2.5 rounded-lg p-3 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={form.scopeAutoSwitch}
          onChange={e => setForm({ ...form, scopeAutoSwitch: e.target.checked })}
          className="h-4 w-4 accent-pullim-blue-600"
        />
        <div className="flex-1">
          <div className="text-pullim-slate-900 font-bold">시간대별 자동 스위치</div>
          <div className="text-pullim-slate-500 text-[11px]">
            18:00~19:00 자동 L4 · 19:00~22:00 L3 · 22:00 이후 L5 (자기주도)
          </div>
        </div>
      </label>
    </div>
  );
}

/* ─── Step 6 ─── */
const rubricLabels = {
  participation: '참여도',
  thinking: '사고 깊이',
  mission: '과제 달성도',
  selfDir: '자기주도성',
  team: '팀원 기여도',
} as const;

export function Step6Eval({ form, setForm }: Props) {
  const total = Object.values(form.rubric).reduce((s, v) => s + v, 0);
  const isValid = total === 100;

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-pullim-slate-700 mb-2 block text-xs font-bold">
          채점 루브릭 (5영역 가중치, 합계 100%)
        </Label>
        <ul className="space-y-2.5">
          {(Object.keys(form.rubric) as (keyof typeof form.rubric)[]).map(k => (
            <li key={k}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-pullim-slate-700 font-semibold">{rubricLabels[k]}</span>
                <span className="text-pullim-blue-600 font-mono font-bold">{form.rubric[k]}%</span>
              </div>
              <input
                type="range"
                min={0} max={50} step={5}
                value={form.rubric[k]}
                onChange={e => setForm({ ...form, rubric: { ...form.rubric, [k]: Number(e.target.value) } })}
                className="w-full accent-pullim-blue-500"
              />
            </li>
          ))}
        </ul>
        <div
          className={cn(
            'mt-3 inline-flex items-center gap-1.5 rounded-lg p-2 text-xs',
            isValid ? 'bg-pullim-blue-50 text-pullim-blue-700' : 'bg-pullim-slate-100 text-pullim-slate-700',
          )}
        >
          {isValid ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden />
              합계 100%
            </>
          ) : (
            <>
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              합계 {total}% — 100%로 맞춰주세요
            </>
          )}
        </div>
      </div>

      <div>
        <Label className="text-pullim-slate-700 mb-2 block text-xs font-bold">오답 피드백 스타일</Label>
        <RadioCardGroup ariaLabel="오답 피드백 스타일" cols={3}>
          {(['guide','direct','hybrid'] as const).map(s => {
            const meta = feedbackStyleMeta[s];
            return (
              <RadioCard
                key={s}
                active={form.feedbackStyle === s}
                onSelect={() => setForm({ ...form, feedbackStyle: s })}
                title={meta.label}
                description={meta.description}
              />
            );
          })}
        </RadioCardGroup>
      </div>
    </div>
  );
}

/* ─── Step 7 ─── */
export function Step7Safety({ form, setForm }: Props) {
  return (
    <div className="space-y-3">
      <div className="bg-pullim-danger-bg text-pullim-danger rounded-lg p-3 text-xs leading-relaxed">
        <strong className="flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          미성년자 보호 의무
        </strong>
        <p className="mt-1 text-pullim-slate-700">
          만 14세 미만은 법정대리인 동의 필수. 봇은 저작권/명예/개인정보 보호 가이드라인 준수.
        </p>
      </div>

      <SafetyToggle
        checked={form.filterPii}
        onChange={v => setForm({ ...form, filterPii: v })}
        label="개인정보 필터"
        description="이름·전화번호·주소·주민번호 패턴 자동 차단 + 마스킹"
      />
      <SafetyToggle
        checked={form.filterHarmful}
        onChange={v => setForm({ ...form, filterHarmful: v })}
        label="유해 키워드 차단"
        description="자해·우울·폭력·외설 키워드 검출 시 즉시 차단 + 교사 알림"
      />
      <SafetyToggle
        checked={form.weeIntegration}
        onChange={v => setForm({ ...form, weeIntegration: v })}
        label="Wee센터 자동 연계"
        description='"자살" 등 위기 키워드 감지 시 교사·보호자·Wee센터 3자 알림 (v2)'
      />
    </div>
  );
}

function SafetyToggle({
  checked, onChange, label, description,
}: {
  checked: boolean; onChange: (v: boolean) => void;
  label: string; description: string;
}) {
  return (
    <label className="bg-card border-pullim-slate-200 flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-pullim-blue-600"
      />
      <div>
        <div className="text-pullim-slate-900 text-sm font-bold">{label}</div>
        <div className="text-pullim-slate-500 mt-0.5 text-[11px]">{description}</div>
      </div>
      {checked && <Check className="text-pullim-blue-600 ml-auto h-4 w-4 shrink-0" />}
    </label>
  );
}

/* ─── Step 8 ─── */
export function Step8Deploy({ form, setForm }: Props) {
  const router = useRouter();
  const [testInput, setTestInput] = useState('');
  const [testReply, setTestReply] = useState<string | null>(null);

  function sendTest() {
    if (!testInput.trim()) return;
    // 데모 — 톤·스타일 반영한 모의 응답
    const intro = form.tone === 'formal' ? '안녕하세요, 학생.'
      : form.tone === 'friendly' ? '안녕!'
      : '집중해.';
    setTestReply(`${intro} ${form.name || '봇'}이에요. ${testInput.includes('극값') ? '극값을 묻는 질문이군요. 도함수 부호 변화부터 확인해볼까요?' : '해당 질문에 대한 응답을 시뮬레이션합니다.'}`);
  }

  function deploy() {
    if (form.classrooms.length === 0) {
      toast.error('배포할 반을 1개 이상 선택해주세요');
      return;
    }
    toast.success('🚀 배포 완료 (데모)', {
      description: `${form.name || '새 봇'} → ${form.classrooms.join(', ')} (${form.classrooms.length}개 반). 운영 화면으로 이동.`,
      duration: 4000,
    });
    // 운영 화면 진입 — 마치 방금 배포된 봇이 활성화된 상태처럼 보이도록
    router.push('/teacher/classbot?deployed=' + encodeURIComponent(form.name || '새 봇'));
  }

  return (
    <div className="space-y-4">
      <section>
        <h3 className="text-pullim-slate-900 mb-2 text-sm font-bold">미리보기 — 테스트 채팅</h3>
        <div className="bg-pullim-slate-50 rounded-lg p-3 space-y-2">
          {testReply ? (
            <div className="bg-pullim-blue-50 text-pullim-slate-800 rounded-lg p-2.5 text-xs leading-relaxed">
              <strong className="text-pullim-blue-700 mb-1 block text-[10px] font-bold tracking-wider uppercase">
                {form.name || '새 봇'} ({toneMeta[form.tone].label})
              </strong>
              {testReply}
            </div>
          ) : (
            <p className="text-pullim-slate-400 py-4 text-center text-[11px] italic">
              아래에 질문을 입력해 봇 응답을 미리 확인해보세요
            </p>
          )}
          <form
            onSubmit={e => { e.preventDefault(); sendTest(); }}
            className="flex items-center gap-2"
          >
            <Label htmlFor="bld-test-input" className="sr-only">테스트 질문</Label>
            <Input
              id="bld-test-input"
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              placeholder='예: "극값 어떻게 찾아요?"'
              className="h-10 flex-1 rounded-full px-3.5 text-sm"
            />
            <Button
              type="submit"
              variant="pullim"
              size="icon-lg"
              aria-label="테스트 질문 보내기"
              className="rounded-full"
            >
              <Send aria-hidden />
            </Button>
          </form>
        </div>
      </section>

      <section>
        <h3 className="text-pullim-slate-900 mb-2 text-sm font-bold">
          배포할 반 선택<RequiredMark />
          <span className="text-pullim-slate-400 ml-1 text-[10px] font-normal">(1개 이상)</span>
        </h3>
        <ul className="space-y-1.5">
          {['고2-A반', '고2-B반', '고1-종합반', '재수반'].map(c => {
            const checked = form.classrooms.includes(c);
            return (
              <li key={c}>
                <label className="bg-card border-pullim-slate-200 flex items-center gap-2.5 rounded-lg border p-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setForm({
                      ...form,
                      classrooms: checked
                        ? form.classrooms.filter(x => x !== c)
                        : [...form.classrooms, c],
                    })}
                    className="h-4 w-4 accent-pullim-blue-600"
                  />
                  <GraduationCap className="text-pullim-slate-500 h-4 w-4" />
                  <span className="text-pullim-slate-900 text-sm font-semibold">{c}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="bg-pullim-slate-900 rounded-xl p-4 text-white">
        <div className="text-pullim-blue-300 flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
          <Sparkles className="h-3 w-3" />
          최종 확인
        </div>
        <ul className="text-pullim-slate-300 mt-2 space-y-0.5 text-[11px]">
          <li>· 이름: <strong className="text-white">{form.name || '미입력'}</strong></li>
          <li>· {form.subject} · {form.grade} · {toneMeta[form.tone].label} 톤</li>
          <li>· 교안 {form.files.length}개 · {teachingStyleMeta[form.teachingStyle].label}</li>
          <li>· Scope L{form.scopeDefault}{form.scopeAutoSwitch && ' (자동 스위치)'}</li>
          <li>· {form.classrooms.length}개 반 배포 예정</li>
        </ul>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => toast.info('드래프트 저장 (데모)')}
          className="mt-3 bg-white/10 text-white hover:bg-white/20 w-full"
        >
          <Copy />
          드래프트 저장
        </Button>
      </section>

      {/* 배포하기 — Step 8 하단 명확한 primary CTA */}
      <Button
        type="button"
        variant="pullim-lemon"
        size="lg"
        onClick={deploy}
        className="w-full"
      >
        <Rocket aria-hidden />
        배포하기
      </Button>
    </div>
  );
}
