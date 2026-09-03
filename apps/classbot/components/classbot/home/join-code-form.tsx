'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';

import { useJoinByCode } from '@/hooks/api/classroom';
import { ApiClientError } from '@/lib/api/client-fetch';
import { joinClass } from '@/lib/store/class-enrollment';
import { cn } from '@/lib/utils';

/**
 * 참여 코드 입력 한 벌 — 홈 hero(남색 면)와 「내 수업방」 카드(흰 면)가 같이 쓴다.
 *
 * 참여는 **실 API**(`POST /api/enrollments`, `useJoinByCode`)가 먼저다. 선생님이 발급한
 * 코드는 DB(`join_codes`)에만 있으므로 예전 mock 표(`CODE_MAP`)로는 영영 안 풀린다.
 *
 * 다만 서버가 **모르는 코드(404)**·**신원이 없어 막은 경우(401)** 에는 예전 경로
 * (`joinClass` → mock `resolveClassCode` → localStorage)로 한 번 더 시도한다.
 * 데모 코드 `MATH-2024`·`ENG-2024`·`SCI-2024` 가 그 자리다 — prod 회귀 자동화
 * (`tests/e2e/helpers.ts` 의 `joinDemoClass`)가 로그인 없이 그 코드로 들어가고,
 * 그 경로가 사라지면 prod-verify 가 통째로 깨진다.
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

    const succeed = (label: string, teacher: string, already: boolean) => {
      toast.success(
        already
          ? `이미 참여한 반이에요 — ${label}`
          : `${teacher}의 ${label}에 참여했어요!`,
      );
      setCode('');
      onJoined?.();
    };

    try {
      const res = await join.mutateAsync({ code: raw });
      succeed(res.enrollment.classroomLabel, res.enrollment.assignedBy, res.alreadyJoined);
      return;
    } catch (error) {
      const apiError = error instanceof ApiClientError ? error : null;

      // 서버가 모르는 코드(404)이거나 신원이 없어 막힌 경우(401)만 예전 데모 경로로 한 번 더.
      // 403·409·5xx 는 서버가 뜻을 갖고 거절한 것이라 mock 성공으로 가장하지 않는다.
      if (apiError && (apiError.status === 401 || apiError.status === 404)) {
        const legacy = await joinClass(raw);
        if (legacy.ok) {
          succeed(legacy.enrollment.classroomLabel, legacy.enrollment.assignedBy, false);
          return;
        }
        // 신원이 없어 막힌 것이면 「로그인이 필요합니다」보다 데모 경로의 문구가 맞는 말이다.
        if (apiError.status === 401) {
          toast.error(legacy.error);
          return;
        }
      }

      toast.error(apiError ? apiError.message : '참여하지 못했어요. 잠시 후 다시 시도해 주세요.');
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
          placeholder="참여 코드 입력 (예: ABC-123)"
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
