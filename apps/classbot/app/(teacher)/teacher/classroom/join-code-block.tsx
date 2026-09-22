'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIssueJoinCode } from '@/hooks/api/classroom';
import { statusOf } from '@/lib/api/classbot-client';
import type { JoinCodeDto } from '@/lib/api/classbot-dto';
// 표기 규칙의 주인. `lib/join-code.ts` 를 부르지 않는 이유는 그 파일이 코드 **발급**까지
// 소유해서 `node:crypto` 와 Drizzle 스키마를 함께 끌고 오기 때문이다 — client 컴포넌트가
// 그걸 import 하면 DB 스키마가 통째로 브라우저 번들에 실린다.
import { formatJoinCode, joinCodeLife } from '@/lib/join-code-format';
import { cn } from '@/lib/utils';

/**
 * 참여 코드 한 덩어리 — 반 카드·반 상세의 주인공이다.
 *
 * 교사가 여기서 하는 일은 셋뿐이다: **새로 내기 · 읽어서 부르기 · 복사하기**.
 * 그래서 코드는 카드 안 다른 어떤 글자보다 크고, 복사 버튼은 코드 바로 옆에 붙는다.
 *
 * 코드가 어디서 오나 — 둘이다.
 *  - **낼 때**(`POST /classes/:classId/join-codes` · `useIssueJoinCode`): 정본 카드·상세(`GET /bots*`)에는 코드가
 *    실리지 않으므로(옛 bot == class 문 · `operator-class.ts`) 이 상자는 기본적으로 **이 화면에서 마지막으로 낸
 *    코드**만 든다 — 새로 고치면 비고, 그건 잃은 것이 아니라 「다시 내면 된다」다. 옛 코드는 학생 손에 있다.
 *  - **`initial`**: 반을 막 만들었거나(`POST /classes` 의 첫 코드) 봇을 붙이고 뗀 뒤(`PUT …/bot` 응답의 활성 코드)
 *    반 상세가 준 `ClassDto.joinCode` — `useClassDetail`. 있으면 새로 고쳐도 그 코드로 선다.
 *
 * **재발급은 갈아 끼우기다**(pullim-api PR 2 · api.md § 3.5): 새 코드를 내면 그 반의 옛 코드는 전부 지워진다.
 * 계획 PR 5a 때는 정본이 저장만 해서 그 말을 걷었는데, 이제 사실이라 다시 말한다 — 「새로 내면 지금 코드는 닫혀요」.
 * 만료(`expiresAt` — 기본 +48h · `null` 은 안 닫힘)는 남은 시간으로 그리고, 닫히는 순간 화면이 스스로 바뀐다.
 *
 * 저장된 코드는 하이픈이 없는 대문자이고 하이픈은 **표시할 때만** 붙는다(`lib/join-code-format.ts`).
 * 복사도 보이는 그대로(`ABC-123`)를 담는다 — 그래도 학생이 튕기지 않는 이유는
 * **학생 입력칸이 보낼 때 접기 때문**이다: `components/classbot/home/join-code-form.tsx` 가
 * `normalizeJoinCode` 로 붙임표·공백을 지운 값을 `POST /classbot/enrollments` 로 보낸다.
 * 정본은 **정규화를 하지 않는다**(실측 2026-09-18 dev: `"WXP-M7U"` → 404 · `"WXPM7U"` → 201).
 * 즉 그 한 줄이 이 화면과 학생 화면을 잇는 유일한 다리다 — 사라지면 여기서 복사한 코드가 다시 404 가 된다.
 */

/**
 * 발급 실패 → 교사가 읽는 한 줄. 서버가 가른 뜻을 뭉개지 않는다(`authz.md § 1.5` — 남의 반은 403).
 * @param error - `useIssueJoinCode` 가 던진 오류
 * @returns 토스트에 띄우는 한 줄
 */
export function issueFailureMessage(error: unknown): string {
  switch (statusOf(error)) {
    case 401:
      return '로그인이 필요해요.';
    case 403:
      return '이 반의 운영 교사만 코드를 낼 수 있어요.';
    case 404:
      return '반을 찾을 수 없어요.';
    default:
      return '코드를 내지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}

export function JoinCodeBlock({
  classId,
  initial = null,
  size = 'md',
}: {
  /** 반 id(pullim-api). */
  classId: string;
  /** 이 세션이 이미 아는 활성 코드(반 생성·봇 할당 응답). 없으면 낼 때까지 비어 있다. @default null */
  initial?: JoinCodeDto | null;
  /** 반 상세 머리에서는 한 칸 더 크게. @default 'md' */
  size?: 'md' | 'lg';
}) {
  const [issued, setIssued] = useState<JoinCodeDto | null>(null);
  // 아는 코드(`initial`)가 있으면 그것이 선다 — 요약 캐시는 정본이 마지막으로 돌려준 활성 코드라 여기서 낸 코드보다
  // 오래될 수 없다(`useIssueJoinCode` 가 새 코드를 요약에도 써 둔다). 모르면 이 상자가 낸 코드.
  const current = initial ?? issued;

  const issue = useIssueJoinCode();
  const code = current?.code ?? null;
  const expiresAt = current?.expiresAt ?? null;

  async function handleCopy() {
    if (!code) return;
    const display = formatJoinCode(code);
    // 보안 컨텍스트가 아니면(http 로 연 다른 기기 등) clipboard 자체가 없다 — 그때는 눈으로 옮긴다.
    if (!navigator.clipboard) {
      toast.error('이 브라우저에서는 복사할 수 없어요', { description: `코드를 직접 적어 주세요 — ${display}` });
      return;
    }
    try {
      await navigator.clipboard.writeText(display);
      toast.success('참여 코드를 복사했어요', { description: display });
    } catch {
      toast.error('복사하지 못했어요', { description: `코드를 직접 적어 주세요 — ${display}` });
    }
  }

  function handleIssue() {
    issue.mutate(
      { classId },
      {
        onSuccess: (dto) => {
          setIssued(dto);
          toast.success('새 참여 코드를 냈어요', { description: formatJoinCode(dto.code) });
        },
        onError: (error) => {
          toast.error(issueFailureMessage(error));
        },
      },
    );
  }

  /*
    **닫히는 순간 화면이 스스로 바뀐다.** 렌더할 때 한 번만 재면, 교사가 탭을 열어 둔 채 수업을 하는 동안
    만료가 지나도 「…까지 쓸 수 있어요」와 복사 버튼이 살아 있다 — 죽은 코드를 불러 준다.
    초 단위로 돌리지 않는다. 필요한 순간은 **딱 하나**(닫히는 시각)라, 거기까지 한 번만 잰다.
    `setTimeout` 의 상한(약 24.8일)을 넘기면 즉시 발화하므로 넘는 길이는 걸지 않는다.
  */
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const left = new Date(expiresAt).getTime() - Date.now();
    if (!Number.isFinite(left) || left <= 0 || left > 2_147_483_647) return;
    const timer = setTimeout(() => setTick((n) => n + 1), left + 1_000);
    return () => clearTimeout(timer);
  }, [expiresAt]);

  const life = joinCodeLife(expiresAt);
  const closed = life.state === 'closed';

  return (
    <div>
      <p className="text-pullim-slate-500 text-2xs font-bold">참여 코드</p>

      {code ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
          {/*
            숫자·라틴 대문자만 담는 자리라 글꼴은 고정폭이다 — 학생이 한 글자씩 옮겨 적는 코드라
            자릿수가 눈으로 세어져야 한다. 자간도 그래서 넓힌다.
          */}
          <span
            data-testid="join-code"
            className={cn(
              'font-mono font-bold tracking-widest',
              // 닫힌 코드는 **지우지 않고 물린다.** 지우면 교사가 「내가 뭘 나눠 줬더라」를
              // 잃고, 그대로 두면 아직 쓸 수 있는 것처럼 보인다. 그래서 회색 + 취소선이다.
              closed ? 'text-pullim-slate-400 line-through' : 'text-pullim-slate-900',
              size === 'lg' ? 'text-3xl' : 'text-2xl',
            )}
          >
            {formatJoinCode(code)}
          </span>
          {/* 닫힌 코드는 복사할 이유가 없다 — 학생이 넣어도 안 열린다 */}
          {!closed && (
            <Button type="button" variant="outline" size="sm" onClick={handleCopy} data-testid="join-code-copy">
              <Copy />
              복사
            </Button>
          )}
        </div>
      ) : (
        <p className="text-pullim-slate-500 mt-1 text-2xs" data-testid="join-code-hint">
          코드를 새로 내면 여기 보여요. 학생에게 알려 주면 그 코드로 이 반에 들어와요.
        </p>
      )}

      {/*
        언제까지 사는지 — 교사가 이 값으로 하는 결정은 하나다: 「지금 불러 줘도 되나」.
        `expiresAt` 이 null 인 코드(안 닫히게 낸 것)에는 아무 말도 붙이지 않는다.
      */}
      {code && life.state === 'open' && (
        <p data-testid="join-code-life" className="text-pullim-slate-500 mt-1 text-2xs">
          {life.label} 쓸 수 있어요
        </p>
      )}
      {code && closed && (
        <p data-testid="join-code-life" className="text-pullim-danger mt-1 text-2xs font-bold">
          기간이 지나 닫혔어요 · 새 코드를 내면 다시 열려요
        </p>
      )}

      <div className="mt-2">
        <Button
          type="button"
          variant={code ? 'ghost' : 'pullim'}
          size="sm"
          onClick={handleIssue}
          disabled={issue.isPending}
          className={cn(code && 'text-pullim-slate-600 hover:text-pullim-slate-900')}
          data-testid="join-code-issue"
        >
          <RefreshCw />
          {issue.isPending ? '내는 중…' : '참여 코드 새로 내기'}
        </Button>
        {/* 살아 있는 코드가 있을 때만 — 없는 코드가 닫힌다고 말할 일은 없다. */}
        {code && !closed && (
          <p className="text-pullim-slate-500 mt-1 text-2xs" data-testid="join-code-replace-note">
            새로 내면 지금 코드는 닫혀요.
          </p>
        )}
      </div>
    </div>
  );
}
