'use client';

import { moodMeta, type EmotionMood } from '@/lib/mock';
import { cn } from '@/lib/utils';

/**
 * 4이모지 + 강도 슬라이더.
 * spec 13 § 3.3.4.
 */
export function EmotionEmojiPicker({
  mood, intensity, onMoodChange, onIntensityChange,
}: {
  mood: EmotionMood | null;
  intensity: number;
  onMoodChange: (m: EmotionMood) => void;
  onIntensityChange: (n: number) => void;
}) {
  const moods: EmotionMood[] = [1, 2, 3, 4];

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
              meta.tone === 'success' ? 'border-pullim-success bg-pullim-success/10'
              : meta.tone === 'blue'   ? 'border-pullim-blue-500 bg-pullim-blue-50'
              : meta.tone === 'slate'  ? 'border-pullim-slate-400 bg-pullim-slate-100'
              : 'border-pullim-warn bg-pullim-warn-bg';
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
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-pullim-slate-900 text-xs font-bold">강도 (선택)</h3>
            <span className="text-pullim-slate-500 font-mono text-[11px]">{intensity}/5</span>
          </div>
          <input
            type="range"
            min={1} max={5} step={1} value={intensity}
            onChange={(e) => onIntensityChange(Number(e.target.value))}
            className="accent-pullim-blue-500 mt-2 w-full"
            aria-label="감정 강도"
          />
          <div className="text-pullim-slate-400 mt-0.5 flex justify-between text-[9px]">
            <span>살짝</span>
            <span>많이</span>
          </div>
        </div>
      )}
    </div>
  );
}
