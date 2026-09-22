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
 * 검토 끝에 사용자가 이 고정 문구로 결정했다.
 *
 * 무엇이 판정 가능하고 무엇이 아닌지는 갈린다 — 뭉뚱그리지 않는다.
 *  - **「몇 명인지」는 못 센다.** 실시간 presence 필드가 없고, 「풀이 진행 중」 라이프사이클은
 *    `lib/db/schema.ts` 가 M3+ 로 자리를 비워 뒀다. 그래서 「N명이 학습 중」처럼 쓰면
 *    화면이 없는 사실을 지어낸다.
 *  - **「있는지 없는지」도 이제 못 센다.** 2026-09-18 까지는 셀 수 있었다 — 부르는 화면
 *    (`/teacher/classbot` 의 `BotOpsCard`)이 mock 조인의 `TeacherBotRow.studentCount` 를
 *    꺼내 쓰고 있었다. 그 화면이 봇 목록을 정본(`GET /classbot/me/bots`)으로 옮기며
 *    **그 조인이 통째로 사라졌다.** 정본 봇 행(`BotDto`)에는 인원 칸이 없고, 반 카드가 주는
 *    `profile.enrolledCount` 는 반별 값이라 봇에 붙은 반이 여럿이면 더할 수 없다
 *    (두 반을 듣는 학생이 두 번 세어진다 — 교사 홈이 같은 이유로 총원 합산을 거부했다).
 *
 * ⚠️ 그래서 이 고정 문구에는 **잠재 결함이 하나 있다 — 알고 두는 것이다.**
 * 「만들어 두고 아직 학급에 안 붙인 봇」(정본에서 `classIds: []`)에서도 이 판은 똑같이
 * 「학습 중인 학생들이 있어요」라고 말한다 — 즉 **학생 0명인 봇에서 이 문장은 거짓이다.**
 * 종전에는 「고정 mock 5봇이 전부 인원을 갖고 있어 당장은 안 드러난다」였는데, 이제는 진짜
 * 교사의 진짜 봇이라 **첫 봇을 만들자마자 그 갈래가 화면에 선다.**
 * 문장을 손대지 않는 것은 사용자 결정이고, 고칠 자리는 문장이 아니라 **데이터**다 —
 * BE 가 붙어 참여 학생 수·마감 전 과제 수를 실제로 셀 수 있게 되면 여기가 그 수를
 * 실데이터로 바꿔 끼울 자리이고, 그때 「0명」 갈래도 함께 답해야 한다.
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
 *    ⚠️ 지금 DOM 순서상 「첫 tabbable」이 마침 「그만두기」라 **기본값과 결과가 같다**
 *    (prop 을 빼도 테스트가 초록이다 — 확인했다). 그래도 못박아 두는 까닭은 이 판의 안전이
 *    「버튼을 어느 순서로 적었나」에 기대면 안 되기 때문이다. 아래 배치는 좁은 화면에서
 *    `flex-col-reverse` 로 뒤집히므로, 다음 사람이 「보이는 순서대로 적자」고 두 줄을
 *    바꿔 쓰는 일은 충분히 일어난다 — 그때 이 prop 이 없으면 포커스가 「삭제」에 선다.
 *  - `finalFocus` — **기본 동작으로도 「더보기」로 돌아온다. 그래도 명시한다.**
 *    (예전 이 줄은 「메뉴 항목이 사라져 직전 포커스가 없다」라고 적었는데 사실이 아니었다 —
 *    prop 을 빼고 돌려도 「그만두기 → 포커스가 더보기로」가 그대로 통과한다. base-ui
 *    드롭다운이 닫히며 **자기 트리거로 포커스를 돌려주기** 때문에, 판이 열릴 때의
 *    「직전 포커스」가 정확히 그 「더보기」다.)
 *    남겨 두는 까닭은 그 기본값이 **두 프리미티브의 닫는 순서에 기대는 값**이라서다 —
 *    메뉴가 닫히며 트리거로 포커스를 돌려주는 일과 판이 「직전 포커스」를 붙잡는 일이 같은
 *    커밋에서 일어난다. 순서가 뒤집히면 판은 곧 사라질 메뉴 항목을 붙잡고, 닫을 때 포커스가
 *    `body` 로 떨어진다. 도착지를 손으로 대 두면 그 순서와 무관하게 「더보기」다.
 *    ⚠️ 이 prop 을 지키는 테스트는 없다(있을 수 없다 — 기본값과 결과가 같다).
 *    `bot-delete.test.tsx` 가 지키는 것은 **동작**(「그만두기 뒤 포커스가 더보기로」)이다.
 *  - `showCloseButton={false}` — 프리미티브 기본 X 버튼의 읽어주기 글이 영어(`Close`)이고,
 *    이 판에는 나가는 길이 이미 「그만두기」로 또렷하다. 그 「그만두기」가 `Dialog.Close`라
 *    터치 낭독기가 판에서 빠져나갈 길도 그대로 남는다.
 *
 * ── 이 도메인에 되묻는 판이 둘이었다 — 왜 골격이 다른가 ──────────────────────
 * 먼저 섰던 것은 과제 회수 판(`withdraw-controls.tsx` — 정본에 회수 문이 없어 FE PR 6 에서 지웠다)이고
 * 그쪽은 `DialogHeader`/`DialogFooter` 를 썼다. 여기는 안 쓴다 — 억지로 맞추지 않는다.
 *  - `DialogHeader` 는 `sticky flex-col` 이다. 이 판은 경고 아이콘이 제목과 **한 줄**에
 *    서야 해서(alertdialog — 「위험」이 제목보다 먼저 읽힌다) 쓰려면 `className` 으로
 *    그 둘을 다시 뒤집어야 한다. 기본값을 지우려고 감싸는 껍데기는 껍데기 값이 없다.
 *  - `DialogFooter` 는 `-mx-4 -mb-4 border-t bg-muted p-4` 짜리 sticky 회색 바다. 두 줄
 *    짜리 이 판에서는 본문보다 푸터가 더 무겁다. 회수 판은 설명이 여섯 줄이라 맞는 옷이었다.
 * 대신 버튼 배치(`flex-col-reverse … sm:flex-row sm:justify-end`)는 `DialogFooter` 와
 * 같은 값으로 맞춰 뒀다 — 다른 것은 껍데기이고, 손이 닿는 순서는 리포 전체가 같다.
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
