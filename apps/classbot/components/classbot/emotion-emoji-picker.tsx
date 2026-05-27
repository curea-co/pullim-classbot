'use client';

import { moodMeta, type EmotionMood } from '@/lib/mock';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

/**
 * 4이모지 + 강도 범위 슬라이더 (dual-thumb).
 * 강도는 하루 변동 폭을 나타냄 — 예: 2~4 = "약간 ~ 꽤".
 * spec 13 § 3.3.4 (2026-05-18 dual-thumb 전환).
 */
export function EmotionEmojiPicker({
  mood, intensityRange, onMoodChange, onIntensityRangeChange,
}: {
  mood: EmotionMood | null;
  intensityRange: [number, number];
  onMoodChange: (m: EmotionMood) => void;
  onIntensityRangeChange: (r: [number, number]) => void;
}) {
  const moods: EmotionMood[] = [1, 2, 3, 4];
  const [low, high] = intensityRange;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-pullim-slate-900 text-sm font-bold">오늘 어땠어요?</h3>
        <p className="text-pullim-slate-500 mt-0.5 text-[11px]">하나만 골라주세요.</p>

        <div role="radiogroup" aria-label="오늘 기분" className="mt-3 grid grid-cols-4 gap-2">
          {moods.map(m => {
            const meta = moodMeta[m];
            const active = mood === m;
            const toneClass =
              meta.tone === 'blue-500' ? 'border-pullim-blue-500 bg-pullim-blue-50'
              : meta.tone === 'blue-300' ? 'border-pullim-blue-300 bg-pullim-blue-50/50'
              : meta.tone === 'slate'    ? 'border-pullim-slate-400 bg-pullim-slate-100'
              : 'border-pullim-blue-700 bg-pullim-blue-100';
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onMoodChange(m)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 transition-all outline-none focus-visible:ring-3 focus-visible:ring-pullim-blue-400/50',
                  active
                    ? toneClass
                    : 'border-pullim-slate-200 bg-white hover:border-pullim-slate-400',
                )}
              >
                <span className="text-2xl leading-none">{meta.emoji}</span>
                <span className={cn(
                  'text-[10px] font-bold',
                  active ? 'text-pullim-slate-900' : 'text-pullim-slate-500',
                )}>
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {mood !== null && (
        <div data-testid="intensity-range-block">
          <div className="flex items-center justify-between">
            <h3 className="text-pullim-slate-900 text-xs font-bold">강도 범위 (선택)</h3>
            <span className="text-pullim-slate-500 font-mono text-[11px]" data-testid="intensity-range-readout">{low}~{high}/5</span>
          </div>
          <Slider
            min={1}
            max={5}
            step={1}
            value={intensityRange}
            onValueChange={(v) => {
              if (Array.isArray(v) && v.length === 2) {
                onIntensityRangeChange([v[0], v[1]]);
              }
            }}
            aria-label="감정 강도 범위"
            className="mt-2"
          />
          <div className="text-pullim-slate-400 mt-0.5 flex justify-between text-[11px]">
            <span>살짝</span>
            <span>많이</span>
          </div>
          <p className="text-pullim-slate-400 mt-1 text-[10px]">하루 동안 변동 폭을 적어주세요. 두 점을 따로 움직일 수 있어요.</p>
        </div>
      )}
    </div>
  );
}
