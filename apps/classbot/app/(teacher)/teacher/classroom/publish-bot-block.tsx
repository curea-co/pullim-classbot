'use client';

import { useId, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowUpFromLine, EyeOff, Pencil, Store, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatPublishedAt } from '@/components/classbot/marketplace';
import { usePublishBot, useUnpublishBot } from '@/hooks/api/marketplace';
import type { TeacherClassroomItem } from '@/hooks/api/types';

/** 한 줄 소개 길이 한도. 서버가 정한 값이고(마켓 계약 §2), 여기서는 **미리 알려 주기만** 한다. */
const BLURB_MAX = 200;

/**
 * 이 반의 봇을 봇 마켓에 공유하고 거두는 자리.
 *
 * 왜 수업방 카드인가: 공유는 「이 봇을 남들이 둘러봐도 되는가」를 정하는 일이고, 그 봇이
 * 실제로 사는 곳이 수업방이다. 봇 관리(`/teacher/bots`)는 아직 mock 카탈로그라
 * 거기 붙은 토글은 어느 DB 행도 바꾸지 못한다.
 *
 * **공유 상태는 수업방 목록이 그대로 들고 온다**(`TeacherClassroomItem.isPublished`).
 * 여기서 마켓 목록을 따로 읽지 않는다 — 배지 하나 때문에 **남의 봇까지 든 공개 목록**을
 * 받아 오게 되고, 내 반 목록이 그 목록의 크기에 매인다. 공유·거두기가
 * `classroomKeys.teacherClassrooms` 를 무효화하므로 배지는 저절로 따라온다.
 *
 * 공유 그만두기는 **되돌릴 수 있는 일**이라 무섭게 굴지 않는다 — 빨간 버튼도, 「정말요?」도 없다.
 * 참여 코드 다시 내기(`join-code-block.tsx`)가 한 번 더 묻는 건 그건 **옛 코드가 죽어서**다.
 * 공유를 그만둬도 봇도 반도 학생도 그대로 있고, 다시 공유하면 그만이다.
 */
export function PublishBotBlock({
  botId,
  botName,
  isPublished,
  publishedAt,
  publishBlurb,
}: {
  botId: string;
  botName: TeacherClassroomItem['botName'];
  isPublished: TeacherClassroomItem['isPublished'];
  publishedAt: TeacherClassroomItem['publishedAt'];
  /** 저장된 한 줄 소개. **내려도 남아 있어서** 다시 올릴 때 폼이 이 값으로 채워진다. */
  publishBlurb: TeacherClassroomItem['publishBlurb'];
}) {
  const fieldId = useId();
  const publish = usePublishBot();
  const unpublish = useUnpublishBot();

  const publishedLabel = formatPublishedAt(publishedAt);

  const [editing, setEditing] = useState(false);
  const [blurb, setBlurb] = useState('');

  const label = botName ?? '이 봇';

  function openForm() {
    setBlurb(publishBlurb ?? '');
    setEditing(true);
  }

  /**
   * 공유 POST 는 **보이는 상태를 통째로 쓴다** — 본문의 `blurb` 가 저장 값을 언제나 덮고,
   * 비우면 지운다. 그래서 폼은 언제나 저장된 소개로 열리고(위 `openForm`),
   * 손대지 않았어도 그 값을 그대로 되돌려 보낸다. 「안 건드렸으니 빼고 보내자」로 하면
   * 서버가 그걸 「지운다」로 읽는다.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publish.isPending) return;

    publish.mutate(
      { botId, blurb: blurb.trim() },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success(
            isPublished ? '한 줄 소개를 고쳤어요' : `${label}을(를) 봇 마켓에 공유했어요`,
          );
        },
        // 서버가 200자를 코드 포인트로 다시 센다 — 거절당하면 그 우리말 메시지를
        // 폼 안에 그대로 띄운다(아래 publish.isError).
      },
    );
  }

  function handleUnpublish() {
    if (unpublish.isPending) return;
    unpublish.mutate(
      { botId },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success('봇 마켓 공유를 그만뒀어요', {
            description: '반과 학생은 그대로예요. 언제든 다시 올릴 수 있어요.',
          });
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  }

  return (
    <div className="border-pullim-slate-200 mt-4 border-t pt-4" data-testid={`publish-block-${botId}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-pullim-slate-500 text-2xs font-bold">봇 마켓</p>
        {/* 상태는 색이 아니라 **글자와 아이콘**이 말한다 — 초록·앰버는 이 앱에서 폐기됐다 */}
        {isPublished ? (
          <Chip tone="info" data-testid={`publish-state-${botId}`}>
            <Store aria-hidden />
            공유 중
          </Chip>
        ) : (
          <Chip tone="neutral" data-testid={`publish-state-${botId}`}>
            <EyeOff aria-hidden />
            공유 안 함
          </Chip>
        )}
      </div>

      {isPublished ? (
        <>
          <p className="text-pullim-slate-600 mt-1 text-2xs leading-relaxed">
            {publishedLabel ? `${publishedLabel}부터 공유하고 있어요. ` : ''}
            봇 마켓에서 누구나 이 봇을 둘러보고, 자기 봇으로 담아 갈 수 있어요.
          </p>
          {publishBlurb && (
            <p className="text-pullim-slate-700 mt-1 text-2xs leading-relaxed">
              “{publishBlurb}”
            </p>
          )}
        </>
      ) : (
        <p className="text-pullim-slate-600 mt-1 text-2xs leading-relaxed">
          공유하면 다른 선생님과 학생이 봇 마켓에서 이 봇을 둘러보고, 학생은 자기 봇으로
          담아 갈 수 있어요. 담아 간 학생은 봇과 대화만 할 뿐 <b>내 반 학생이 되지는 않아요</b> —
          반에 들어오는 길은 그대로 참여 코드 하나예요.
        </p>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} className="mt-3">
          <Label
            htmlFor={`${fieldId}-blurb`}
            className="text-pullim-slate-700 mb-1 flex items-center justify-between text-xs font-bold"
          >
            <span>한 줄 소개</span>
            <span className="text-pullim-slate-500 text-2xs">
              선택 · {blurb.length}/{BLURB_MAX}자
            </span>
          </Label>
          <Textarea
            id={`${fieldId}-blurb`}
            value={blurb}
            onChange={(e) => setBlurb(e.target.value.slice(0, BLURB_MAX))}
            maxLength={BLURB_MAX}
            rows={2}
            placeholder="예: 개념부터 서술형까지 차근차근 짚어 주는 봇이에요"
            className="min-h-16 text-sm"
            data-testid={`publish-blurb-input-${botId}`}
          />

          {publish.isError && (
            <p
              className="text-pullim-danger mt-2 text-2xs font-bold"
              role="alert"
              data-testid={`publish-error-${botId}`}
            >
              {publish.error.message}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              variant="pullim"
              size="sm"
              disabled={publish.isPending}
              data-testid={`publish-submit-${botId}`}
            >
              <ArrowUpFromLine />
              {publish.isPending ? '공유하는 중…' : isPublished ? '소개 고치기' : '공유하기'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X />
              그만두기
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {isPublished ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openForm}
                data-testid={`publish-edit-${botId}`}
              >
                <Pencil />
                소개 고치기
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUnpublish}
                disabled={unpublish.isPending}
                className="text-pullim-slate-600 hover:text-pullim-slate-900"
                data-testid={`unpublish-${botId}`}
              >
                <EyeOff />
                {unpublish.isPending ? '거두는 중…' : '공유 그만두기'}
              </Button>
              <Link
                href={`/teacher/marketplace/${botId}`}
                className="text-pullim-blue-600 hover:text-pullim-blue-700 inline-flex min-h-7 items-center gap-1 text-2xs font-bold"
                data-testid={`publish-view-${botId}`}
              >
                <Store className="h-3.5 w-3.5" aria-hidden />
                공유된 모습 보기
              </Link>
            </>
          ) : (
            <Button
              type="button"
              variant="pullim"
              size="sm"
              onClick={openForm}
              data-testid={`publish-open-${botId}`}
            >
              <ArrowUpFromLine />
              공유하기
            </Button>
          )}
        </div>
      )}

      {isPublished && !editing && (
        <p className="text-pullim-slate-500 mt-2 text-2xs">
          그만둬도 반과 학생은 그대로예요. 언제든 다시 공유할 수 있어요.
          다만 <b>이미 담아 간 학생의 봇은 계속 돌아가요</b> — 쓰던 중에 뺏지 않으려는 거예요.
        </p>
      )}
    </div>
  );
}
