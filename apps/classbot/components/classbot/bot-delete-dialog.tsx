'use client';

import { useRef, type RefObject } from 'react';
import { TriangleAlert } from 'lucide-react';
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { josa } from '@/lib/mock';

/**
 * 봇을 지우기 전에 한 번 묻는 판 (SCR-C-17 · 교사 운영 메인).
 *
 * ── 문구는 고정이다 ──────────────────────────────────────────────────────────
 * 아래 본문은 **사용자가 정한 그대로**다. 숫자를 끼워 넣거나 문장을 다듬지 않는다.
 * 「학습 중인 학생이 몇 명인지」를 지금 데이터로는 판정할 수 없어서다 —
 * 실시간 presence 필드가 없고, 「풀이 진행 중」은 `lib/db/schema.ts` 가 M3+ 로 자리를
 * 비워 뒀다. 그래서 「N명이 학습 중」처럼 쓰면 화면이 없는 사실을 지어내게 된다.
 * 검토 끝에 사용자가 이 고정 문구로 결정했다.
 * BE 가 붙어 참여 학생 수·마감 전 과제 수를 실제로 셀 수 있게 되면 **여기가 그 수를
 * 실데이터로 바꿔 끼울 자리**다. 그때까지는 문장을 건드리지 않는다.
 *
 * ── 접근성: base-ui 가 해 주는 것 vs 여기서 붙인 것 ──────────────────────────
 * base-ui `Dialog` 가 해 주는 것
 *  - 포커스 트랩(`modal` 기본값 true) · Escape 로 닫기 · 열려 있는 동안 바깥 스크롤 잠금
 *  - `aria-labelledby` / `aria-describedby` 를 `Dialog.Title` · `Dialog.Description` 의
 *    id 로 **자동 연결**한다(`DialogPopup` 이 둘의 등록 id 를 읽어 popup 에 얹는다).
 *    그래서 여기서 id 를 손으로 짓지 않는다 — 두 벌이면 갈라진다.
 *  - 닫힐 때 포커스 되돌리기(`finalFocus`).
 * 여기서 직접 붙인 것과 까닭
 *  - `role="alertdialog"` — base-ui 는 `AlertDialog` 컴포넌트에서만 이 role 을 세운다
 *    (`useRenderDialogRoot`: `isAlertDialog ? 'alertdialog' : 'dialog'`). 우리 레인 2
 *    프리미티브(`components/ui/dialog.tsx`)는 `Dialog` 만 감싸고 있어 role 이 `dialog` 다.
 *    프리미티브를 이 판 하나 때문에 고치지 않고 **쓰는 쪽에서** 얹는다.
 *  - `disablePointerDismissal` — base-ui 의 `AlertDialog` 가 세우는 값과 같다. 되돌릴 수
 *    없는 일을 묻는 판은 바깥을 잘못 눌러 닫히면 안 된다. Escape 는 그대로 열려 있다.
 *  - `initialFocus={cancelRef}` — 기본값은 「첫 tabbable」이다. 위험한 쪽에 포커스가
 *    먼저 가면 엔터 한 번에 지워진다. 그래서 **「그만두기」에 못박는다.**
 *  - `finalFocus` — 이 판은 카드의 「더보기」 메뉴 항목에서 열린다. 메뉴는 항목을 누르는
 *    순간 닫히고 그 항목 노드가 사라져서 「직전에 포커스였던 요소」가 없다. 그래서 판을
 *    연 쪽이 「더보기」 트리거 ref 를 넘겨 준다.
 *  - `showCloseButton={false}` — 프리미티브 기본 X 버튼의 읽어주기 글이 영어(`Close`)이고,
 *    이 판에는 나가는 길이 이미 「그만두기」로 또렷하다. 그 「그만두기」가 `Dialog.Close`라
 *    터치 낭독기가 판에서 빠져나갈 길도 그대로 남는다.
 */
export interface BotDeleteDialogProps {
  /** 지울 봇 이름 — 제목과 삭제 버튼 읽어주기에 쓴다 */
  botName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 「삭제」를 누른 뒤 — 판은 이 콜백 뒤에 스스로 닫는다 */
  onConfirm: () => void;
  /** 닫힐 때 포커스를 돌려줄 자리 — 이 판을 연 카드의 「더보기」 트리거 */
  finalFocus?: RefObject<HTMLElement | null>;
}

/** 사용자가 정한 본문. 고정 문구라 상수로 둔다 — 테스트는 이 글자를 그대로 단정한다. */
const DELETE_WARNING =
  '현재 이 봇으로 학습 중인 학생들이 있어요. 봇을 삭제하면 해당 학생은 봇을 이용할 수 없어요.';

export function BotDeleteDialog({
  botName,
  open,
  onOpenChange,
  onConfirm,
  finalFocus,
}: BotDeleteDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // 이름 뒤 조사는 받침에 따라 갈린다(수학봇**을** / 미적분 도우미**를**).
  // `josa` 가 붙여 준 조사만 떼어내, 이름은 이름대로 줄바꿈 규칙을 받게 둔다.
  const particle = josa(botName, '을/를').slice(botName.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent
        role="alertdialog"
        showCloseButton={false}
        initialFocus={cancelRef}
        finalFocus={finalFocus}
        data-testid="bot-delete-dialog"
        className="gap-3"
      >
        <div className="flex items-start gap-2">
          <TriangleAlert className="text-pullim-danger mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {/*
            이름이 길어도 가로로 넘치지 않게 — 한국어는 어절 단위로 끊고(`break-keep`),
            그래도 한 어절이 폭보다 길면 그 자리에서 접는다(`overflow-wrap: anywhere`).
          */}
          <DialogTitle className="text-pullim-slate-900 text-base font-bold break-keep [overflow-wrap:anywhere]">
            {botName}
            {particle} 삭제할까요?
          </DialogTitle>
        </div>

        <DialogDescription className="text-pullim-slate-700 text-sm leading-relaxed break-keep">
          {DELETE_WARNING}
        </DialogDescription>

        {/*
          좁은 화면에서는 위험한 쪽이 아래로 오게 뒤집는다(`flex-col-reverse`) —
          엄지가 먼저 닿는 자리가 「삭제」면 안 된다. `app/(student)/classbot/me/share`
          의 그만두기 판과 같은 배치다.
        */}
        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose
            render={<Button ref={cancelRef} type="button" variant="outline" size="touch" />}
            data-testid="bot-delete-cancel"
          >
            그만두기
          </DialogClose>
          <Button
            type="button"
            variant="pullim-danger"
            size="touch"
            // 버튼 글자는 단어 하나(`07 § 6.6`)라 어느 봇인지가 빠진다 — 읽어주기로 살린다.
            aria-label={`${botName} 삭제`}
            data-testid="bot-delete-confirm"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            삭제
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
