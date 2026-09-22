'use client';

/**
 * 자기주도 학습의 로컬 저장소.
 *
 * ADR-094 이후 로그인 사용자의 담은 봇 정본은 pullim-api가 만든 `isSelfStudy` 교실이다.
 * 비로그인 데모만 `bots`를 이 저장소에서 읽고 쓴다. 공부한 날은 아직 도메인 API 계약이
 * 없으므로 로그인 여부와 무관하게 이 저장소를 명시적 임시 소스로 쓴다.
 *
 * 화면의 진입점은 `hooks/api/self-bots.ts` 하나다. 그 훅이 OS 세션이면 도메인 API,
 * 공개 데모면 로컬 담기, 공부한 날이면 항상 로컬로 분기한다. 과거 same-origin 이관을 위해
 * 남은 완료 표시와 복구용 v0 원본은 저장 호환성 때문에 유지하지만 새 서버 호출의 근거로 쓰지 않는다.
 *
 * `goals`와 `unitProgress`는 별도 mock 학습(`/classbot/learn/*`)의 로컬 상태다.
 */
import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { useCurrentUserId } from '@/lib/current-user';
import { useServerIdentityState } from '@/hooks/api/self-server';
import { useStoresHydrated } from './use-hydrated';
import { todayKey } from './today-key';

/** 화면이 공통으로 쓰는 담은 봇 한 행. 서버 자습방이면 `classId`도 함께 온다. */
export interface SelfBotRow {
  /** 마켓(`GET /api/marketplace/bots`)이 주는 **`class_bots.id`**. `ot_*` 아님. */
  botId: string;
  /** ADR-094 자습방 id. 정본 카드에서 온 행에만 있고 로컬 데모 행에는 없다. */
  classId?: string;
  /** ISO 8601. */
  addedAt: string;
}

/** 연속 학습 — **저장하지 않고 `studyDays` 에서 읽을 때 계산한다**(`deriveStreak`). */
export type Streak = {
  count: number;
  lastStudyDate: string | null;
};

/** 사용자 한 명의 자기주도 기록. */
export interface SelfUserRecord {
  /**
   * 담은 봇 — 담은 순서(오래된 것 먼저).
   *
   * 읽고 쓰는 곳은 **비로그인 데모 하나뿐**이다. OS 로그인 사용자의 정본은
   * pullim-api의 `isSelfStudy` 교실이라 이 칸을 읽지 않는다.
   *
   * P4 가 **서버가 돌려준 행을 여기서 걷었다**(`dropUploadedBots`). 그래서 신원이 있는
   * 사람에게 남는 행의 뜻은 하나다 — **아직 서버가 모르는 행**(못 올라간 것).
   *
   * ⛔ 그래도 **통째로 비우지 마라** — 비로그인 데모의 통은 유일한 사본이다.
   * 무엇이 어느 쪽인지는 위 머리주석 표가 `botsMigratedUserIds` 로 가른다.
   */
  bots: SelfBotRow[];
  /**
   * 공부한 날 `'YYYY-MM-DD'` — 오름차순·중복 없음.
   * 아직 권위 도메인 API가 없어 로그인 여부와 무관하게 이 로컬 칸이 임시 소스다.
   */
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

/**
 * 저장 가능한 날짜 키인가 — 백필 대상이라 형식이 어긋난 값은 아예 받지 않는다.
 *
 * 형식만 보면 부족하다. `Date.parse('2026-02-30')` 은 NaN 이 아니라 **3월 2일로 정규화**되므로
 * 달력에 없는 날이 그대로 통과한다. 그 값은 이 저장소에 남았다가 연속일수 계산과 백필의
 * 입력이 되는데, 그 값을 그대로 서버에 올리면 `date` 컬럼이 거절하거나 다른 날로 앉는다.
 * 그래서 **UTC round-trip** 으로 판정한다 — 넣은 연·월·일이 그대로 돌아오는 값만 날짜다.
 * P4 에서 서버가 같은 판정을 받을 때 이 함수가 그 규칙의 정본이 된다.
 */
function isDayKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const at = new Date(Date.UTC(y, m - 1, d));
  return at.getUTCFullYear() === y && at.getUTCMonth() === m - 1 && at.getUTCDate() === d;
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
  /**
   * 봇 담기 — 이미 담았으면 아무 일도 하지 않는다(멱등).
   *
   * ⚠️ **비로그인 데모에서만 부른다.** OS 로그인 사용자의 담기는 도메인 서버로 가고
   * (`POST /classbot/me/self-bots`) 이 함수를 거치지 않는다. 부르는 곳은 `hooks/api/self-bots.ts`
   * 하나이고, 그 안에서 갈래를 정한다 — 화면이 직접 부르면 로그인한 사람의 담기가
   * 서버에 안 남는다.
   */
  addSelfBot: (userId: string, botId: string) => void;
  /** 담은 봇 빼기 — 위와 같이 **비로그인 데모 전용**이다. */
  removeSelfBot: (userId: string, botId: string) => void;
  /**
   * 담은 봇을 서버로 올리는 이관(계약 §4)을 마친 사용자 id.
   *
   * 「한 번만」의 그 한 번을 세는 자리다. 사용자별인 이유는 `byUser` 와 같다 —
   * 개발용 신원 전환으로 계정을 오가면 사람마다 따로 한 번씩 올라가야 한다.
   * localStorage 를 비우면 이 표시도 함께 사라지지만, 그때는 올릴 로컬 행도 같이
   * 사라진 뒤라 다시 훑어도 올릴 게 없다.
   */
  botsMigratedUserIds: string[];
  /** 이관 완료 표시 — 두 번 불러도 한 칸이다(멱등). */
  markBotsMigrated: (userId: string) => void;
  /**
   * 서버가 이미 아는 행을 이 사용자의 로컬 통에서 걷는다 (계약 §5 · P3 가 미룬 정리).
   *
   * ⛔ **이 함수는 판별을 하지 않는다 — 부르는 쪽이 한다.** 부르는 곳은
   * `hooks/api/self-bots.ts` 의 이관 훅 하나뿐이고, 거기서 **두 조건**을 다 확인한 뒤에만
   * 부른다:
   *  ① `botsMigratedUserIds` 에 이 id 가 있다 — 위 머리주석 표의 판별자. 없으면 그 통은
   *     **서버를 만난 적 없는 공개 데모의 유일한 사본**이라 한 줄도 지우면 안 된다.
   *  ② 그 행이 방금 받은 **서버 목록에 들어 있다** — 그래서 인자가 `serverBotIds` 다.
   *     「우리 요청이 201 을 받았다」로 지우지 마라. 서버가 자기 목록에 실어 주는 쪽이
   *     한 단계 강한 증거이고, 못 올라간 행(없는 봇 404 등)은 그대로 남아야 한다.
   *
   * 새 호출자를 만들지 마라. 만들어야 한다면 위 두 조건을 그쪽에서도 세운 뒤에 부른다.
   */
  dropUploadedBots: (userId: string, serverBotIds: string[]) => void;
  /** 공부한 날 기록 — 같은 날 여러 번 불러도 한 칸이다(멱등). */
  recordStudyDay: (userId: string, date?: string) => void;
  /**
   * 공부한 날 백필(계약 §4)을 마친 사용자 id — `botsMigratedUserIds` 와 같은 뜻·같은 규칙.
   *
   * 담은 봇과 따로 세는 이유: 두 이관은 서로 다른 단계에서 서로 다른 라우트로 나갔고,
   * 한쪽이 실패해도 다른 쪽은 끝났을 수 있다. 한 칸으로 합치면 그 상태를 적을 수 없다.
   */
  studyDaysBackfilledUserIds: string[];
  /** 백필 완료 표시 — 두 번 불러도 한 칸이다(멱등). */
  markStudyDaysBackfilled: (userId: string) => void;

  /**
   * v1 이 번역할 수 없었던 v0 원본 — **읽지 않지만 지우지도 않는다.**
   *
   * 화면은 이 칸을 보지 않는다. 여기 있는 이유는 하나다: 마이그레이션이 사용자 데이터를
   * **되돌릴 수 없게 덮어쓰지 않도록** 원본 바이트를 그대로 들고 있기 위해서다.
   * 옮길 대응표가 생기거나 복구 요청이 오면 이 칸이 그 입력이다(`migrate` 주석 참조).
   */
  legacyV0?: LegacyStateV0;

  /* P5 슬라이스 — 위 머리주석 참조. 사용자별로 나누지 않는다. */
  goals: LearningGoal[];
  unitProgress: UnitProgress[];
  addGoal: (tutorId: string, unitId: string) => void;
  removeGoal: (tutorId: string, unitId: string) => void;
  completeStep: (tutorId: string, unitId: string, step: LoopStep) => void;
}

/** persist 에 실제로 내려앉는 필드만. */
type PersistedState = Pick<
  SelfLearningStore,
  | 'byUser'
  | 'botsMigratedUserIds'
  | 'studyDaysBackfilledUserIds'
  | 'goals'
  | 'unitProgress'
  | 'legacyV0'
>;

/** 네임스페이스 이전(v0) 모양 — `migrate` 가 읽기만 하고 옮기지는 않는다. */
interface LegacyStateV0 {
  enrollments?: { tutorId: string; enrolledAt: string }[];
  streak?: { count: number; lastStudyDate: string | null };
  goals?: LearningGoal[];
  unitProgress?: UnitProgress[];
}

/** v0 원본에 남길 것이 있나 — 빈 통까지 들고 다니지 않는다. */
function keptLegacy(old: LegacyStateV0): LegacyStateV0 | undefined {
  const enrollments = old.enrollments ?? [];
  const streak = old.streak;
  if (enrollments.length === 0 && !streak) return undefined;
  return { ...(enrollments.length > 0 && { enrollments }), ...(streak && { streak }) };
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
      botsMigratedUserIds: [],
      studyDaysBackfilledUserIds: [],

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

      markBotsMigrated: (userId) => {
        if (!userId) return;
        set((s) =>
          s.botsMigratedUserIds.includes(userId)
            ? s
            : { botsMigratedUserIds: [...s.botsMigratedUserIds, userId] },
        );
      },

      dropUploadedBots: (userId, serverBotIds) => {
        if (!userId || serverBotIds.length === 0) return;
        const known = new Set(serverBotIds);
        const { byUser } = get();
        const next = updateUser(byUser, userId, (r) => {
          const bots = r.bots.filter((b) => !known.has(b.botId));
          return bots.length === r.bots.length ? r : { ...r, bots };
        });
        // 걷을 게 없으면 `set` 자체를 하지 않는다 — 서버 목록이 올 때마다 도는 자리라
        // 같은 값으로 스토어를 흔들면 persist 쓰기가 헛돈다.
        if (next === byUser) return;
        set({ byUser: next });
      },

      markStudyDaysBackfilled: (userId) => {
        if (!userId) return;
        set((s) =>
          s.studyDaysBackfilledUserIds.includes(userId)
            ? s
            : { studyDaysBackfilledUserIds: [...s.studyDaysBackfilledUserIds, userId] },
        );
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

      // 종전에는 'check' 완료가 여기서 몰래 연속일수를 올렸다. 이제 올리지 않는다 —
      // 이 슬라이스는 mock `ot_*` 커리큘럼 전용이고 P5 까지 그대로 도는데(개정 박스 §⑤ 의 §3),
      // 새 「공부한 날」은 `class_bots.id` 기반이라 #273 이 서버로 백필한다. 두 기록을 여기서
      // 이으면 mock 활동이 실제 자기주도 기록으로 올라간다. 단원 진행만 남긴다.
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
        botsMigratedUserIds: s.botsMigratedUserIds,
        studyDaysBackfilledUserIds: s.studyDaysBackfilledUserIds,
        goals: s.goals,
        unitProgress: s.unitProgress,
        // 원본을 계속 실어 보낸다 — 안 실으면 다음 쓰기에서 v0 바이트가 덮여 사라진다.
        ...(s.legacyV0 && { legacyV0: s.legacyV0 }),
      }),
      /**
       * v0 → v1: **네임스페이스 이전의 담기·연속학습 기록은 v1 목록으로 옮기지 않는다.
       * 다만 지우지도 않는다** — 원본은 `legacyV0` 에 그대로 남는다.
       *
       * 옮기지 않는 근거 셋. 셋 모두 「옮길 수 있는데 안 옮긴다」가 아니라
       * **옮길 정보가 없다**는 뜻이다:
       *
       *  ① `enrollments[].tutorId` 는 은퇴하는 mock 카탈로그 id(`ot_*`)다. v1 이 요구하는
       *     `class_bots.id` 로 번역할 대응표가 없고, 당시 `chat_messages.bot_id` 가 `class_bots`
       *     를 FK 로 물어 **그 봇과의 대화는 애초에 저장될 수 없었다** — 옮겨 봤자 말이 안 통하는
       *     봇을 담아 둔 상태가 된다. (그 표는 계획 PR 8 에서 걷혔다. 대응표가 없다는 근거는 그대로다.)
       *  ② `streak` 는 `{count, lastStudyDate}` 카운터라 **어느 날 공부했는지 복원할 수 없다.**
       *     v1 이 요구하는 날짜 배열로 펼칠 정보가 그 안에 없다(마지막 하루뿐이다).
       *  ③ v0 는 전역 한 통이라 **그 기록이 누구 것인지 자체를 모른다.** 아무 사용자에게
       *     귀속시키면 남의 기록이 된다 — 이번 변경이 고치려는 바로 그 버그를 데이터로 굳힌다.
       *
       * `goals`·`unitProgress` 는 그대로 가져온다. `ot_*` 를 가리키는 건 같지만 그 카탈로그가
       * 아직 `/classbot/learn/*` 에서 살아 있어 지금도 해석되고, P5 에서 카탈로그와 함께 정리된다.
       *
       * ⚠ **실제 v0 블롭은 여기로 오지 않는다.** zustand 5 는 저장값에 `version` 이 **숫자로
       * 있을 때만** `migrate` 를 부른다(`middleware.mjs`: `typeof …version === "number"`).
       * v0 는 그 필드 자체가 없어 곧장 `merge` 로 간다 — 그래서 v0 를 실제로 받는 자리는
       * 아래 `merge` 이고, 이 함수는 숫자 `version: 0` 이 찍힌 블롭만을 위한 자리다.
       * 두 경로가 **같은 답**을 내도록 둘 다 `keptLegacy()` 하나를 쓴다.
       *
       * **P4 는 버전을 올리지 않았다.** 새로 생긴 `studyDaysBackfilledUserIds` 는 없던 칸이라
       * persist 의 기본 병합(`{...초기값, ...저장값}`)이 초기값 `[]` 를 그대로 남긴다 —
       * 「아직 한 번도 백필 안 함」이라는 **맞는 뜻**이다. 담은 봇 정리도 마이그레이션이
       * 아니라 **서버 목록을 보고** 하므로(`dropUploadedBots`) 여기서 할 일이 없다.
       */
      migrate: (persisted, version): PersistedState => {
        if (version >= PERSIST_VERSION) {
          return persisted as PersistedState;
        }
        const old = (persisted ?? {}) as LegacyStateV0;
        const legacyV0 = keptLegacy(old);
        return {
          byUser: {},
          botsMigratedUserIds: [],
          studyDaysBackfilledUserIds: [],
          goals: old.goals ?? [],
          unitProgress: old.unitProgress ?? [],
          ...(legacyV0 && { legacyV0 }),
        };
      },
      /**
       * 저장값을 현재 상태 위에 얹는 자리 — **v0 를 실제로 받는 곳이 여기다**(위 참조).
       *
       * 기본 merge 는 얕은 spread 라 v0 의 `enrollments`·`streak` 가 상태에 그대로 얹히고,
       * 그다음 저장에서 `partialize` 가 그 두 칸을 빼면 **원본이 되돌릴 수 없게 덮인다.**
       * 옮길 수 없다는 것과 없애도 된다는 것은 다른 말이라, 여기서 두 칸을 `legacyV0` 로
       * 접어 넣고 `partialize` 가 그것을 계속 실어 보낸다. 화면은 이 칸을 보지 않는다 —
       * 대응표가 생기거나 복구 요청이 올 때의 입력이다.
       *
       * ## ⛔ `partialize` 가 내려보내는 칸을 여기서 **빠뜨리지 마라**
       * 이 함수는 기본 얕은 merge 를 **대체**하므로, 여기 안 적힌 칸은 저장돼 있어도
       * 복원되지 않는다 — 쓰기(`partialize`)와 읽기(여기)가 갈리면 그 칸은 **매 로드마다
       * 초기값으로 되돌아간다.** 두 완료 표시가 그 자리다:
       *
       *  - `studyDaysBackfilledUserIds` 를 빠뜨리면 **백필이 매 로드마다 다시 돈다.**
       *    서버가 멱등이라 데이터는 안 망가지지만(`onConflictDoNothing`), 「백필은 한 번만」
       *    이라는 계약(§4)이 사라지고 사람마다 로드마다 한 왕복이 영구히 늘어난다.
       *  - `botsMigratedUserIds` 를 빠뜨리면 **로컬 `bots` 정리가 영구히 안 된다.**
       *    `dropUploadedBots` 는 이 목록을 근거로만 걷는데(머리주석의 표), 그 근거가 매
       *    로드마다 비워지므로 이관이 끝난 행이 계속 남아 다시 올라간다.
       *
       * 두 목록은 스크래치 플래그가 아니라 **데이터**다(머리주석). 그러니 `partialize` 의
       * 칸과 이 함수의 칸은 **언제나 같이 움직인다** — 한쪽에 칸을 더하면 다른 쪽도 더한다.
       */
      merge: (persisted, current): SelfLearningStore => {
        const raw = (persisted ?? {}) as Partial<PersistedState> & LegacyStateV0;
        const legacyV0 = raw.legacyV0 ?? keptLegacy(raw);
        return {
          ...current,
          byUser: raw.byUser ?? current.byUser,
          botsMigratedUserIds:
            raw.botsMigratedUserIds ?? current.botsMigratedUserIds,
          studyDaysBackfilledUserIds:
            raw.studyDaysBackfilledUserIds ?? current.studyDaysBackfilledUserIds,
          goals: raw.goals ?? current.goals,
          unitProgress: raw.unitProgress ?? current.unitProgress,
          ...(legacyV0 && { legacyV0 }),
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
 * 현재는 `useSelfStreak()`(`hooks/api/self-bots.ts`)와 같이 명시적인 로컬 임시 소스만 센다.
 * OS 로그인 중에도 same-origin study-days API를 부르지 않는다.
 *
 * 이름이 둘로 남은 이유: 셸이 이 이름을 이미 부르고 있고 화면 파일은 이번에도 건드리지
 * 않았다. 두 이름을 하나로 합치려면 셸이 `useSelfStreak()` 를 부르게 바꾸면 되고, 그건
 * 화면 변경이라 별건이다. **여기서 `self-bots.ts` 를 import 하지는 마라** — 그쪽이 이
 * 파일을 import 해서 순환이 된다. 그래서 스토어를 모르는 얇은 층
 * (`hooks/api/self-server.ts`)만 읽는다.
 *
 * 서버 응답 전에는 0 이다(이 시그니처에는 로딩 칸이 없다). 뱃지는 0 이면 아예 숨으므로
 * 「잘못된 숫자가 잠깐 보이는」 일은 없고, 한 페인트 늦게 나타난다.
 * @returns 연속일수와 마지막 학습일
 */
export function useStreak(): Streak {
  const userId = useCurrentUserId();
  const identity = useServerIdentityState();
  const hydrated = useStoresHydrated(useSelfLearningStore);
  const localDays = useSelfLearningStore(
    (s) => s.byUser[userId]?.studyDays ?? EMPTY_RECORD.studyDays,
  );
  // 임시 계약: OS 로그인 중에도 same-origin `/api/me/study-days`를 호출하지 않는다.
  // 세션 복원·persist hydration 전에는 데모 사용자 통을 노출하지 않는다.
  return useMemo(
    () => deriveStreak(hydrated && identity !== 'pending' ? localDays : EMPTY_RECORD.studyDays),
    [hydrated, identity, localDays],
  );
}
