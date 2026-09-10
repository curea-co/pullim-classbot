'use client';

import { ClipboardList } from 'lucide-react';
import { EmptyState } from '@/components/classbot/empty-state';
import { SectionHeading } from '@/components/shell/section-heading';
import { useCurrentUser } from '@/lib/current-user';
import { TeacherClassHero } from '@/components/classbot/home/teacher-class-hero';
import { ClassOnboarding } from '@/components/classbot/home/class-onboarding';
import { TutorShowcase } from '@/components/classbot/home/tutor-showcase';
import type { StudentBotSlot } from '@/lib/store/mode-bots';

/**
 * 참여한 반이 **0곳**일 때의 학생 홈 — 참여 코드 hero 가 머리에 선다.
 *
 * 「반이 0곳이면 참여 코드 hero」는 개정 뒤에도 그대로다
 * (`proc/spec/2026-06-23_classbot-dual-mode-design.md` 2026-09-09 개정 박스 ① 의 표).
 * 학습 모드로 갈리던 시절의 「class 모드를 직접 선택했을 때만」이라는 조건은 사라졌다 —
 * 모드가 없으므로 **반 0곳** 하나가 기준이다.
 *
 * **다만 막다른 길로 두지 않는다.** 마켓에서 담은 봇이 있으면 그 봇들을 여기서도 보여 준다 —
 * 담기는 반 참여가 아니라서(계약 §1) 이 화면이 그대로 뜨는데, 그때 담은 봇이 홈 어디에도
 * 없으면 학생은 자기가 고른 봇을 홈에서 잃는다. 잠긴 결정 3(「standalone-capable」)이
 * 선생님 없는 학생도 혼자 쓸 수 있어야 한다고 못 박은 자리다.
 * @param selfBots - 마켓에서 담은 봇 슬롯(없으면 그 칸을 그리지 않는다)
 * @param activeLive - 라이브 중인 봇 id 집합
 */
export function TeacherClassHome({
  selfBots = [],
  activeLive = {},
}: {
  selfBots?: StudentBotSlot[];
  /** 값의 존재만 본다 — `TutorShowcase` 와 같은 계약(`Record<string, unknown>`). */
  activeLive?: Record<string, unknown>;
}) {
  const me = useCurrentUser();

  return (
    <div className="space-y-5">
      <TeacherClassHero name={me.isAuthenticated ? me.name : undefined} />

      {selfBots.length > 0 && <TutorShowcase bots={selfBots} activeLive={activeLive} />}

      <ClassOnboarding />

      <SectionHeading title="받은 과제" />
      <EmptyState
        icon={ClipboardList}
        title="아직 받은 과제가 없어요"
        description="선생님이 클래스에 초대하고 과제를 내면 여기에 표시돼요."
      />
    </div>
  );
}
