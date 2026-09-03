/**
 * 자기주도 학습 저장소 — 학생이 마켓에서 «담은 봇»과 «공부한 날».
 *
 * 담기는 **반 참여가 아니다.** 이 저장소에 행이 생겨도 `enrollments` 는 건드리지 않고,
 * 교사의 학생 수·학급 관제소·과제에는 아무 영향이 없다(자기주도 계약 §1).
 *
 * ## 화면은 이 파일을 직접 읽지 않는다
 * 소비 입구는 `hooks/api/self-bots.ts` 하나다. P3 에서 이 자리가 localStorage 에서
 * 서버로 바뀔 때 훅 내부만 갈아 끼우면 되도록, 컴포넌트에 zustand 를 노출하지 않는다.
 *
 * ## 지금 모양이 곧 나중 API 행 모양이다
 *  - `SelfBotRow` = 미래 `GET /api/self/bots` 한 행. P3 가 필드를 다시 매핑하지 않는다.
 *  - `studyDays` 의 한 칸 = 미래 `self_study_days` 한 행. **카운터가 아니라 날짜 배열**이라
 *    나중에 서버로 백필할 수 있다(카운터는 과거 달력을 복원할 수 없다).
 *  - 봇 id 는 마켓이 주는 **`class_bots.id`** 다. 은퇴하는 mock 카탈로그 id(`ot_*`)는
 *    이 파일에 없다 — `chat_messages.bot_id` 가 `class_bots` 를 FK 로 물기 때문에
 *    `ot_*` 봇과의 대화는 애초에 저장될 수 없었다.
 *
 * ## 아직 사용자별로 나누지 않은 것 — `goals` · `unitProgress`
 * 아래 P5 슬라이스는 은퇴 예정인 `ot_*` 커리큘럼(`/classbot/learn/*`) 전용이고,
 * 청사진에서 `self_goals` · `self_unit_progress` 테이블과 함께 **P5** 로 잡혀 있다.
 * 그때 mock 카탈로그와 같이 사라질 데이터라 지금 네임스페이스를 입히지 않는다.
 */
import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { useCurrentUserId } from '@/lib/current-user';
import { todayKey } from './today-key';

/** 미래 API 행 모양 그대로 — P3 가 필드를 다시 매핑하지 않게. */
export interface SelfBotRow {
  /** 마켓(`GET /api/marketplace/bots`)이 주는 **`class_bots.id`**. `ot_*` 아님. */
  botId: string;
  /** ISO 8601. */
  addedAt: string;
}

/** 연속 학습 — **저장하지 않고 `studyDays` 에서 읽을 때 계산한다**(`deriveStreak`). */
export type Streak = {
  count: number;
  lastStudyDate: string | null;
};

/** 사용자 한 명의 자기주도 기록. P3 에서 이 통 하나가 서버 응답으로 대체된다. */
export interface SelfUserRecord {
  /** 담은 봇 — 담은 순서(오래된 것 먼저). */
  bots: SelfBotRow[];
  /** 공부한 날 `'YYYY-MM-DD'` — 오름차순·중복 없음. P4 `self_study_days` 한 행 = 한 칸. */
  studyDays: string[];
}

/* ── P5 슬라이스 (ot_* 커리큘럼) ─────────────────────────────────────────── */

export type LearningGoal = {
  tutorId: string;
  unitId: string;
  addedAt: string;
};

export type LoopStep = 'concept' | 'practice' | 'check';

export type UnitProgress = {
  tutorId: string;
  unitId: string;
  concept: boolean;
  practice: boolean;
  check: boolean;
};

/* ── 순수 파생 ──────────────────────────────────────────────────────────── */

/** `'YYYY-MM-DD'` 하루 앞. UTC 산술이라 서머타임·표준시 이동에 흔들리지 않는다. */
function previousDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d) - 86_400_000);
  const mm = String(prev.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(prev.getUTCDate()).padStart(2, '0');
  return `${prev.getUTCFullYear()}-${mm}-${dd}`;
}

/** 저장 가능한 날짜 키인가 — 백필 대상이라 형식이 어긋난 값은 아예 받지 않는다. */
function isDayKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * 공부한 날 배열에서 연속일수를 **읽을 때** 계산한다.
 *
 * 마지막으로 공부한 날부터 거꾸로 하루씩 이어지는 구간의 길이다. 오늘을 기준으로 삼지
 * 않으므로 어제까지 5일 연속이면 오늘 아직 안 해도 5다(종전 카운터와 같은 의미).
 * @param studyDays - `'YYYY-MM-DD'` 배열(정렬 여부 무관)
 * @returns 연속일수와 마지막 학습일
 */
export function deriveStreak(studyDays: string[]): Streak {
  if (studyDays.length === 0) return { count: 0, lastStudyDate: null };
  // 쓰기 경로가 이미 정렬해 두지만, 읽기도 스스로 방어한다(손으로 넣은 값·백필 응답).
  const days = [...new Set(studyDays)].sort();
  const lastStudyDate = days[days.length - 1];
  let count = 1;
  let expected = previousDayKey(lastStudyDate);
  for (let i = days.length - 2; i >= 0; i--) {
    if (days[i] !== expected) break;
    count += 1;
    expected = previousDayKey(days[i]);
  }
  return { count, lastStudyDate };
}

/** 날짜 한 칸 추가 — 같은 날 두 번은 한 칸이고, 결과는 항상 오름차순이다. */
function withStudyDay(days: string[], date: string): string[] {
  if (!isDayKey(date) || days.includes(date)) return days;
  return [...days, date].sort();
}

const EMPTY_RECORD: SelfUserRecord = { bots: [], studyDays: [] };

/* ── 스토어 ─────────────────────────────────────────────────────────────── */

interface SelfLearningStore {
  /**
   * 사용자 id → 그 사용자의 기록.
   *
   * persist 의 `name` 은 스토어 생성 시점에 고정이라 사용자별 키를 쓸 수 없다. 그래서
   * 키 하나(`pullim-self-learning`) 안에서 **데이터를 사용자 id 로 나눈다.** 이게 없으면
   * 개발용 신원 전환만으로 서연의 기록이 민준의 화면에 그대로 뜬다.
   */
  byUser: Record<string, SelfUserRecord>;
  /** 봇 담기 — 이미 담았으면 아무 일도 하지 않는다(멱등). */
  addSelfBot: (userId: string, botId: string) => void;
  /** 담은 봇 빼기. */
  removeSelfBot: (userId: string, botId: string) => void;
  /** 공부한 날 기록 — 같은 날 여러 번 불러도 한 칸이다(멱등). */
  recordStudyDay: (userId: string, date?: string) => void;

  /* P5 슬라이스 — 위 머리주석 참조. 사용자별로 나누지 않는다. */
  goals: LearningGoal[];
  unitProgress: UnitProgress[];
  addGoal: (tutorId: string, unitId: string) => void;
  removeGoal: (tutorId: string, unitId: string) => void;
  completeStep: (tutorId: string, unitId: string, step: LoopStep) => void;
}

/** persist 에 실제로 내려앉는 필드만. */
type PersistedState = Pick<SelfLearningStore, 'byUser' | 'goals' | 'unitProgress'>;

/** 네임스페이스 이전(v0) 모양 — `migrate` 가 읽기만 하고 옮기지는 않는다. */
interface LegacyStateV0 {
  enrollments?: { tutorId: string; enrolledAt: string }[];
  streak?: { count: number; lastStudyDate: string | null };
  goals?: LearningGoal[];
  unitProgress?: UnitProgress[];
}

const PERSIST_VERSION = 1;

/** 한 사용자 통을 꺼내 갱신하는 helper — 없으면 빈 통에서 시작한다. */
function updateUser(
  byUser: Record<string, SelfUserRecord>,
  userId: string,
  patch: (record: SelfUserRecord) => SelfUserRecord,
): Record<string, SelfUserRecord> {
  const current = byUser[userId] ?? EMPTY_RECORD;
  const next = patch(current);
  if (next === current) return byUser;
  return { ...byUser, [userId]: next };
}

export const useSelfLearningStore = create<SelfLearningStore>()(
  persist(
    (set, get) => ({
      byUser: {},

      addSelfBot: (userId, botId) => {
        if (!userId || !botId) return;
        set((s) => ({
          byUser: updateUser(s.byUser, userId, (r) =>
            r.bots.some((b) => b.botId === botId)
              ? r
              : { ...r, bots: [...r.bots, { botId, addedAt: new Date().toISOString() }] },
          ),
        }));
      },

      removeSelfBot: (userId, botId) => {
        set((s) => ({
          byUser: updateUser(s.byUser, userId, (r) =>
            r.bots.some((b) => b.botId === botId)
              ? { ...r, bots: r.bots.filter((b) => b.botId !== botId) }
              : r,
          ),
        }));
      },

      recordStudyDay: (userId, date) => {
        if (!userId) return;
        // 기본값은 이 리포가 이미 쓰는 "오늘"(`today-key.ts`, 로컬 자정 기준)을 그대로 쓴다.
        // 두 번째 "오늘" 개념을 만들지 않기 위한 것 — 사용자가 한국에 있으므로 로컬 = KST 다.
        const day = date ?? todayKey();
        set((s) => ({
          byUser: updateUser(s.byUser, userId, (r) => {
            const studyDays = withStudyDay(r.studyDays, day);
            return studyDays === r.studyDays ? r : { ...r, studyDays };
          }),
        }));
      },

      /* ── P5 슬라이스 ─────────────────────────────────────────────────── */

      goals: [],
      unitProgress: [],

      addGoal: (tutorId, unitId) => {
        const already = get().goals.some(
          (g) => g.tutorId === tutorId && g.unitId === unitId,
        );
        if (already) return;
        set((s) => ({
          goals: [...s.goals, { tutorId, unitId, addedAt: new Date().toISOString() }],
        }));
      },

      removeGoal: (tutorId, unitId) => {
        set((s) => ({
          goals: s.goals.filter(
            (g) => !(g.tutorId === tutorId && g.unitId === unitId),
          ),
        }));
      },

      // 종전에는 'check' 완료가 여기서 몰래 연속일수를 올렸다. 이제 공부한 날 기록은
      // 사용자 명의가 필요해(위 `byUser`) 화면이 `useRecordSelfStudyDay()` 로 직접 부른다.
      completeStep: (tutorId, unitId, step) => {
        set((s) => {
          const existing = s.unitProgress.find(
            (p) => p.tutorId === tutorId && p.unitId === unitId,
          );
          const updated: UnitProgress = existing
            ? { ...existing, [step]: true }
            : { tutorId, unitId, concept: false, practice: false, check: false, [step]: true };
          const unitProgress = existing
            ? s.unitProgress.map((p) =>
                p.tutorId === tutorId && p.unitId === unitId ? updated : p,
              )
            : [...s.unitProgress, updated];
          return { unitProgress };
        });
      },
    }),
    {
      name: 'pullim-self-learning',
      version: PERSIST_VERSION,
      partialize: (s): PersistedState => ({
        byUser: s.byUser,
        goals: s.goals,
        unitProgress: s.unitProgress,
      }),
      /**
       * v0 → v1: **네임스페이스 이전의 담기·연속학습 기록은 버린다.**
       *
       * 사용자 데이터를 말없이 지우는 일이라 근거를 셋 다 적어 둔다. 셋 모두
       * 「옮길 수 있는데 안 옮긴다」가 아니라 **옮길 정보가 없다**는 뜻이다:
       *
       *  ① `enrollments[].tutorId` 는 은퇴하는 mock 카탈로그 id(`ot_*`)다. v1 이 요구하는
       *     `class_bots.id` 로 번역할 대응표가 없고, `chat_messages.bot_id` 가 `class_bots` 를
       *     FK 로 물어 **그 봇과의 대화는 애초에 저장될 수 없었다** — 옮겨 봤자 말이 안 통하는
       *     봇을 담아 둔 상태가 된다.
       *  ② `streak` 는 `{count, lastStudyDate}` 카운터라 **어느 날 공부했는지 복원할 수 없다.**
       *     v1 이 요구하는 날짜 배열로 펼칠 정보가 그 안에 없다(마지막 하루뿐이다).
       *  ③ v0 는 전역 한 통이라 **그 기록이 누구 것인지 자체를 모른다.** 아무 사용자에게
       *     귀속시키면 남의 기록이 된다 — 이번 변경이 고치려는 바로 그 버그를 데이터로 굳힌다.
       *
       * `goals`·`unitProgress` 는 그대로 가져온다. `ot_*` 를 가리키는 건 같지만 그 카탈로그가
       * 아직 `/classbot/learn/*` 에서 살아 있어 지금도 해석되고, P5 에서 카탈로그와 함께 정리된다.
       */
      migrate: (persisted, version): PersistedState => {
        if (version >= PERSIST_VERSION) {
          return persisted as PersistedState;
        }
        const old = (persisted ?? {}) as LegacyStateV0;
        return {
          byUser: {},
          goals: old.goals ?? [],
          unitProgress: old.unitProgress ?? [],
        };
      },
    },
  ),
);

/* ── 파생 조회 (P5 슬라이스 전용) ───────────────────────────────────────────
 * 담은 봇·공부한 날의 소비 입구는 여기가 아니라 `hooks/api/self-bots.ts` 다.
 * ------------------------------------------------------------------------ */

export function useGoals(): LearningGoal[] {
  return useSelfLearningStore((s) => s.goals);
}

export function useIsGoal(tutorId: string, unitId: string): boolean {
  return useSelfLearningStore((s) =>
    s.goals.some((g) => g.tutorId === tutorId && g.unitId === unitId),
  );
}

export function useTutorGoals(tutorId: string): LearningGoal[] {
  const goals = useSelfLearningStore((s) => s.goals);
  return useMemo(() => goals.filter((g) => g.tutorId === tutorId), [goals, tutorId]);
}

export function useUnitProgress(tutorId: string, unitId: string): UnitProgress {
  const unitProgress = useSelfLearningStore((s) => s.unitProgress);
  return useMemo(
    () =>
      unitProgress.find((p) => p.tutorId === tutorId && p.unitId === unitId) ?? {
        tutorId,
        unitId,
        concept: false,
        practice: false,
        check: false,
      },
    [unitProgress, tutorId, unitId],
  );
}

export function useIsUnitDone(tutorId: string, unitId: string): boolean {
  return useSelfLearningStore(
    (s) =>
      s.unitProgress.find((p) => p.tutorId === tutorId && p.unitId === unitId)?.check ??
      false,
  );
}

/**
 * 현재 사용자의 연속 학습 — 셸 헤더 뱃지(`components/shell/app-header.tsx`)가 읽는다.
 *
 * 새 화면은 `useSelfStreak()`(`hooks/api/self-bots.ts`)를 쓴다. 이 이름은 셸이 이미
 * 부르고 있어 남겨 둔 것이고, 값은 같은 곳(`studyDays`)에서 같은 방식으로 계산한다.
 * @returns 연속일수와 마지막 학습일
 */
export function useStreak(): Streak {
  const userId = useCurrentUserId();
  const studyDays = useSelfLearningStore(
    (s) => s.byUser[userId]?.studyDays ?? EMPTY_RECORD.studyDays,
  );
  return useMemo(() => deriveStreak(studyDays), [studyDays]);
}
