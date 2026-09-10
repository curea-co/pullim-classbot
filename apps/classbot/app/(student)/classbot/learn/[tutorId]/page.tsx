'use client';

import { use } from 'react';
import { getOfficialTutor } from '@/lib/mock/classbot-official';
import { botSignature } from '@/lib/tokens/bot-signature';
import BackLink from '@/components/classbot/back-link';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { EmptyState } from '@/components/classbot/empty-state';
import { CurriculumUnitCard } from '@/components/classbot/curriculum-unit-card';

/**
 * mock 공식 튜터(`ot_*`)의 단원 목록 — **P5 까지 mock 위에서 그대로 돈다**
 * (`proc/spec/2026-06-23_classbot-dual-mode-design.md` 2026-09-09 개정 박스 §⑤ 대체표의 §3).
 *
 * ⚠ **여기서 「공부한 날」을 기록하지 않는다.** 종전에는 진입만으로 기록했는데, 그건 두 가지로
 * 틀렸다: ① **목록을 열어 본 것은 공부가 아니다.** ② 훅은 아래 `!tutor` 가드보다 먼저 도니
 * **없는 `tutorId` 로 들어와도** 한 칸이 쌓였다.
 *
 * 더 큰 이유는 경계다. 새 「공부한 날」은 **`class_bots.id` 기반 자기주도 기록**이고 #273 이
 * 그 배열을 **서버(`self_study_days`)로 백필**한다. 이 화면의 활동은 은퇴 예정인 mock
 * 카탈로그(`ot_*`)에서 오므로, 여기서 쌓으면 mock 에서 나온 날짜가 실제 자기주도 기록으로
 * 서버에 올라간다. `/learn/*` 을 새 기록에 잇는 일은 **P5 에서 카탈로그 전환과 함께** 한다.
 * 단원 진행(`unitProgress`)은 그대로 mock 슬라이스에 남는다 — 그 기록은 잃지 않는다.
 */
export default function LearnPage({ params }: { params: Promise<{ tutorId: string }> }) {
  const { tutorId } = use(params);
  const tutor = getOfficialTutor(tutorId);

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
