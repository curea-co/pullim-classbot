'use client';

import Link from 'next/link';
import { Compass, Sparkles, MessagesSquare, ListChecks, Gauge } from 'lucide-react';

/**
 * 신규 사용자 환영 hero — 가치 제안 + "튜터 찾기" CTA.
 * 출시 첫 화면(빈 상태)의 진입점. 색: 홈은 color-palette 스캔 대상 → blue/slate/white 만.
 */
export function WelcomeHero({ name, hasTutors }: { name?: string; hasTutors: boolean }) {
  return (
    <section className="bg-pullim-blue-700 text-white relative overflow-hidden rounded-2xl p-5 shadow-pullim-sm">
      <div className="text-pullim-blue-100 inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
        <Sparkles className="h-3.5 w-3.5" /> 풀림 클래스봇
      </div>
      <h1 className="mt-1.5 text-2xl font-bold leading-tight">
        {name ? `${name}님, 환영해요` : '환영해요'}
      </h1>
      <p className="text-white/85 mt-1.5 text-sm leading-relaxed">
        공식 튜터를 골라 <strong className="text-white">개념 → 예제 → 퀴즈</strong>까지 내 속도로 학습해요.
      </p>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-white/80">
        <li className="inline-flex items-center gap-1">
          <MessagesSquare className="text-pullim-blue-200 h-3.5 w-3.5" /> 대화로 배우는 가이드 수업
        </li>
        <li className="inline-flex items-center gap-1">
          <ListChecks className="text-pullim-blue-200 h-3.5 w-3.5" /> 막히면 단계 힌트·오답 처방
        </li>
        <li className="inline-flex items-center gap-1">
          <Gauge className="text-pullim-blue-200 h-3.5 w-3.5" /> 내 속도로 자기주도
        </li>
      </ul>

      <Link
        href="/classbot/discover"
        className="bg-white text-pullim-blue-700 hover:bg-pullim-blue-50 mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors"
      >
        <Compass className="h-4 w-4" />
        {hasTutors ? '튜터 더 찾기' : '튜터 찾기'}
      </Link>
    </section>
  );
}
