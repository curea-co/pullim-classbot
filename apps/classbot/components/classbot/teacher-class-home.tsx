'use client';

import { ClipboardList } from 'lucide-react';
import { EmptyState } from '@/components/classbot/empty-state';
import { SectionHeading } from '@/components/shell/section-heading';
import { useCurrentUser } from '@/lib/current-user';
import { useMergedAssignments } from '@/lib/store/assignments';
import { useLiveStore } from '@/lib/store/live';
import { useRosterMe } from '@/lib/current-user';
import { TeacherClassHero } from '@/components/classbot/home/teacher-class-hero';
import { ClassOnboarding } from '@/components/classbot/home/class-onboarding';

/**
 * 교사수업 모드 — 교사 배정 없는 신규 사용자 홈.
 * 참여 코드 입력 + 배정 대기 안내 + 교사수업 시작 가이드.
 */
export function TeacherClassHome() {
  const me = useCurrentUser();
  const roster = useRosterMe();
  const activeLive = useLiveStore((s) => s.active);
  const assignments = useMergedAssignments(roster.id);

  const hasCode = false; // 참여 코드 미입력(신규)
  const hasAssignment = assignments.length > 0;
  const hasLive = Object.keys(activeLive).length > 0;

  return (
    <div className="space-y-5">
      <TeacherClassHero name={me.isAuthenticated ? me.name : undefined} />

      <ClassOnboarding
        hasCode={hasCode}
        hasAssignment={hasAssignment}
        hasLive={hasLive}
      />

      <SectionHeading title="받은 과제" />
      {assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="아직 받은 과제가 없어요"
          description="선생님이 클래스를 배정하고 과제를 발송하면 여기에 표시됩니다."
        />
      ) : (
        <ul className="space-y-2">
          {assignments.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-pullim-slate-200 bg-white p-3 shadow-pullim-xs"
            >
              <ClipboardList className="h-5 w-5 shrink-0 text-pullim-blue-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-pullim-slate-900">{a.title}</p>
                <p className="text-xs text-pullim-slate-400">{a.dDay}</p>
              </div>
              <a
                href={`/classbot/assignment/${a.id}`}
                className="shrink-0 rounded-lg bg-pullim-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-pullim-blue-700"
              >
                풀기
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
