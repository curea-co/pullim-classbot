'use client';

import Link from 'next/link';
import { ClipboardCheck, ArrowRight } from 'lucide-react';
import { useRosterMe } from '@/lib/current-user';
import { useAssignmentStore } from '@/lib/store/assignments';
import { cn } from '@/lib/utils';

/**
 * 학생 홈 — 채점 완료 알림 카드 (F7 갭 해소).
 * 학생 본인 submission 중 5분 이내 기록만 표시.
 */
export function GradingNotificationCard() {
  const submissions = useAssignmentStore(s => s.submissions);
  // 명의 = 현재 사용자(해석기). solve 제출과 동일한 roster id 로 매칭.
  const myStudentId = useRosterMe().id;
  const recent = submissions
    .filter(s => s.studentId === myStudentId)
    .filter(s => Date.now() - new Date(s.submittedAt).getTime() < 5 * 60_000) // 최근 5분
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  if (recent.length === 0) return null;
  const latest = recent[0];

  return (
    <Link
      href={`/classbot/assignment/${latest.assignmentId}/result`}
      className="group bg-pullim-blue-50 hover:bg-pullim-blue-100 border-pullim-blue-200 flex items-center gap-3 rounded-2xl border p-3 transition-colors"
    >
      <span className="bg-pullim-blue-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
        <ClipboardCheck className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-pullim-blue-700 text-micro font-bold uppercase tracking-wider">
          채점 완료 {recent.length > 1 ? `${recent.length}건` : ''}
        </div>
        <div className="text-pullim-slate-900 text-sm font-bold">
          방금 푼 과제 결과 — {latest.scorePercent}점
        </div>
        <div className="text-pullim-blue-600 mt-0.5 text-2xs">
          {latest.scorePercent >= 80 ? '잘했어요!' : latest.scorePercent >= 60 ? '한 발 더!' : '천천히 다시 봐요'}
        </div>
      </div>
      <ArrowRight className="text-pullim-blue-500 group-hover:text-pullim-blue-700 h-4 w-4 shrink-0 transition-colors" />
    </Link>
  );
}
