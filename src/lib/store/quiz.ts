/**
 * 즉석 퀴즈 store — 교사가 발사한 퀴즈를 학생 라이브 화면에 즉시 반영.
 * v1 단계 client-side state. 새 퀴즈 발사 시 currentQuiz를 override.
 */

'use client';

import { create } from 'zustand';
import { currentQuiz as seedQuiz, type LiveQuiz } from '@/lib/mock';

type QuizStore = {
  active: LiveQuiz;
  launch: (q: Omit<LiveQuiz, 'id' | 'distribution' | 'responded' | 'total'>) => void;
};

export const useQuizStore = create<QuizStore>(set => ({
  active: seedQuiz,
  launch: q => set({
    active: {
      ...q,
      id: 'qz_' + Date.now(),
      distribution: [0, 0, 0, 0],
      responded: 0,
      total: 14,
    },
  }),
}));
