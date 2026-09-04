'use client';

import Link from 'next/link';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { JoinCodeForm } from '@/components/classbot/home/join-code-form';

/**
 * 교사수업 모드 신규 사용자 hero — "선생님이 이끄는 구조화된 수업".
 *
 * 참여 코드 입력은 `JoinCodeForm` 한 벌이 맡는다 — 실 API(`POST /api/enrollments`)가
 * 먼저고, 서버가 모르는 코드면 예전 데모 경로로 한 번 더 간다. 유효 코드면 홈이
 * 일반 교사수업 홈으로 전환된다(상위 page 가 참여 목록을 다시 읽는다).
 *
 * 이 hero 는 **참여가 하나도 없을 때만** 뜬다. 그래서 여기가 유일한 입구면 한 번
 * 참여한 뒤로는 코드를 넣을 곳이 사라진다 — 상시 입구는 `/classbot/classroom`
 * (내 수업방)이고, 아래 링크가 그리로 간다.
 * 권위 문서(`05_수업방` Step 6) 초대 채널은 코드·링크·QR — 현재 데모는 코드만 동작.
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
        <strong className="text-white">배정 과제</strong>를 받고 봇과 함께 풀 수 있어요.
      </p>

      <div className="mt-4">
        <JoinCodeForm tone="dark" />
      </div>

      <Link
        href="/classbot/classroom"
        aria-label="내 수업방 — 참여한 반 보기"
        className="mt-3 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-pullim-slate-300 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        내 수업방
        <ArrowRight className="h-3 w-3" />
      </Link>
    </section>
  );
}
