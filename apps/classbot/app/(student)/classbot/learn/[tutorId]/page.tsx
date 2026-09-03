'use client';

import { use, useEffect } from 'react';
import { getOfficialTutor } from '@/lib/mock/classbot-official';
import { useRecordSelfStudyDay } from '@/hooks/api/self-bots';
import { botSignature } from '@/lib/tokens/bot-signature';
import BackLink from '@/components/classbot/back-link';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { EmptyState } from '@/components/classbot/empty-state';
import { CurriculumUnitCard } from '@/components/classbot/curriculum-unit-card';

export default function LearnPage({ params }: { params: Promise<{ tutorId: string }> }) {
  const { tutorId } = use(params);
  const tutor = getOfficialTutor(tutorId);

  // 공부한 날은 이제 사용자 명의로 쌓인다 — 스토어를 직접 부르지 않고 훅을 거친다.
  const { mutate: recordStudyDay } = useRecordSelfStudyDay();
  useEffect(() => {
    recordStudyDay();
  }, [recordStudyDay]);

  if (!tutor) {
    return (
      <div className="px-4 py-10">
        <EmptyState
          title="봇을 찾을 수 없어요"
          action={{ href: '/classbot', label: '홈', ariaLabel: '클래스봇 홈으로 가기' }}
        />
      </div>
    );
  }

  const sig = botSignature(tutor);

  return (
    <div className="space-y-6 px-4 py-6">
      <BackLink href="/classbot">클래스봇 홈</BackLink>

      <PageHeader
        eyebrow={{ text: tutor.subject }}
        title={tutor.name}
        description={tutor.tagline}
        action={
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: sig.hex }}
            aria-hidden="true"
          />
        }
      />

      <SectionHeading title="커리큘럼" />

      <div className="space-y-4">
        {tutor.curriculum.map((u) => (
          <CurriculumUnitCard key={u.id} tutorId={tutor.id} unit={u} />
        ))}
      </div>
    </div>
  );
}
