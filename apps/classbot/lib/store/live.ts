/**
 * 라이브 채널 lifecycle store.
 *
 * 정책:
 *  - 교사가 "라이브 시작" → activeBotIds에 botId 추가 + startedAt 기록
 *  - 학생은 activeBotIds에 있는 봇만 라이브 진입 가능
 *  - 교사 "라이브 종료" → activeBotIds에서 제거 + replayStore에 processing 인스턴스 생성
 *  - localStorage persist — 새로고침 후에도 라이브 상태 유지
 *  - 시뮬레이션: bot.isLive(mock static)는 "seed 라이브 봇" 의미. liveStore가 실제 진행 truth.
 *
 * ⛔ **사람 이름을 여기 담지 않는다.** 이 store 는 통째로 localStorage 에 적히고 **로그아웃해도
 * 남는다** — 학교 공용 PC 라면 다음 사람이 그대로 읽는다. 세션 이름(`AuthUser.name`)은
 * 본인-조회 한정 PII 라(권위: pullim-api `me-response.dto.ts` — 「KCB 실명 … 본인-조회 한정 ·
 * 로그/토큰 금지」) 디스크에 닿으면 안 된다. 그래서 질문은 **`studentId` 로 담고 이름은 그릴 때
 * 붙인다** — 학생 본인 화면은 자기 세션에서, 교사 화면은 id 라벨에서(아래 `PendingQuestion` 주석).
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
  /**
   * 질문한 학생의 **신원 id**(OS 세션 sub 또는 개발용 신원 id) — **이름이 아니다.**
   *
   * 종전에는 여기에 표시 이름이 들어갔고, 그 값이 그대로 localStorage 에 적혀 로그아웃 뒤에도
   * 남았다. 이 store 가 디스크에 닿는 자리라 이름을 담지 않는다(위 ⛔).
   *  - **학생 본인 화면**은 이 id 로 자기 질문만 걸러 내고, 이름은 자기 세션에서 그때그때 읽는다.
   *  - **교사 화면**은 이 id 로 라벨을 만든다(`lib/risk-signals.ts` 의 `memberLabel` — `학생 <앞 8자>`).
   *    진짜 이름을 붙이려면 반 명단(`GET /classbot/classes/:id/members` 의 `displayName`)을
   *    읽어야 하고, 그건 이 store 가 아니라 서버가 댈 값이다.
   */
  studentId: string;
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
  submitQuestion: (botId: string, studentId: string, text: string) => string;
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
      // 출시: 데모 라이브 시드 제거 — 신규 사용자는 진행 중 라이브 없음.
      // 교사가 실제로 라이브를 시작(start)하면 채워진다.
      active: {},
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
      submitQuestion: (botId, studentId, text) => {
        const id = genQid();
        set(state => {
          const s = state.active[botId];
          if (!s) return state;
          const q: PendingQuestion = {
            id,
            studentId,
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
    {
      name: 'pullim-live-sessions',
      // v0 → v1: 질문 줄이 이름(`studentName`)을 들고 있던 판. 그 줄들은 **버린다** —
      // ⑴ 디스크에 남아 있던 이름을 지우고, ⑵ 새 판이 읽을 `studentId` 가 그 줄엔 없다.
      // 질문 큐는 라이브 진행 중의 모더레이션 상태라 세션을 넘겨 보존할 값이 아니다.
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as { active?: Record<string, ActiveSession> } | undefined;
        if (version >= 1 || !state?.active) return state as LiveStore;
        const active: Record<string, ActiveSession> = {};
        for (const [botId, s] of Object.entries(state.active)) {
          active[botId] = { ...s, pendingQuestions: [] };
        }
        return { ...state, active } as LiveStore;
      },
    },
  ),
);
