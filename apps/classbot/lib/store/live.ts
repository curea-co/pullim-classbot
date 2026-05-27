/**
 * 라이브 채널 lifecycle store.
 *
 * 정책:
 *  - 교사가 "라이브 시작" → activeBotIds에 botId 추가 + startedAt 기록
 *  - 학생은 activeBotIds에 있는 봇만 라이브 진입 가능
 *  - 교사 "라이브 종료" → activeBotIds에서 제거 + replayStore에 processing 인스턴스 생성
 *  - localStorage persist — 새로고침 후에도 라이브 상태 유지
 *  - 시뮬레이션: bot.isLive(mock static)는 "seed 라이브 봇" 의미. liveStore가 실제 진행 truth.
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ActiveSession = {
  botId: string;
  /** ISO 시각 — 시작 후 경과시간으로 transcript cursor 계산 */
  startedAt: string;
  /** 슬라이드 번호 — 교사가 다음/이전으로 진행 */
  currentSlide: number;
  /** 라이브 동안 학생이 보낸 질문 큐 (모더레이션 대기) */
  pendingQuestions: PendingQuestion[];
};

export type PendingQuestion = {
  id: string;
  studentName: string;
  text: string;
  /** 'pending' = 학생 측 대기, 'shared' = 교사가 전체 공유, 'hidden' = 교사가 비공개 처리 */
  status: 'pending' | 'shared' | 'hidden';
  submittedAt: string;
};

type LiveStore = {
  active: Record<string, ActiveSession>;
  start: (botId: string) => void;
  end: (botId: string) => { endedSession: ActiveSession; pendingReplayId: string } | null;
  advanceSlide: (botId: string, delta: number) => void;
  submitQuestion: (botId: string, studentName: string, text: string) => string;
  moderateQuestion: (botId: string, questionId: string, decision: 'shared' | 'hidden') => void;
  isActive: (botId: string) => boolean;
  getSession: (botId: string) => ActiveSession | undefined;
};

function genQid() {
  return 'lq_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export const useLiveStore = create<LiveStore>()(
  persist(
    (set, get) => ({
      // 초기 seed — cb_001 라이브 운영 중 (기존 mock과 호환)
      active: {
        cb_001: {
          botId: 'cb_001',
          startedAt: new Date(Date.now() - 5 * 60_000).toISOString(), // 5분 전 시작
          currentSlide: 12,
          pendingQuestions: [],
        },
      },
      start: botId => {
        set(state => ({
          active: {
            ...state.active,
            [botId]: {
              botId,
              startedAt: new Date().toISOString(),
              currentSlide: 1,
              pendingQuestions: [],
            },
          },
        }));
      },
      end: botId => {
        const session = get().active[botId];
        if (!session) return null;
        const pendingReplayId = 'rp_' + Date.now().toString(36);
        set(state => {
          const next = { ...state.active };
          delete next[botId];
          return { active: next };
        });
        return { endedSession: session, pendingReplayId };
      },
      advanceSlide: (botId, delta) => {
        set(state => {
          const s = state.active[botId];
          if (!s) return state;
          return {
            active: { ...state.active, [botId]: { ...s, currentSlide: Math.max(1, s.currentSlide + delta) } },
          };
        });
      },
      submitQuestion: (botId, studentName, text) => {
        const id = genQid();
        set(state => {
          const s = state.active[botId];
          if (!s) return state;
          const q: PendingQuestion = {
            id,
            studentName,
            text,
            status: 'pending',
            submittedAt: new Date().toISOString(),
          };
          return {
            active: { ...state.active, [botId]: { ...s, pendingQuestions: [q, ...s.pendingQuestions] } },
          };
        });
        return id;
      },
      moderateQuestion: (botId, questionId, decision) => {
        set(state => {
          const s = state.active[botId];
          if (!s) return state;
          return {
            active: {
              ...state.active,
              [botId]: {
                ...s,
                pendingQuestions: s.pendingQuestions.map(q =>
                  q.id === questionId ? { ...q, status: decision } : q,
                ),
              },
            },
          };
        });
      },
      isActive: botId => Boolean(get().active[botId]),
      getSession: botId => get().active[botId],
    }),
    { name: 'pullim-live-sessions' },
  ),
);
