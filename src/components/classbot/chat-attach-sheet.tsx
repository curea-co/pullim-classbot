'use client';

import { useState } from 'react';
import { Camera, ImagePlus, PencilLine, ScanText, Mic, Plus } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

/**
 * 채팅 입력바 첨부 진입점 ([+] drawer).
 * 권위: [04 § 9.7](proc/spec/04-ux-flow.md), [08 § 15.7](proc/spec/08-design-system.md).
 *
 * 사진/카메라/필기/문제 캡처/음성 메모 — 5종. 추출본에서는 placeholder (Coming soon),
 * 실제 업로드/녹음은 v2 마일스톤.
 */
export function ChatAttachSheet({ botName }: { botName: string }) {
  const [openMessage, setOpenMessage] = useState<string | null>(null);

  function handlePick(label: string) {
    setOpenMessage(`${label} — 곧 추가될 기능이에요. v2에서 만나요.`);
    // 3초 후 자동 해제 (간단한 인라인 토스트)
    setTimeout(() => setOpenMessage(null), 3000);
  }

  return (
    <>
      <Sheet>
        <SheetTrigger
          render={
            <button
              type="button"
              aria-label="첨부"
              className="text-pullim-slate-500 hover:bg-pullim-slate-100 hover:text-pullim-slate-700 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          }
        />
        <SheetContent side="bottom" className="rounded-t-2xl p-0">
          <SheetHeader>
            <SheetTitle>{botName}에게 보낼 것 고르기</SheetTitle>
            <SheetDescription>사진·필기·음성 등을 같이 보낼 수 있어요 (곧 열려요).</SheetDescription>
          </SheetHeader>

          <ul className="grid grid-cols-3 gap-2 px-4 pb-6">
            <AttachOption icon={Camera}     label="카메라"      onPick={handlePick} />
            <AttachOption icon={ImagePlus}  label="사진"        onPick={handlePick} />
            <AttachOption icon={ScanText}   label="문제 캡처"   onPick={handlePick} />
            <AttachOption icon={PencilLine} label="필기 노트"   onPick={handlePick} />
            <AttachOption icon={Mic}        label="음성 메모"   onPick={handlePick} />
            <AttachClose />
          </ul>
        </SheetContent>
      </Sheet>

      {openMessage && (
        <div
          role="status"
          className="bg-pullim-slate-900 text-white pullim-anim-message-mount pointer-events-none fixed left-1/2 bottom-24 z-[60] -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg"
        >
          {openMessage}
        </div>
      )}
    </>
  );
}

function AttachOption({
  icon: Icon,
  label,
  onPick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onPick: (label: string) => void;
}) {
  return (
    <li>
      <SheetClose
        render={
          <button
            type="button"
            onClick={() => onPick(label)}
            className={cn(
              'bg-pullim-slate-50 hover:bg-pullim-blue-50 text-pullim-slate-700 hover:text-pullim-blue-700',
              'flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-2xl transition-colors',
            )}
          >
            <Icon className="h-6 w-6" />
            <span className="text-[11px] font-semibold">{label}</span>
          </button>
        }
      />
    </li>
  );
}

function AttachClose() {
  return (
    <li>
      <SheetClose
        render={
          <button
            type="button"
            className="bg-pullim-slate-100 text-pullim-slate-500 hover:bg-pullim-slate-200 flex h-24 w-full items-center justify-center rounded-2xl text-[11px] font-semibold transition-colors"
          >
            닫기
          </button>
        }
      />
    </li>
  );
}

/**
 * 음성 입력 placeholder ([🎤]) — 길게 누르기 인터랙션은 v2.
 * P1 단계에서는 보이는 어포던스만 제공 + 클릭 시 안내.
 */
export function ChatVoiceButton({ onNotify }: { onNotify: (msg: string) => void }) {
  return (
    <button
      type="button"
      aria-label="음성 입력 (곧 열려요)"
      onClick={() => onNotify('음성 입력은 곧 열려요. v2에서 만나요.')}
      className="text-pullim-slate-500 hover:bg-pullim-slate-100 hover:text-pullim-slate-700 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors"
    >
      <Mic className="h-5 w-5" />
    </button>
  );
}
