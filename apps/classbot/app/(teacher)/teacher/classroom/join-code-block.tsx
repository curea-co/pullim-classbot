'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIssueJoinCode } from '@/hooks/api/classroom';
// 표기 규칙의 주인. `lib/join-code.ts` 를 부르지 않는 이유는 그 파일이 코드 **발급**까지
// 소유해서 `node:crypto` 와 Drizzle 스키마를 함께 끌고 오기 때문이다 — client 컴포넌트가
// 그걸 import 하면 DB 스키마가 통째로 브라우저 번들에 실린다.
import { formatJoinCode } from '@/lib/join-code-format';
import { cn } from '@/lib/utils';

/**
 * 참여 코드 한 덩어리 — 이 화면의 주인공이다.
 *
 * 교사가 여기서 하는 일은 셋뿐이다: **읽어서 부르기 · 복사하기 · 다시 내기**.
 * 그래서 코드는 카드 안 다른 어떤 글자보다 크고, 복사 버튼은 코드 바로 옆에 붙는다.
 *
 * 저장된 코드는 하이픈이 없는 대문자 6자이고 하이픈은 **표시할 때만** 붙는다
 * (계약 §5, `lib/join-code.ts`). 복사도 보이는 그대로(`ABC-123`)를 담는다 —
 * 학생 입력이 대문자화·하이픈 제거로 정규화되므로 어느 쪽을 붙여 넣어도 같은 코드로 모인다.
 * 학생에게 불러 주는 글자와 붙여 넣는 글자가 다르면 그게 더 헷갈린다.
 *
 * 코드 다시 내기는 **되돌릴 수 없다** — 새 코드가 나오는 순간 옛 코드는 못 쓴다.
 * 그래서 한 번에 실행하지 않고 그 사실을 먼저 말한 뒤 한 번 더 누르게 한다.
 */
export function JoinCodeBlock({
  classroomId,
  code,
  size = 'md',
}: {
  classroomId: string;
  /** 지금 살아 있는 코드. 아직 없으면 null — 그때는 「코드 내기」가 대신 선다. */
  code: string | null;
  /** 갓 만든 수업방 배너에서는 한 칸 더 크게 — 그 순간 교사가 볼 것은 이 코드뿐이다. @default 'md' */
  size?: 'md' | 'lg';
}) {
  const [confirming, setConfirming] = useState(false);
  const issue = useIssueJoinCode();

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
      { classroomId },
      {
        onSuccess: ({ joinCode }) => {
          setConfirming(false);
          toast.success('새 참여 코드를 냈어요', {
            description: `${formatJoinCode(joinCode)} · 옛 코드는 이제 못 써요`,
          });
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  }

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
              'text-pullim-slate-900 font-mono font-bold tracking-widest',
              size === 'lg' ? 'text-3xl' : 'text-2xl',
            )}
          >
            {formatJoinCode(code)}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy} data-testid="join-code-copy">
            <Copy />
            복사
          </Button>
        </div>
      ) : (
        <p className="text-pullim-slate-500 mt-1 text-2xs">
          아직 코드가 없어요. 코드를 내면 학생이 그 코드로 들어올 수 있어요.
        </p>
      )}

      {/* 다시 내기 — 옛 코드를 죽이는 일이라 한 번 더 묻는다 */}
      <div className="mt-2">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-pullim-slate-600 text-2xs">
              새 코드를 내면 지금 코드는 그 자리에서 못 써요.
            </span>
            <Button
              type="button"
              variant="pullim"
              size="sm"
              onClick={handleIssue}
              disabled={issue.isPending}
              data-testid="join-code-reissue-confirm"
            >
              <RefreshCw />
              {issue.isPending ? '내는 중…' : '새 코드 내기'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              그만두기
            </Button>
          </div>
        ) : code ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
            className="text-pullim-slate-600 hover:text-pullim-slate-900"
            data-testid="join-code-reissue"
          >
            <RefreshCw />
            코드 다시 내기
          </Button>
        ) : (
          <Button
            type="button"
            variant="pullim"
            size="sm"
            onClick={handleIssue}
            disabled={issue.isPending}
            data-testid="join-code-issue"
          >
            <RefreshCw />
            {issue.isPending ? '내는 중…' : '코드 내기'}
          </Button>
        )}
      </div>
    </div>
  );
}
