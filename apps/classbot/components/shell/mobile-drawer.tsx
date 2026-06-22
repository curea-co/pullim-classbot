'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader,
} from '@/components/ui/sheet';
import { ClassbotMark } from '@/components/brand/classbot-mark';
import { AppSidebar } from './app-sidebar';
import { RoleSwitcher } from './role-switcher';
import type { Role } from './nav-config';

/**
 * 모바일 햄버거 → 사이드바 drawer.
 * 사이드바 + 역할 전환을 한 곳에서.
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
            <span className="text-pullim-slate-400 text-[10px] font-bold uppercase">
              {role === 'student' ? '클래스봇' : '교사'}
            </span>
          </SheetTitle>
          <div className="mt-2">
            <RoleSwitcher current={role} />
          </div>
        </SheetHeader>
        <AppSidebar role={role} onNavigate={() => setOpen(false)} className="flex-1" />
      </SheetContent>
    </Sheet>
  );
}
