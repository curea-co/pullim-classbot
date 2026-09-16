'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';

import { joinFailureMessage, useJoinByCode } from '@/hooks/api/classroom';
import { cn } from '@/lib/utils';

/**
 * 참여 코드 입력 한 벌 — 홈 hero(남색 면)와 「내 수업방」 카드(흰 면)가 같이 쓴다.
 *
 * 참여는 pullim-api 정본 하나다(`POST /classbot/enrollments`, `useJoinByCode`). 선생님이 발급한 코드는
 * 그 서버의 `join_codes` 에만 있다.
 *
 * **실패는 실패로 보인다.** 종전에는 서버가 404·401 을 주면 예전 mock 표(`MATH-2024` 등)로 한 번 더
 * 풀어 성공처럼 보였다 — 2026-09-16 계획 §01 R2 가 「서버가 401·404 를 주면 목 참여로 조용히 갈아탄다.
 * 실패가 성공처럼 보인다」로 짚은 자리다. 그 폴백을 걷었고(결정 ②·§07), 서버가 가른 뜻은
 * `joinFailureMessage` 가 그대로 말한다 — 없는 코드 · 닫힌 코드 · 이미 들어와 있음.
 * 데모 코드로 반에 들어가던 prod 회귀 자동화(`tests/e2e/helpers.ts` `joinDemoClass`)는 로그인 레인으로
 * 옮겨 간다(계획 PR 4-ci).
 */
export type JoinCodeFormTone = 'dark' | 'light';

interface Props {
  /** 놓이는 면 — 남색 hero 위면 `dark`, 흰 카드 안이면 `light`. */
  tone?: JoinCodeFormTone;
  /** 참여에 성공했을 때(이미 참여한 반이어도) 부모가 할 일. */
  onJoined?: () => void;
}

const skin = {
  dark: {
    icon: 'text-pullim-slate-500',
    input:
      'border-pullim-slate-700 bg-pullim-slate-800 text-white placeholder:text-pullim-slate-500 focus:border-pullim-slate-500 focus:ring-pullim-slate-500/30',
    button:
      'bg-white text-pullim-slate-900 hover:bg-pullim-slate-100 focus-visible:ring-white/50',
  },
  light: {
    icon: 'text-pullim-slate-400',
    input:
      'border-pullim-slate-200 bg-white text-pullim-slate-900 placeholder:text-pullim-slate-400 focus:border-pullim-blue-400 focus:ring-pullim-blue-400/30',
    button:
      'bg-pullim-blue-600 text-white hover:bg-pullim-blue-700 focus-visible:ring-pullim-blue-400/50',
  },
} as const;

/** 성공 토스트 한 줄 — 반 이름을 못 읽었으면 이름 없이 말한다(참여는 이미 됐다). */
export function joinSuccessMessage(className: string | null, alreadyJoined: boolean): string {
  if (alreadyJoined) {
    return className ? `이미 들어와 있는 반이에요 — ${className}` : '이미 들어와 있는 반이에요.';
  }
  return className ? `${className}에 들어왔어요!` : '수업방에 들어왔어요!';
}

/**
 * 참여 코드를 받아 수업방에 들어간다.
 * @param tone - 놓이는 면(기본 light)
 * @param onJoined - 성공 후 콜백(목록 갱신 등)
 * @returns 입력칸 + 참여 버튼 한 줄
 */
export function JoinCodeForm({ tone = 'light', onJoined }: Props) {
  const [code, setCode] = useState('');
  const join = useJoinByCode();
  const s = skin[tone];

  const handleJoin = async () => {
    const raw = code.trim();
    if (!raw) {
      toast.error('참여 코드를 입력해 주세요.');
      return;
    }

    try {
      const res = await join.mutateAsync({ code: raw });
      toast.success(joinSuccessMessage(res.className, res.alreadyJoined));
      setCode('');
      onJoined?.();
    } catch (error) {
      toast.error(joinFailureMessage(error));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <KeyRound className={cn('absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', s.icon)} />
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && void handleJoin()}
          placeholder="참여 코드 입력 (예: AB3K9M)"
          aria-label="참여 코드 입력"
          maxLength={12}
          className={cn(
            'w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2',
            s.input,
          )}
        />
      </div>
      <button
        type="button"
        onClick={() => void handleJoin()}
        disabled={join.isPending}
        aria-busy={join.isPending}
        className={cn(
          'min-h-11 shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60',
          s.button,
        )}
      >
        참여
      </button>
    </div>
  );
}
