'use client';

/**
 * 자기주도 학습 저장소 — 서버가 정본이 된 뒤 **로컬에 남는 절반**.
 *
 * ## P4 이후 이 파일이 무엇인가
 *
 * 두 슬라이스의 **정본은 이제 둘 다 서버**다 — 담은 봇은 `self_enrollments`(P3),
 * 공부한 날은 `self_study_days`(P4). 그래도 이 파일이 죽은 건 아니고, **신원에 따라**
 * 남은 칸의 뜻이 갈린다. 화면이 읽는 입구는 어느 쪽이든 `hooks/api/self-bots.ts` 하나다:
 *
 * | 지금 누구인가 | 담은 봇·공부한 날을 어디서 읽고 쓰나 |
 * |---|---|
 * | 로그인 세션(JWT) · 개발용 신원 쿠키 | **서버.** 이 파일은 아래 표의 뜻으로만 남는다 |
 * | 그 둘 다 없음(= 공개 데모) | **이 파일.** 서버에 아예 요청하지 않는다 |
 *
 * 아래 칸이 데모에서 살아 있어야 하는 이유는 `hooks/api/self-bots.ts` 머리주석에 있다.
 * 요지만 옮기면: prod(`classbot.pullim.ai`)는 로그인 없이 열리는 공개 데모이고 서버 라우트는
 * 미인증에 401 이라, 거기서 서버를 부르면 **담기 버튼이 전부 오류가 된다.**
 *
 * 담기는 **반 참여가 아니다.** 서버로 옮긴 뒤에도 같다 — `self_enrollments` 에 행이 생겨도
 * `enrollments` 는 건드리지 않고, 교사의 학생 수·학급 관제소·과제에 아무 영향이 없다(계약 §1).
 *
 * ## 화면은 이 파일을 직접 읽지 않는다
 * 소비 입구는 `hooks/api/self-bots.ts` 하나다. 담은 봇의 출처가 localStorage 에서 서버로
 * 바뀔 때 훅 내부만 갈아 끼우면 됐던 게 그 덕이다 — 화면 파일은 한 줄도 안 바뀌었다.
 * 데모/서버로 갈리는 것도 그 안에서 끝나서, 화면은 그런 갈래가 있는지도 모른다.
 *
 * ## ⛔ 무엇이 찌꺼기고 무엇이 살아 있는 데이터인가 — 통째로 지우지 마라
 *
 * P3 는 로컬 `bots` 를 이관의 안전망으로 남기고 정리를 P4 에 넘겼다(계약 §5).
 * **P4 가 그 절반을 걷었다.** 지금 두 칸의 뜻은 이렇다:
 *
 * | 칸 | 신원이 있는 사람 | 공개 데모(비로그인) |
 * |---|---|---|
 * | `bots` | **서버가 아직 모르는 행만 남는다.** `botsMigratedUserIds` 에 있는 통에 한해, 서버 목록에 돌아온 행을 걷었다(아래 `dropUploadedBots`) | **유일한 사본.** 여기서만 읽고 쓴다 — 지우면 사라진다 |
 * | `studyDays` | 백필의 **소스이자 안전망**으로 그대로 남는다(P5 가 걷는다) | **유일한 사본.** 담은 봇과 같다 |
 *
 * `studyDays` 만 한 단계 늦는 이유는 P3 가 `bots` 에 썼던 비대칭 그대로다: **올리기를
 * 들여온 바로 그 단계에서 그 소스를 지우지 않는다.** 올리기가 미묘하게 틀렸으면 날짜는
 * 되살릴 방법이 없다(카운터가 아니라 날짜를 쌓아 둔 이유가 그것이다). `bots` 는 그 한
 * 단계를 이미 기다렸고, `studyDays` 는 이제 막 시작했다.
 *
 * **두 칸 다 「사람에 따라 뜻이 다르다」는 성질은 그대로다.** 데이터만 봐서는 구별되지
 * 않고, 가르는 것은 완료 표시다 — `bots` 는 `botsMigratedUserIds`, `studyDays` 는
 * `studyDaysBackfilledUserIds`. 그 목록에 id 가 **있으면** 그 통은 서버를 만났고,
 * **없으면** 서버에 간 적이 없다.
 *
 * 왜 눈으로 구별이 안 되는가: 공개 데모 방문자는 신원이 없어 데모 폴백 `student_001` 이
 * 된다(`lib/current-user.ts`). 그래서 `byUser['student_001']` 이 **개발 쿠키로 로그인해
 * 이관을 마친 서연의 통**일 수도, **prod 에서 담고 공부한 익명 방문자의 유일한 사본**일
 * 수도 있다. id 로는 못 가른다 — 완료 표시로만 가른다.
 *
 * `byUser` 를 한 번에 비우면 **prod 공개 데모의 기록이 전부 사라진다.** id 로 골라 지우는
 * 것도 안 된다 — `student_001` 이 바로 그 충돌하는 id 다. **지워도 되는 유일한 근거는 완료
 * 표시**이고, 그래서 그 두 목록은 스크래치 플래그가 아니라 **데이터**다. 로그아웃에서 비우지
 * 말고, 다른 용도로 겸해 쓰지 말고, 이름을 바꾸면 이 표도 같은 편집에서 고쳐라.
 *
 * ## 지금 모양이 곧 나중 API 행 모양이다
 *  - `SelfBotRow` = `GET /api/me/self-bots` 한 행. P3 가 필드를 다시 매핑하지 않았다.
 *    (타입이 아직 여기 있는 이유: 훅이 이 스토어를 import 하므로 반대 방향은 순환이다.
 *    같은 이유로 이 파일이 서버를 읽을 때도 `hooks/api/self-bots.ts` 가 아니라 스토어를
 *    모르는 얇은 층 `hooks/api/self-server.ts` 를 읽는다 — 아래 `useStreak` 참조.
 *    서버는 `app/api/_lib/contract-types.ts` 에 같은 두 칸을 따로 적어 둔다 — 라우트가
 *    `'use client'` zustand 모듈을 import 할 수는 없어서다.)
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
import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { apiPost } from '@/lib/api/client-fetch';
import { useCurrentUserId } from '@/lib/current-user';
import {
  isRetriableUploadError,
  selfStudyDayKeys,
  useServerStudyDays,
} from '@/hooks/api/self-server';
import type {
  BackfillStudyDaysInput,
  BackfillStudyDaysResponse,
} from '@/hooks/api/types';
import { todayKey } from './today-key';
import { useStoresHydrated } from './use-hydrated';

/** `GET /api/me/self-bots` 의 한 행 — P1 이 굳혀 P3 가 그대로 쓴 모양. */
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

/** 사용자 한 명의 자기주도 기록. */
export interface SelfUserRecord {
  /**
   * 담은 봇 — 담은 순서(오래된 것 먼저).
   *
   * P3 이후 읽고 쓰는 곳이 **비로그인 데모 하나뿐**이다. 신원이 있는 사람의 정본은
   * 서버(`self_enrollments`)라 이 칸을 읽지 않는다.
   *
   * P4 가 **서버가 돌려준 행을 여기서 걷었다**(`dropUploadedBots`). 그래서 신원이 있는
   * 사람에게 남는 행의 뜻은 하나다 — **아직 서버가 모르는 행**(못 올라간 것).
   *
   * ⛔ 그래도 **통째로 비우지 마라** — 비로그인 데모의 통은 유일한 사본이다.
   * 무엇이 어느 쪽인지는 위 머리주석 표가 `botsMigratedUserIds` 로 가른다.
   */
  bots: SelfBotRow[];
  /**
   * 공부한 날 `'YYYY-MM-DD'` — 오름차순·중복 없음. `self_study_days` 한 행 = 한 칸.
   *
   * P4 이후 신원이 있는 사람의 정본은 서버다. 이 칸은 **백필(계약 §4)의 소스이자
   * 안전망**으로 그대로 남는다 — 걷는 것은 P5 몫이다(위 머리주석의 비대칭).
   * 비로그인 데모에게는 여전히 **유일한 사본**이라 계속 여기 쓴다.
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
 * 입력이 되는데, 서버는 같은 값을 round-trip 으로 거른다 — 환경마다 날짜 규칙이 갈린다.
 * 그래서 서버(`app/api/_lib/study-date.ts` 의 `isDayKey`)와 **같은 방식**으로 판정한다.
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
   * ⚠️ **비로그인 데모에서만 부른다.** 신원이 있는 사람의 담기는 서버로 가고(`POST
   * /api/me/self-bots`) 이 함수를 거치지 않는다. 부르는 곳은 `hooks/api/self-bots.ts`
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
>;

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
        botsMigratedUserIds: s.botsMigratedUserIds,
        studyDaysBackfilledUserIds: s.studyDaysBackfilledUserIds,
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
        return {
          byUser: {},
          botsMigratedUserIds: [],
          studyDaysBackfilledUserIds: [],
          goals: old.goals ?? [],
          unitProgress: old.unitProgress ?? [],
        };
      },
    },
  ),
);

/* ── 공부한 날 백필 (계약 §4) ───────────────────────────────────────────────
 * P1 부터 이 브라우저에 쌓인 날짜를 서버로 **한 번** 올린다. 담은 봇 이관과 같은 규율이고,
 * 다른 점은 **어느 파일에 있는가** 하나다.
 *
 * 담은 봇 이관은 `hooks/api/self-bots.ts` 에 있는데 이건 왜 스토어에 있나 — 부르는 곳이
 * **둘**이고 그중 하나가 이 파일이기 때문이다:
 *  - `hooks/api/self-bots.ts` 의 `useSelfStudyDays()` — 화면이 읽는 입구.
 *  - 이 파일의 `useStreak()` — 셸 헤더 뱃지(`components/shell/app-header.tsx`)가 부르는
 *    이름이라 여기 남아 있고, **학생 화면 전부에 떠 있는 유일한 연속일수 소비자**다.
 *    백필이 그쪽에서 안 돌면 「학습 화면에 들어가기 전까지 연속일수가 0 으로 보이는」
 *    구간이 생긴다 — 백필이 막으려던 바로 그 증상이다.
 *
 * 스토어가 `self-bots.ts` 를 import 하면 순환이라(머리주석) 그쪽에 두고 여기서 부를 수 없다.
 * 그래서 **로컬 데이터와 완료 표시를 소유한 이 파일**에 두고 양쪽이 부른다.
 * ------------------------------------------------------------------------ */

/** 한 번에 보내는 날짜 상한 — 계약 §2(넘으면 서버가 400). 잘라 버리지 않고 나눠 보낸다. */
const BACKFILL_CHUNK = 400;

/**
 * 지금 백필 중인 사용자 — 모듈 전역이다.
 *
 * 한 화면에서 이 훅이 여러 번 마운트된다(셸 뱃지 + 화면). 완료 표시는 왕복이 끝나야
 * 남으므로, 그 사이를 막는 자물쇠가 따로 있어야 같은 날짜를 여러 번 올리지 않는다.
 */
const backfilling = new Set<string>();

/**
 * 로컬에만 있는 공부한 날을 서버로 **한 번** 올린다 — 실패해도 화면은 죽지 않는다.
 *
 * 언제 도는가(계약 §4 의 세 조건):
 *  - **스토어 rehydrate 가 끝난 뒤.** 안 그러면 `byUser` 가 비어 보여서 「올릴 게 없다」로
 *    완료 표시를 남기고, 로컬 기록이 영영 안 올라간다.
 *  - **서버 목록이 온 뒤**(`serverDays`). 무엇이 이미 있는지 알아야 그것만 빼고 올린다.
 *  - 사용자당 **한 번** — 완료 표시(`studyDaysBackfilledUserIds`). 올릴 게 하나도 없던
 *    사람도 곧바로 표시를 남긴다.
 *
 * ## 지금 신원의 통 **하나만** 본다 — `byUser` 를 훑지 마라
 * 클라이언트는 한 번에 **한 신원**으로만 인증된다. 다른 통을 올리면 서연의 공부한 날이
 * **민준 명의로** 서버에 박힌다 — 사용자별 네임스페이스가 막으려던 그 버그다.
 * 다른 통은 **그 신원이 다음에 활성일 때** 자기 손으로 올라간다.
 *
 * ## 형식이 틀린 날짜·미래 날짜를 여기서 거르지 않는다
 * 거르는 자리는 **서버 하나**다(계약 §2: 형식 위반·미래·2년 이전은 skip). 클라이언트가
 * 먼저 한 번 더 거르면 규칙이 두 곳에 생겨 서로 어긋날 때 어느 쪽이 맞는지 알 수 없다.
 * 손으로 고친 localStorage 가 무엇을 넣었든 **그대로 보내고 서버가 세어 돌려준다.**
 *
 * ## 올린 뒤에도 로컬 날짜를 지우지 않는다
 * 담은 봇이 P3 에서 한 단계 기다린 것과 같은 이유다(머리주석의 비대칭). 정리는 P5 몫이다.
 * @param serverDays - 서버가 아는 날짜. `undefined` 면 아직 안 왔거나 데모라 아무것도 안 한다
 */
export function useStudyDayBackfill(serverDays: string[] | undefined): void {
  const userId = useCurrentUserId();
  const hydrated = useStoresHydrated(useSelfLearningStore);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !hydrated || !serverDays) return;
    if (backfilling.has(userId)) return;
    const state = useSelfLearningStore.getState();
    if (state.studyDaysBackfilledUserIds.includes(userId)) return;

    const onServer = new Set(serverDays);
    const pending = (state.byUser[userId]?.studyDays ?? []).filter((d) => !onServer.has(d));
    if (pending.length === 0) {
      state.markStudyDaysBackfilled(userId);
      return;
    }

    backfilling.add(userId);
    void (async () => {
      let sent = false;
      let retriable = false;
      try {
        for (let i = 0; i < pending.length; i += BACKFILL_CHUNK) {
          await apiPost<BackfillStudyDaysResponse>('/api/me/study-days/backfill', {
            days: pending.slice(i, i + BACKFILL_CHUNK),
          } satisfies BackfillStudyDaysInput);
          sent = true;
        }
      } catch (error) {
        // 다시 해 볼 만한 실패(네트워크·5xx·401)면 완료 표시를 남기지 않는다 — 다음 로드에서
        // 또 해 본다. 그 밖(400 등)은 다시 보내도 같은 답이라 표시를 남기고 넘어간다.
        retriable = isRetriableUploadError(error);
      } finally {
        backfilling.delete(userId);
      }
      if (!retriable) useSelfLearningStore.getState().markStudyDaysBackfilled(userId);
      // 한 덩이라도 올라갔으면 서버 목록을 다시 읽는다 — 무엇이 실제로 들어갔는지는
      // 서버가 안다(형식·미래·2년 이전은 서버가 skip 한다).
      if (sent) void queryClient.invalidateQueries({ queryKey: selfStudyDayKeys.mine });
    })();
    // 백필 실패로 화면이 죽으면 안 된다 — 위 async 의 throw 는 전부 catch 가 받는다.
  }, [userId, hydrated, serverDays, queryClient]);
}

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
 * **P4 에서 출처가 서버로 옮겨 갔다.** `useSelfStreak()`(`hooks/api/self-bots.ts`)와 같은
 * 값을 같은 방식으로 계산한다 — 신원이 있으면 `GET /api/me/study-days`, 없으면 로컬.
 * 그래서 `localStorage.clear()` 를 해도 뱃지가 그대로다(그게 P4 의 요점이다).
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
  const { days: serverDays, hasServerIdentity } = useServerStudyDays();
  const localDays = useSelfLearningStore(
    (s) => s.byUser[userId]?.studyDays ?? EMPTY_RECORD.studyDays,
  );
  // 학생 화면 전부에 떠 있는 유일한 소비자다 — 백필이 여기서 돌아야 로컬 기록이 올라간다.
  useStudyDayBackfill(serverDays);
  const studyDays = hasServerIdentity
    ? (serverDays ?? EMPTY_RECORD.studyDays)
    : localDays;
  return useMemo(() => deriveStreak(studyDays), [studyDays]);
}
