/**
 * 교사 채점 확정 store — 확정이 화면 밖에 남는지, 두 확정 방식이 갈리는지 회귀.
 *
 * 이전 결함 3건을 못으로 박아 둔다:
 *  ① 확정이 로컬 useState 라 새로고침하면 사라짐
 *  ② 「그대로 승인」과 「수정 후 승인」이 같은 결과를 남김(구분 불가)
 *  ③ 채점 큐가 확정을 몰라 목록 상태가 그대로
 */

import { renderHook } from '@testing-library/react';
import {
  useGradingStore,
  useGradingDecision,
  useMergedGradingItems,
  mergeGradingItems,
  resolveGradingStatus,
} from '../grading';
import { gradingQueue, overriddenSample, type GradingItem } from '@/lib/mock';

/** gr_001 — 시드 status 'queue', AI 초안 17/20. */
const seed: GradingItem = gradingQueue[0];
const items: GradingItem[] = [...gradingQueue, overriddenSample];

/** 교사가 루브릭을 낮춰 잡은 상태 — 수정 후 승인 입력. */
const editedRubric = seed.rubric.map((r, i) => (i === 0 ? { ...r, score: r.score - 6 } : r));

beforeEach(() => {
  useGradingStore.setState({ decisions: {} });
  localStorage.clear();
});

describe('확정 방식 — 그대로 승인 vs 수정 후 승인', () => {
  it('그대로 승인은 kind=approved · 변경률 0 · AI 초안 값 그대로', () => {
    const decision = useGradingStore.getState().approve({
      itemId: seed.id,
      finalScore: seed.draftScore,
      maxScore: seed.maxScore,
      comment: seed.draftComment,
      rubric: seed.rubric,
    });
    expect(decision.kind).toBe('approved');
    expect(decision.overrideDelta).toBe(0);
    expect(decision.finalScore).toBe(seed.draftScore);
    expect(decision.comment).toBe(seed.draftComment);
    expect(decision.decidedAt).toEqual(expect.any(String));
    expect(useGradingStore.getState().decisions[seed.id]).toEqual(decision);
  });

  it('수정 후 승인은 kind=overridden · 교사가 고친 점수·의견·루브릭·변경률을 남긴다', () => {
    const decision = useGradingStore.getState().approveWithEdit({
      itemId: seed.id,
      finalScore: 14,
      maxScore: seed.maxScore,
      comment: '표기 오류가 한 번 더 있어 1점 더 뺐어요.',
      rubric: editedRubric,
      overrideDelta: 15,
    });
    expect(decision.kind).toBe('overridden');
    expect(decision.finalScore).toBe(14);
    expect(decision.comment).toBe('표기 오류가 한 번 더 있어 1점 더 뺐어요.');
    expect(decision.rubric).toEqual(editedRubric);
    expect(decision.overrideDelta).toBe(15);
  });

  it('② 같은 항목이라도 두 확정은 서로 다른 값을 남긴다', () => {
    const s = () => useGradingStore.getState();
    const plain = s().approve({
      itemId: seed.id,
      finalScore: seed.draftScore,
      maxScore: seed.maxScore,
      comment: seed.draftComment,
      rubric: seed.rubric,
    });
    const edited = s().approveWithEdit({
      itemId: 'gr_002',
      finalScore: 14,
      maxScore: seed.maxScore,
      comment: '교사 의견',
      rubric: editedRubric,
      overrideDelta: 15,
    });
    expect(plain.kind).not.toBe(edited.kind);
    expect(plain.comment).not.toBe(edited.comment);
    expect(plain.overrideDelta).not.toBe(edited.overrideDelta);
  });

  it('재확정은 덮어쓴다 (항목당 1건)', () => {
    const s = () => useGradingStore.getState();
    s().approveWithEdit({
      itemId: seed.id, finalScore: 14, maxScore: seed.maxScore,
      comment: '먼저', rubric: editedRubric, overrideDelta: 15,
    });
    s().approve({
      itemId: seed.id, finalScore: seed.draftScore, maxScore: seed.maxScore,
      comment: seed.draftComment, rubric: seed.rubric,
    });
    expect(Object.keys(s().decisions)).toEqual([seed.id]);
    expect(s().decisions[seed.id].kind).toBe('approved');
    expect(s().decisions[seed.id].overrideDelta).toBe(0);
  });
});

describe('① persist — 새로고침해도 확정이 남는다', () => {
  it('localStorage 에 쓰이고, 메모리를 비운 뒤 rehydrate 하면 복원된다', async () => {
    useGradingStore.getState().approveWithEdit({
      itemId: seed.id,
      finalScore: 14,
      maxScore: seed.maxScore,
      comment: '교사 의견',
      rubric: editedRubric,
      overrideDelta: 15,
    });

    const raw = localStorage.getItem('pullim-grading');
    expect(raw).toContain(seed.id);

    // 새로고침 재현 — 메모리 상태를 버리고(persist 가 빈 값을 다시 쓰므로 저장분을 되돌린 뒤)
    // localStorage 에서 복원한다.
    useGradingStore.setState({ decisions: {} });
    localStorage.setItem('pullim-grading', raw as string);
    await useGradingStore.persist.rehydrate();

    const restored = useGradingStore.getState().decisions[seed.id];
    expect(restored.kind).toBe('overridden');
    expect(restored.finalScore).toBe(14);
    expect(restored.comment).toBe('교사 의견');
    expect(restored.rubric).toEqual(editedRubric);
  });
});

describe('③ 채점 큐 반영 — 시드 status 위에 확정을 덮어쓴다', () => {
  it('확정 전에는 시드 그대로', () => {
    expect(mergeGradingItems(items, {})).toEqual(items);
    expect(resolveGradingStatus(seed, {})).toBe('queue');
  });

  it('그대로 승인 → approved, 수정 후 승인 → overridden 으로 목록 상태가 바뀐다', () => {
    const s = () => useGradingStore.getState();
    s().approve({
      itemId: seed.id, finalScore: seed.draftScore, maxScore: seed.maxScore,
      comment: seed.draftComment, rubric: seed.rubric,
    });
    s().approveWithEdit({
      itemId: 'gr_002', finalScore: 14, maxScore: 20,
      comment: '교사 의견', rubric: editedRubric, overrideDelta: 15,
    });

    const merged = mergeGradingItems(items, s().decisions);
    const byId = new Map(merged.map((i) => [i.id, i]));
    expect(byId.get(seed.id)?.status).toBe('approved');
    expect(byId.get('gr_002')?.status).toBe('overridden');
    expect(byId.get('gr_002')?.overrideDelta).toBe(15);
    // 확정 안 한 항목은 시드 그대로
    expect(byId.get('gr_003')?.status).toBe(items.find((i) => i.id === 'gr_003')?.status);
    // AI 초안 점수는 초안 그대로 (큐 행이 보여주는 값)
    expect(byId.get(seed.id)?.draftScore).toBe(seed.draftScore);
  });

  it('확정한 항목은 「대기」 필터에서 빠진다', () => {
    const before = mergeGradingItems(items, {}).filter((i) => i.status === 'queue');
    expect(before.map((i) => i.id)).toContain(seed.id);

    useGradingStore.getState().approve({
      itemId: seed.id, finalScore: seed.draftScore, maxScore: seed.maxScore,
      comment: seed.draftComment, rubric: seed.rubric,
    });
    const after = mergeGradingItems(items, useGradingStore.getState().decisions)
      .filter((i) => i.status === 'queue');
    expect(after.map((i) => i.id)).not.toContain(seed.id);
    expect(after).toHaveLength(before.length - 1);
  });

  it('useMergedGradingItems · useGradingDecision 이 스토어를 그대로 비춘다', () => {
    useGradingStore.getState().approveWithEdit({
      itemId: seed.id, finalScore: 14, maxScore: seed.maxScore,
      comment: '교사 의견', rubric: editedRubric, overrideDelta: 15,
    });
    const merged = renderHook(() => useMergedGradingItems(items)).result.current;
    expect(merged.find((i) => i.id === seed.id)?.status).toBe('overridden');
    expect(renderHook(() => useGradingDecision(seed.id)).result.current?.finalScore).toBe(14);
    expect(renderHook(() => useGradingDecision('gr_003')).result.current).toBeUndefined();
  });
});
