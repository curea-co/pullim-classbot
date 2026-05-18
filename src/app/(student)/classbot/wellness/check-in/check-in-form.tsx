'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Heart } from 'lucide-react';
import { EmotionEmojiPicker } from '@/components/classbot/emotion-emoji-picker';
import type { EmotionMood } from '@/lib/mock';

/**
 * 일일 감정 체크인.
 * spec 13 § 3.3.4, Flow R1.
 */
export function CheckInForm() {
  const router = useRouter();
  const [mood, setMood] = useState<EmotionMood | null>(null);
  const [intensityRange, setIntensityRange] = useState<[number, number]>([2, 4]);
  const [freeText, setFreeText] = useState('');
  const [done, setDone] = useState(false);

  function submit() {
    // P0: console.log mock — 실 저장은 v1 백엔드
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log('[CHECKIN MOCK]', { mood, intensityRange, freeText });
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="bg-pullim-blue-50 flex h-20 w-20 items-center justify-center rounded-full">
          <Check className="text-pullim-blue-600 h-10 w-10" />
        </div>
        <h1 className="text-pullim-slate-900 mt-4 text-xl font-bold">기록했어요</h1>
        <p className="text-pullim-slate-500 mt-1 text-sm">내일 또 봐요.</p>
        <div className="mt-6 flex gap-2">
          <Link
            href="/classbot/me/report"
            className="bg-pullim-slate-100 hover:bg-pullim-slate-200 text-pullim-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold"
          >
            내 리포트 보기
          </Link>
          <button
            type="button"
            onClick={() => router.push('/classbot')}
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 rounded-xl px-4 py-2.5 text-sm font-bold text-white"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/classbot/wellness"
        className="text-pullim-slate-500 hover:text-pullim-slate-700 inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" />
        웰빙 허브
      </Link>

      <header>
        <div className="text-pullim-blue-600 inline-flex items-center gap-1 text-xs font-bold tracking-wider uppercase">
          <Heart className="h-3 w-3" />
          30초 체크인
        </div>
        <h1 className="text-pullim-slate-900 mt-1 text-2xl font-bold tracking-tight">오늘 어땠어요?</h1>
        <p className="text-pullim-slate-500 mt-1 text-xs">짚고 가요. 부담 갖지 않아도 돼요.</p>
      </header>

      <section className="bg-card rounded-2xl border p-5">
        <EmotionEmojiPicker
          mood={mood}
          intensityRange={intensityRange}
          onMoodChange={setMood}
          onIntensityRangeChange={setIntensityRange}
        />
      </section>

      {mood !== null && (
        <section className="bg-card rounded-2xl border p-4">
          <h3 className="text-pullim-slate-900 text-xs font-bold">오늘 어떤 일이 있었어요? (선택)</h3>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value.slice(0, 200))}
            rows={3}
            placeholder="한 줄로 적어주세요. 비워두고 넘어가도 괜찮아요."
            className="border-pullim-slate-200 focus:border-pullim-blue-500 mt-2 w-full rounded-xl border p-3 text-sm leading-relaxed outline-none"
          />
          <div className="text-pullim-slate-400 mt-1 text-right text-[10px] font-mono">
            {freeText.length}/200
          </div>
        </section>
      )}

      <div className="sticky bottom-2 flex gap-2">
        <Link
          href="/classbot/wellness"
          className="bg-white border-pullim-slate-200 text-pullim-slate-600 hover:bg-pullim-slate-50 inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-xs font-bold"
        >
          나중에
        </Link>
        <button
          type="button"
          disabled={mood === null}
          onClick={submit}
          className="bg-pullim-blue-600 hover:bg-pullim-blue-700 disabled:opacity-40 ml-auto inline-flex flex-1 items-center justify-center gap-1 rounded-2xl py-3 text-sm font-bold text-white"
        >
          <Check className="h-3.5 w-3.5" />
          기록할게요
        </button>
      </div>
    </div>
  );
}
