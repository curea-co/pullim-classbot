/**
 * 수업 액션 store — "학습을 모두 챗봇에 녹인다" 방향의 핵심.
 *
 * 인라인 학습 런처 / 우측 레일(챗과 분리된 트리) / 챗 버블 어디서든
 * dispatch 하면, 현재 봇의 ChatPanel 이 이를 소비해 대화에 메시지를 주입한다.
 * 페이지 이동·모달 없이 모든 학습 동작이 챗 안에서 이어지게 한다.
 */

'use client';

import { create } from 'zustand';

export type LessonActionType =
  | 'concept'         // 개념 요약 카드 주입
  | 'concept-detail'  // 개념 상세(팁·핵심요소·예제) 주입
  | 'example'         // 예제 단계 주입
  | 'quiz'            // 인라인 퀴즈 주입
  | 'self-explain'    // 자기설명 프롬프트 주입(B4)
  | 'next';           // 다음 개념

export interface LessonRequest {
  botId: string;
  type: LessonActionType;
  /** concept/concept-detail 대상 개념 id (없으면 현재 개념) */
  conceptId?: string;
  /** 같은 액션 반복 트리거 식별 */
  nonce: number;
}

interface LessonActionState {
  request: LessonRequest | null;
  dispatch: (botId: string, type: LessonActionType, conceptId?: string) => void;
  clear: () => void;
}

let counter = 0;

export const useLessonActionStore = create<LessonActionState>(set => ({
  request: null,
  dispatch: (botId, type, conceptId) =>
    set({ request: { botId, type, conceptId, nonce: ++counter } }),
  clear: () => set({ request: null }),
}));
