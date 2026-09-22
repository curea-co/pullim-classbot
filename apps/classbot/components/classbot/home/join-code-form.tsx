'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';

import { joinFailureMessage, useJoinByCode } from '@/hooks/api/classroom';
// 표기 규칙의 주인(`lib/join-code.ts` 가 아니라 여기). `join-code.ts` 는 코드를 **발급**까지 소유해서
// `node:crypto` 와 Drizzle 스키마를 끌고 오는데, client 컴포넌트가 그걸 import 하면 DB 스키마가
// 브라우저 번들에 실린다. 이 파일은 의존성이 0 이라 그 유출이 없다.
import { normalizeJoinCode } from '@/lib/join-code-format';
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
 * 데모 코드로 반에 들어가던 prod 회귀 자동화는 **이미 옮겨졌다** — 대화 스펙 셋은
 * `playwright.config.ts` 의 `STUDENT_SPECS`(로그인 레인)에 있고, `tests/e2e/helpers.ts` 의
 * `joinDemoClass` 는 데모 코드를 넣던 두 줄을 걷었다(그 코드는 정본에서 404 다).
 *
 * **보내는 값은 정규화한다 — 그 책임이 여기 있다.** 교사 화면은 코드를 `WXP-M7U` 로 보여 주고
 * 「복사」도 붙임표째 담는다(`app/(teacher)/teacher/classroom/join-code-block.tsx`). 그런데 저장된 코드에는
 * 붙임표가 없고 **정본은 정규화를 하지 않는다** — 실측(2026-09-18 dev): `"WXP-M7U"` → 404 ·
 * `"WXPM7U"` → 201. 그래서 보이는 대로 옮겨 적은 학생만 튕겼다. 서버로 나가기 직전에
 * `normalizeJoinCode` 로 한 번 접어 그 어긋남을 닫는다.
 *
 * **입력칸은 건드리지 않는다.** 학생이 친 글자를 화면에서 뺏거나(커서가 튄다) 붙임표를 자동으로
 * 끼워 넣지 않는다 — 고치는 것은 *보내는 값* 하나다.
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
    // 붙임표·공백을 지운 값이 서버가 아는 형태다. 빈칸 판정도 그 값으로 한다 —
    // 붙임표만 친 입력(`-`)은 「코드가 있다」가 아니라 「보낼 코드가 없다」다.
    const normalized = normalizeJoinCode(code);
    if (!normalized) {
      toast.error('참여 코드를 입력해 주세요.');
      return;
    }

    try {
      const res = await join.mutateAsync({ code: normalized });
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
        {/* 예시는 교사 화면이 보여 주는 그대로(붙임표 포함) — 학생이 옮겨 적을 것이 그 형태다. */}
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && void handleJoin()}
          placeholder="참여 코드 입력 (예: AB3-K9M)"
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
