'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader,
} from '@/components/ui/sheet';
import { ClassbotMark } from '@/components/brand/classbot-mark';
import { AppSidebar } from './app-sidebar';
import type { Role } from './nav-config';

/**
 * 모바일 햄버거 → 사이드바 drawer.
 * 역할 전환은 여기에도 없다 — `role` 은 어느 nav 를 그릴지 고르는 입력일 뿐이다(AppHeader 주석 참고).
 *
 * 학생 레일의 중첩(「내 수업방 ▾ 봇 대화」 · 결정 ④ 2026-09-16 · `apps/classbot/CLAUDE.md § 5` ㉠)은
 * 여기서 따로 그리지 않는다 — 이 drawer 가 그리는 것은 `AppSidebar` 그 자체라, 들여쓰기도 그 컴포넌트가
 * 들고 온다(`SubNavRow depth`). 두 표면에서 층이 다르게 보이면 고칠 곳은 이 파일이 아니라 그쪽이다.
 */
export function MobileDrawer({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="메뉴 열기"
        className="hover:bg-pullim-slate-100 inline-flex h-9 w-9 items-center justify-center rounded-lg md:hidden"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2">
            <ClassbotMark size={22} />
            <span className="text-pullim-slate-900 text-sm font-bold tracking-tight">풀림</span>
            <span className="text-pullim-slate-500 text-2xs font-bold uppercase">
              {role === 'student' ? '클래스봇' : '교사'}
            </span>
          </SheetTitle>
        </SheetHeader>
        <AppSidebar role={role} onNavigate={() => setOpen(false)} className="flex-1" />
      </SheetContent>
    </Sheet>
  );
}
