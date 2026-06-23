'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { botSignature } from '@/lib/tokens/bot-signature';
import type { OfficialTutor } from '@/lib/mock/classbot-official';

export function MyTutorCard({ tutor }: { tutor: OfficialTutor }) {
  const sig = botSignature(tutor);

  return (
    <Link
      href={`/classbot/chat?bot=${tutor.id}`}
      className="bg-card flex items-center gap-3 rounded-2xl border border-l-4 border-transparent min-h-11 p-3 shadow-pullim-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-400/50 hover:bg-pullim-slate-50 transition-colors"
      style={{ borderLeftColor: sig.hex }}
    >
      <span className="bg-pullim-slate-100 grid h-11 w-11 shrink-0 place-items-center rounded-full text-2xl">
        {tutor.avatarEmoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-pullim-slate-900">{tutor.name}</p>
        <p className="text-xs text-pullim-slate-500">{tutor.subject}</p>
        <p className="text-2xs text-pullim-slate-500">{tutor.curriculum.length}단원</p>
      </div>
      <div className="text-pullim-blue-500 flex shrink-0 items-center gap-1 text-2xs font-semibold">
        <MessageCircle className="h-3.5 w-3.5" />
        <span>대화하기</span>
      </div>
    </Link>
  );
}
