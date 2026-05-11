'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Heart } from 'lucide-react';
import { EmotionEmojiPicker } from '@/components/classbot/emotion-emoji-picker';
import { CrisisModal } from '@/components/classbot/crisis-modal';
import type { EmotionMood } from '@/lib/mock';
import { scanText, shouldTrigger, fireThreePartyAlert, type KeywordHit } from '@/lib/safety/keyword-gate';

/**
 * 일일 감정 체크인.
 * spec 13 § 3.3.4, Flow R1, Flow R4 (키워드 게이트).
 */
export function CheckInForm() {
  const router = useRouter();
  const [mood, setMood] = useState<EmotionMood | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [freeText, setFreeText] = useState('');
  const [done, setDone] = useState(false);
  const [crisis, setCrisis] = useState<KeywordHit | null>(null);

  function submit() {
    // 키워드 게이트 (Flow R4) — 자유 텍스트 검사
    const hit = scanText(freeText);
    if (shouldTrigger(hit) && hit) {
      // 백그라운드: 3자 알림 (mock)
      fireThreePartyAlert(hit, { source: 'wellness-checkin' });
      setCrisis(hit);
      return;
    }

    // P0: console.log mock — 실 저장은 v1 백엔드
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log('[CHECKIN MOCK]', { mood, intensity, freeText });
    }
    setDone(true);
  }

  function closeCrisisAndContinue() {
    // 모달 닫은 후에도 체크인은 기록 (학생을 부드럽게 다음 단계로 — "봇과 이야기")
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log('[CHECKIN MOCK]', { mood, intensity, freeText, crisisFlag: crisis?.category });
    }
    setCrisis(null);
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="bg-pullim-success/15 flex h-20 w-20 items-center justify-center rounded-full">
          <Check className="text-pullim-success h-10 w-10" />
        </div>
        <h1 className="text-pullim-slate-900 mt-4 text-xl font-bold">기록했어</h1>
        <p className="text-pullim-slate-500 mt-1 text-sm">내일 또 봐.</p>
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
      {crisis && <CrisisModal hit={crisis} onClose={closeCrisisAndContinue} />}

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
        <h1 className="text-pullim-slate-900 mt-1 text-2xl font-bold tracking-tight">오늘 어땠어?</h1>
        <p className="text-pullim-slate-500 mt-1 text-xs">짚고 가자. 부담 갖지 마.</p>
      </header>

      <section className="bg-card rounded-2xl border p-5">
        <EmotionEmojiPicker
          mood={mood}
          intensity={intensity}
          onMoodChange={setMood}
          onIntensityChange={setIntensity}
        />
      </section>

      {mood !== null && (
        <section className="bg-card rounded-2xl border p-4">
          <h3 className="text-pullim-slate-900 text-xs font-bold">오늘 어떤 일이 있었어? (선택)</h3>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value.slice(0, 200))}
            rows={3}
            placeholder="한 줄로 적어줘. 비워두고 넘어가도 괜찮아."
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
          기록할게
        </button>
      </div>
    </div>
  );
}
