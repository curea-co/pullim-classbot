'use client';

import { useState } from 'react';
import { GraduationCap, ClipboardList, Video, MessageCircle, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useClassEnrollmentStore } from '@/lib/store/class-enrollment';

/**
 * 교사수업 모드 신규 사용자 hero — "선생님이 이끄는 구조화된 수업".
 *
 * 참여 코드 입력 → `useClassEnrollmentStore.join()` (mock). 유효 코드면 enrollment가 생겨
 * 홈이 일반 교사수업 홈으로 전환된다(상위 page가 reactive). 알 수 없는 코드는 에러 토스트.
 * 권위 문서(`05_수업방` Step 6) 초대 채널은 코드·링크·QR — 현재 데모는 코드만 동작.
 */
export function TeacherClassHero({ name }: { name?: string }) {
  const [code, setCode] = useState('');
  const join = useClassEnrollmentStore((s) => s.join);

  const handleJoin = () => {
    if (!code.trim()) {
      toast.error('참여 코드를 입력해 주세요.');
      return;
    }
    const res = join(code);
    if (res.ok) {
      toast.success(`${res.enrollment.assignedBy}의 ${res.enrollment.classroomLabel}에 참여했어요!`);
      setCode('');
    } else {
      toast.error(res.error);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl bg-pullim-slate-900 p-5 text-white shadow-pullim-sm">
      {/* 데코 — 라이팅/입시 코치 Hero 와 통일한 CSS 3D 부유 카드(의존성 0, 장식용이라 aria-hidden).
          blue/slate 토큰만 사용, motion-safe 로만 애니메이트. 텍스트가 항상 위(z-10)에 오도록 z-0. */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-4 top-4 z-0 hidden lg:block [perspective:1200px]"
      >
        <div className="relative h-36 w-40 [transform-style:preserve-3d]">
          {/* 뒤 — 과제 카드 */}
          <div className="absolute right-6 top-1 h-20 w-28 rounded-xl border border-pullim-slate-700 bg-pullim-slate-800 p-2.5 shadow-pullim-md [transform:rotateY(-16deg)_rotateX(7deg)_translateZ(-44px)] motion-safe:animate-[pullim-hero-float-a_8s_ease-in-out_infinite]">
            <div className="h-1.5 w-8 rounded-full bg-pullim-slate-600" />
            <div className="mt-2 h-1.5 w-16 rounded-full bg-pullim-slate-700" />
            <div className="mt-1.5 h-1.5 w-12 rounded-full bg-pullim-slate-700" />
          </div>
          {/* 중간 — 라이브 카드(블루 액센트 바) */}
          <div className="absolute right-2 top-6 h-20 w-28 rounded-xl border border-pullim-slate-700 bg-pullim-slate-800 p-2.5 shadow-pullim-md [transform:rotateY(-8deg)_rotateX(4deg)] motion-safe:animate-[pullim-hero-float-b_6500ms_ease-in-out_infinite]">
            <div className="h-1.5 w-10 rounded-full bg-pullim-blue-500" />
            <div className="mt-2 h-1.5 w-16 rounded-full bg-pullim-slate-700" />
            <div className="mt-1.5 h-1.5 w-14 rounded-full bg-pullim-slate-700" />
          </div>
          {/* 앞 — 진행률 카드(블루) */}
          <div className="absolute right-0 top-14 h-16 w-24 rounded-xl border border-pullim-blue-500 bg-pullim-blue-600 p-2.5 shadow-pullim-md [transform:rotateY(-2deg)_rotateX(2deg)_translateZ(40px)] motion-safe:animate-[pullim-hero-float-c_7500ms_ease-in-out_infinite]">
            <div className="h-1.5 w-12 rounded-full bg-pullim-blue-100" />
            <div className="mt-2 flex items-center gap-1.5">
              <div className="h-3.5 w-3.5 rounded-full bg-white" />
              <div className="h-1.5 w-9 rounded-full bg-pullim-blue-300" />
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10">
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

      {/* 참여 코드 입력 — 유효 코드: MATH-2024 / ENG-2024 / SCI-2024 (데모) */}
      <div className="mt-4 flex items-center gap-2">
        <div className="relative flex-1">
          <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pullim-slate-500" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            placeholder="참여 코드 입력 (예: MATH-2024)"
            aria-label="참여 코드 입력"
            maxLength={12}
            className="w-full rounded-xl border border-pullim-slate-700 bg-pullim-slate-800 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-pullim-slate-500 focus:border-pullim-slate-500 focus:outline-none focus:ring-2 focus:ring-pullim-slate-500/30"
          />
        </div>
        <button
          type="button"
          onClick={handleJoin}
          className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-pullim-slate-900 transition-colors hover:bg-pullim-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          참여하기
        </button>
      </div>
      <p className="mt-2 text-xs text-pullim-slate-500">
        선생님께 받은 참여 코드를 입력하면 클래스에 연결돼요.
      </p>
      </div>
    </section>
  );
}
