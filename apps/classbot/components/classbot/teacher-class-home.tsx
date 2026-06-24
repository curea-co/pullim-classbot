'use client';

import { ClipboardList } from 'lucide-react';
import { EmptyState } from '@/components/classbot/empty-state';
import { SectionHeading } from '@/components/shell/section-heading';
import { useCurrentUser } from '@/lib/current-user';
import { TeacherClassHero } from '@/components/classbot/home/teacher-class-hero';
import { ClassOnboarding } from '@/components/classbot/home/class-onboarding';

/**
 * 교사수업 모드 — 아직 어떤 클래스에도 참여하지 않은 사용자 홈.
 *
 * class 모드를 직접 선택했으나 교사 배정(`getMyBots()`)이 없는 상태에서만 렌더된다.
 * (교사 배정이 있으면 일반 학생 홈이 렌더되고, 미선택 신규 사용자는 self 기본값.)
 * 참여 전이므로 배정 과제·라이브는 비어 있다 — 전역 seed/라이브 상태를 읽지 않는다.
 */
export function TeacherClassHome() {
  const me = useCurrentUser();

  return (
    <div className="space-y-5">
      <TeacherClassHero name={me.isAuthenticated ? me.name : undefined} />

      <ClassOnboarding />

      <SectionHeading title="받은 과제" />
      <EmptyState
        icon={ClipboardList}
        title="아직 받은 과제가 없어요"
        description="선생님이 클래스에 초대하고 과제를 발송하면 여기에 표시됩니다."
      />
    </div>
  );
}
