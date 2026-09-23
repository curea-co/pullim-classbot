import { AlertCircle, Sparkles, Target } from 'lucide-react';

import { assignmentModeBadge } from '@/lib/tokens/assignment-state';

/** 목록 화면이 공유하는 과제 모드 시각 메타. Next page 모듈에는 임의 named export를 두지 않는다. */
export const assignmentModeMeta = {
  practice: { ...assignmentModeBadge.practice, color: assignmentModeBadge.practice.bg, icon: Target },
  exam: { ...assignmentModeBadge.exam, color: assignmentModeBadge.exam.bg, icon: AlertCircle },
  'wrong-conquest': {
    ...assignmentModeBadge['wrong-conquest'],
    color: assignmentModeBadge['wrong-conquest'].bg,
    icon: Sparkles,
  },
} as const;
