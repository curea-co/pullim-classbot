'use client';

import { GraduationCap, ClipboardList, Video, MessageCircle, KeyRound } from 'lucide-react';

/**
 * 교사수업 모드 신규 사용자 hero — "선생님이 이끄는 구조화된 수업".
 *
 * 권위 문서(`05_풀림_수업방_세부기획.md` Step 6)의 학생 초대 채널은 코드·링크·QR 세 가지다.
 * 실제 참여(코드→enrollment) 플로우는 아직 미구현이라, 여기서는 가짜 성공/실패 대신
 * 셸의 `준비 중`(aria-disabled) 컨벤션을 따라 비활성 상태로 노출한다.
 * 실제 join 구현은 온보딩/enrollment PR 범위.
 */
export function TeacherClassHero({ name }: { name?: string }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-pullim-slate-900 p-5 text-white shadow-pullim-sm">
      <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-pullim-slate-400">
        <GraduationCap className="h-3.5 w-3.5" /> 교사 수업
      </div>
      <h1 className="mt-1.5 text-2xl font-bold leading-tight">
        {name ? `${name}님, 선생님 수업에` : '선생님 수업에'}{' '}
        <br className="sm:hidden" />
        참여해 보세요
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-pullim-slate-300">
        선생님이 만든 클래스에 참여하면{' '}
        <strong className="text-white">배정 과제 · 라이브 수업 · 1:1 질문</strong>을 한 곳에서.
      </p>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-pullim-slate-400">
        <li className="inline-flex items-center gap-1">
          <ClipboardList className="h-3.5 w-3.5 text-pullim-slate-500" /> 선생님이 배정한 과제
        </li>
        <li className="inline-flex items-center gap-1">
          <Video className="h-3.5 w-3.5 text-pullim-slate-500" /> 실시간 라이브 수업
        </li>
        <li className="inline-flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5 text-pullim-slate-500" /> AI 봇과 1:1 질문
        </li>
      </ul>

      {/* 참여(코드·링크·QR) — 준비 중 (실제 join 플로우는 온보딩 PR) */}
      <div className="mt-4 flex items-center gap-2" aria-disabled="true">
        <div className="relative flex-1">
          <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pullim-slate-600" />
          <input
            type="text"
            disabled
            placeholder="참여 코드 입력 (준비 중)"
            aria-label="참여 코드 입력 (준비 중)"
            className="w-full cursor-not-allowed rounded-xl border border-pullim-slate-700 bg-pullim-slate-800/60 py-2.5 pl-9 pr-3 text-sm text-pullim-slate-400 placeholder:text-pullim-slate-500"
          />
        </div>
        <span className="shrink-0 rounded-xl bg-pullim-slate-700 px-4 py-2.5 text-sm font-bold text-pullim-slate-400">
          준비 중
        </span>
      </div>
      <p className="mt-2 text-xs text-pullim-slate-500">
        코드·링크·QR로 선생님 클래스에 참여하는 기능을 준비하고 있어요.
      </p>
    </section>
  );
}
