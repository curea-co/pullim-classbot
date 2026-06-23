'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getOfficialTutor } from '@/lib/mock/classbot-official';
import { useSelfLearningStore } from '@/lib/store/self-learning';
import { botSignature } from '@/lib/tokens/bot-signature';
import BackLink from '@/components/classbot/back-link';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { EmptyState } from '@/components/classbot/empty-state';
import { CurriculumUnitCard } from '@/components/classbot/curriculum-unit-card';

export default function LearnPage() {
  const { tutorId } = useParams<{ tutorId: string }>();
  const tutor = getOfficialTutor(tutorId);

  const recordStudyToday = useSelfLearningStore((s) => s.recordStudyToday);
  useEffect(() => {
    recordStudyToday();
  }, [recordStudyToday]);

  if (!tutor) {
    return (
      <div className="px-4 py-10">
        <EmptyState
          title="튜터를 찾을 수 없어요"
          action={{ href: '/classbot', label: '홈으로' }}
        />
      </div>
    );
  }

  const sig = botSignature(tutor);

  return (
    <div className="space-y-6 px-4 py-6">
      <BackLink href="/classbot">홈으로</BackLink>

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
