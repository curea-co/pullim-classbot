'use client';

import { Compass, Sparkles } from 'lucide-react';
import { SectionHeading } from '@/components/shell/section-heading';
import { EmptyState } from '@/components/classbot/empty-state';
import { useEnrolledTutors } from '@/lib/store/self-learning';
import { MyTutorCard } from '@/components/classbot/my-tutor-card';

/** 자기주도 모드 홈 — PR1 스캐폴드. 목표/진도는 PR3 에서 채운다. */
export function SelfHomePlaceholder() {
  const tutors = useEnrolledTutors();

  return (
    <div className="space-y-4">
      <section className="bg-pullim-blue-700 text-white relative overflow-hidden rounded-2xl p-4 shadow-pullim-sm">
        <div className="text-pullim-blue-100 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="h-3 w-3" /> 자기주도 학습
        </div>
        <h2 className="mt-1 text-xl font-bold">내 속도로, 내 목표로</h2>
        <p className="text-white/80 mt-1 text-sm">공식 튜터를 골라 개념부터 점검까지 스스로 학습해요.</p>
      </section>
      <SectionHeading title="내 튜터" />
      {tutors.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="아직 등록한 튜터가 없어요"
          description="봇 마켓에서 과목 튜터를 골라 학습을 시작해 보세요."
          action={{ href: '/classbot/discover', label: '봇 마켓 둘러보기' }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tutors.map((t) => (
            <MyTutorCard key={t.id} tutor={t} />
          ))}
        </div>
      )}
    </div>
  );
}
