/**
 * 위험 신호 · 교사 대화 열람 — 정본 DTO 를 화면 모양으로 옮기는 순수 모듈(React·네트워크 없음).
 *
 * 규칙의 권위는 pullim-api `src/classbot/common/constants/risk-signal-rules.ts` 와 완성 설계 § 7
 * (`proc/spec/2026-09-16_classbot-completion-design.md`) · `proc/spec/05-business-rules.md § 3` 이다. 여기서는
 * **판정하지 않는다** — 세기·종류·확인 여부는 전부 서버가 정한 값이고, 이 모듈은 그것을 읽는 말(우리말 라벨)과
 * 화면이 쓰는 파생값(최고 세기 4 이상 강조 · 학습 문맥 강등 표시 · 원문 자리 묶기 · 확인의 낙관적 갱신)만 만든다.
 *
 * 종류 여섯(`RISK_SIGNAL_KINDS`)은 서버 CHECK 제약과 같은 집합이다. `idle`(오래 조용함)은 **행을 만들지 않는다** —
 * 명단의 `lastActiveAt` 에서 조회 시 파생하는 값이라 라벨만 예약해 두고, 화면은 「최근 활동」 칸으로 보여 준다.
 * 모르는 kind 가 오면(서버가 종류를 늘리는 날) 라벨 대신 값을 그대로 보인다 — 숨기지 않는다.
 */

import type {
  ClassMemberDto,
  ClassSignalsDto,
  MemberMessageDto,
  RiskSignalDto,
  StudentSignalSummaryDto,
} from '@/lib/api/classbot-dto';

/** `risk_signals.kind` 값 집합 — pullim-api `RISK_SIGNAL_KINDS` 와 같은 순서. */
export const RISK_SIGNAL_KINDS = [
  'answer_seeking',
  'inappropriate',
  'crisis_keyword',
  'repeat_bypass',
  'nonsense',
  'idle',
] as const;
export type RiskSignalKind = (typeof RISK_SIGNAL_KINDS)[number];

/** 교사가 읽는 이름 — 완성 설계 § 7 표의 우리말. 한자어 대신 「무엇을 했나」로 적는다. */
export const riskKindLabels: Record<RiskSignalKind, string> = {
  answer_seeking: '답 구하기',
  inappropriate: '부적절한 말',
  crisis_keyword: '위기 신호',
  repeat_bypass: '반복 시도',
  nonsense: '무의미 입력',
  idle: '오래 조용함',
};

const KIND_SET: ReadonlySet<string> = new Set(RISK_SIGNAL_KINDS);

/** 서버 문자열이 아는 종류인가. */
export function isRiskSignalKind(value: string): value is RiskSignalKind {
  return KIND_SET.has(value);
}

/** 종류 → 라벨. 모르는 값은 그대로 돌려준다(숨기지 않는다). */
export function riskKindLabel(kind: string): string {
  return isRiskSignalKind(kind) ? riskKindLabels[kind] : kind;
}

/**
 * 세기 4 이상 = 서버가 crisis 개입을 자동으로 만드는 선(`RISK_CRISIS_INTERVENTION_MIN_SEVERITY`). 화면은 이 선 위를
 * 빨강으로 가른다 — 3 이하는 중립 slate 다(학생을 벌주는 숫자가 아니라 봇 규칙·문항을 손볼 신호).
 */
export const HIGH_SEVERITY_MIN = 4;

export function isHighSeverity(severity: number): boolean {
  return severity >= HIGH_SEVERITY_MIN;
}

/**
 * 학술·3인칭 문맥으로 세기가 내려간 위기 신호인가 — 평가기가 `detail.context='academic'` 을 적는다
 * (「주인공은 왜 자살했나요」류). 침묵시키지 않고 교사 확인에 남기는 것이라 화면은 「학습 문맥으로 낮춤」 한 마디를 단다.
 */
export function isAcademicContext(detail: Record<string, unknown>): boolean {
  return detail.context === 'academic';
}

/** 학술 문맥 강등 전의 세기 — `detail.downgradedFrom`(정수)이 있으면 그 값, 없으면 null. */
export function downgradedFrom(detail: Record<string, unknown>): number | null {
  return finiteNumber(detail.downgradedFrom);
}

/**
 * 위기 신호의 갈래 — 서버 `detail.category`(pullim-api `CrisisCategory` · spec 13 § 5.2 키워드 게이트 셋). 학교폭력은
 * 자동 개입 없이 교사 확인 대상이고 우울과 자살·자해는 단계표가 달라, 교사가 갈래를 알아야 대응이 갈린다.
 * 라벨은 갈래 이름 그대로다 — 진단어를 더하지 않는다. 모르는 값은 그대로 보인다.
 */
export const crisisCategoryLabels: Record<string, string> = {
  suicide_self_harm: '자살·자해',
  depression: '우울·무기력',
  school_violence: '학교폭력',
};

export function crisisCategoryLabel(category: string): string {
  return crisisCategoryLabels[category] ?? category;
}

/** `detail.category` — 문자열이면 그 값, 없으면 null. */
export function crisisCategory(detail: Record<string, unknown>): string | null {
  const v = detail.category;
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/** `detail.tier` — 키워드 게이트 단계(정수). 없으면 null. */
export function crisisTier(detail: Record<string, unknown>): number | null {
  return finiteNumber(detail.tier);
}

function finiteNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/* ─── 학생 줄 배지 — `summary[]` 한 행 ─── */

export interface SignalKindCount {
  kind: string;
  label: string;
  count: number;
}

/** 학생 한 줄에 붙는 신호 배지 — 종류별 건수 · 최고 세기 · 미확인 수 · 마지막 시각. */
export interface SignalBadge {
  studentId: string;
  /** `RISK_SIGNAL_KINDS` 순서 → 모르는 종류는 뒤에. 0건인 종류는 없다. */
  kinds: SignalKindCount[];
  total: number;
  maxSeverity: number;
  /** 최고 세기가 4 이상 — 줄을 빨강으로 가른다. */
  high: boolean;
  unacked: number;
  /** ISO 8601 — 가장 최근 신호. */
  lastAt: string;
}

const kindOrder = (kind: string): number => {
  const i = (RISK_SIGNAL_KINDS as readonly string[]).indexOf(kind);
  return i === -1 ? RISK_SIGNAL_KINDS.length : i;
};

/**
 * 집계 한 행 → 배지. 종류 순서를 고정해 20줄이 깔려도 같은 종류가 같은 자리에 오게 한다.
 * @param s - `GET …/signals` 의 `summary[]` 원소
 */
export function toSignalBadge(s: StudentSignalSummaryDto): SignalBadge {
  const kinds = Object.entries(s.counts)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => ({ kind, label: riskKindLabel(kind), count }))
    .sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || a.kind.localeCompare(b.kind));
  return {
    studentId: s.studentId,
    kinds,
    total: kinds.reduce((n, k) => n + k.count, 0),
    maxSeverity: s.maxSeverity,
    high: isHighSeverity(s.maxSeverity),
    unacked: s.unacked,
    lastAt: s.lastAt,
  };
}

/* ─── 신호 한 건 — `signals[]` 원소 · 확인 응답 ─── */

/** 대화 기록 옆에 붙는 신호 한 건. `messageId` 가 null 이면 원문이 지워진 것이다. */
export interface SignalMark {
  id: string;
  studentId: string;
  kind: string;
  label: string;
  severity: number;
  high: boolean;
  /** 학습 문맥으로 세기를 낮춘 위기 신호. */
  academic: boolean;
  downgradedFrom: number | null;
  /** 위기 신호의 갈래(`detail.category`) · 그 밖의 종류는 null. */
  category: string | null;
  categoryLabel: string | null;
  /** 키워드 게이트 단계(`detail.tier`) · 없으면 null. */
  tier: number | null;
  messageId: string | null;
  /** ISO 8601. */
  createdAt: string;
  ackedAt: string | null;
  acked: boolean;
}

export function toSignalMark(dto: RiskSignalDto): SignalMark {
  const category = crisisCategory(dto.detail);
  return {
    id: dto.id,
    studentId: dto.studentId,
    kind: dto.kind,
    label: riskKindLabel(dto.kind),
    severity: dto.severity,
    high: isHighSeverity(dto.severity),
    academic: isAcademicContext(dto.detail),
    downgradedFrom: downgradedFrom(dto.detail),
    category,
    categoryLabel: category === null ? null : crisisCategoryLabel(category),
    tier: crisisTier(dto.detail),
    messageId: dto.messageId,
    createdAt: dto.createdAt,
    ackedAt: dto.ackedAt,
    acked: dto.ackedAt !== null,
  };
}

/** 원문 메시지 id → 그 자리의 신호들. `messageId` 없는 신호는 빠진다(목록에서만 보인다). */
export function groupMarksByMessage(marks: SignalMark[]): Map<string, SignalMark[]> {
  const byMessage = new Map<string, SignalMark[]>();
  for (const m of marks) {
    if (m.messageId === null) continue;
    const list = byMessage.get(m.messageId) ?? [];
    list.push(m);
    byMessage.set(m.messageId, list);
  }
  return byMessage;
}

/**
 * 확인(ack)의 **낙관적 갱신** — 서버가 200 을 주기 전에 캐시를 같은 모양으로 먼저 바꾼다.
 * 신호 한 건에 `ackedBy`·`ackedAt` 을 채우고, 그 학생의 집계 `unacked` 를 하나 내린다 — **이미 확인된 신호면 아무것도
 * 바꾸지 않는다**(서버의 멱등 200 과 같은 뜻). 반 전체 응답과 학생 하나 응답이 같은 DTO 라 한 함수가 둘 다 갱신한다.
 *
 * 반 전체 응답의 `signals[]` 는 상한(기본 50)에 잘려 그 신호가 **없을 수** 있다 — 그래도 집계는 내린다. 누를 수 있는 버튼은
 * 학생별 응답(상한 200)의 미확인 신호에만 붙으므로, 여기 없는 신호는 「목록 밖의 미확인 신호」다. 틀렸더라도 `onSettled`
 * 재조회가 서버 값으로 덮는다.
 * @param ack - 확인할 신호와 그 학생(신호가 목록에 없을 때 집계를 내릴 열쇠)
 * @returns 바뀐 것이 없으면 같은 객체를 그대로(참조 동일) 돌려준다
 */
export function ackSignalInView(
  view: ClassSignalsDto,
  ack: { signalId: string; studentId: string },
  ackedBy: string | null,
  ackedAt: string,
): ClassSignalsDto {
  const target = view.signals.find((s) => s.id === ack.signalId);
  if (target && target.ackedAt !== null) return view;
  const studentId = target?.studentId ?? ack.studentId;
  return {
    signals: target ? view.signals.map((s) => (s.id === ack.signalId ? { ...s, ackedBy, ackedAt } : s)) : view.signals,
    summary: view.summary.map((row) =>
      row.studentId === studentId ? { ...row, unacked: Math.max(0, row.unacked - 1) } : row,
    ),
  };
}

/* ─── 대화 기록 한 줄 — `MemberMessageDto` ─── */

export type TranscriptRole = 'user' | 'assistant';

/** 교사가 읽는 대화 한 줄. 카드 블록은 `content` 가 null 이고 `cardType` 이 무엇인지 말한다. */
export interface TranscriptRow {
  id: string;
  role: TranscriptRole;
  content: string | null;
  cardType: string | null;
  botId: string | null;
  /** epoch ms — 시각 표기·날짜 구분선이 읽는다. */
  at: number;
}

/**
 * 열람 응답 한 행 → 줄. 서버 `role` 은 string 이라 여기서 좁힌다 — user 가 아니면 전부 봇 쪽으로 둔다
 * (system 류가 섞여 와도 학생 말로 오독하지 않게).
 */
export function toTranscriptRow(dto: MemberMessageDto): TranscriptRow {
  return {
    id: dto.id,
    role: dto.role === 'user' ? 'user' : 'assistant',
    content: dto.content,
    cardType: dto.cardType,
    botId: dto.botId,
    at: new Date(dto.createdAt).getTime(),
  };
}

/** 카드 블록의 종류를 교사가 읽는 말로 — 학생 챗의 `CARD_TYPES`(`lib/api/chat-cards.ts`)와 같은 집합. */
const cardTypeLabels: Record<string, string> = {
  'lesson-intro': '수업 시작',
  concept: '개념 설명',
  example: '예시',
  quiz: '퀴즈',
  summary: '정리',
  'self-explain': '스스로 설명하기',
  'problem-card': '문제 카드',
};

export function cardTypeLabel(cardType: string): string {
  return cardTypeLabels[cardType] ?? cardType;
}

/* ─── 학생 줄 — 명단 + 집계를 한 줄로 ─── */

/** 대화 탭 왼쪽 목록 · 관제소 표의 한 줄. 신호가 없으면 `badge` 가 null 이다. */
export interface MonitorStudentRow {
  studentId: string;
  name: string;
  /** 명단에 있는 학생인가 — 신호만 남은 옛 멤버는 false(기록은 남는다 · api.md § 3.8). */
  enrolled: boolean;
  /** ISO 8601 · 명단의 최근 활동(대화·제출 중 최신) · 옛 멤버·무활동은 null. */
  lastActiveAt: string | null;
  badge: SignalBadge | null;
}

/**
 * 표시명이 비면(탈퇴·부재·옛 멤버) sub 앞 8자로 부른다 — 「이름 없음」 한마디는 줄 스무 개가 다 같아져 누가 누군지
 * 가릴 수 없다.
 */
export function memberLabel(displayName: string | null, studentId: string): string {
  const trimmed = displayName?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : `학생 ${studentId.slice(0, 8)}`;
}

/**
 * 명단 ∪ 집계 → 줄. 명단에 없는데 신호가 있는 학생(옛 멤버)도 줄을 갖는다 — 기록은 남고 열람 문도 열려 있어서다.
 * 순서 = 미확인 많은 학생 → 최고 세기 → 최근 신호 → 이름. 신호 없는 학생은 뒤에 이름순.
 */
export function buildMonitorRows(
  members: ClassMemberDto[],
  summary: StudentSignalSummaryDto[],
): MonitorStudentRow[] {
  const badges = new Map(summary.map((s) => [s.studentId, toSignalBadge(s)]));
  const rows: MonitorStudentRow[] = members.map((m) => ({
    studentId: m.memberId,
    name: memberLabel(m.displayName, m.memberId),
    enrolled: true,
    lastActiveAt: m.lastActiveAt,
    badge: badges.get(m.memberId) ?? null,
  }));
  const seen = new Set(members.map((m) => m.memberId));
  for (const s of summary) {
    if (seen.has(s.studentId)) continue;
    rows.push({
      studentId: s.studentId,
      name: memberLabel(null, s.studentId),
      enrolled: false,
      lastActiveAt: null,
      badge: badges.get(s.studentId) ?? null,
    });
  }
  return rows.sort(compareMonitorRows);
}

function compareMonitorRows(a: MonitorStudentRow, b: MonitorStudentRow): number {
  const ua = a.badge?.unacked ?? 0;
  const ub = b.badge?.unacked ?? 0;
  if (ua !== ub) return ub - ua;
  const sa = a.badge?.maxSeverity ?? 0;
  const sb = b.badge?.maxSeverity ?? 0;
  if (sa !== sb) return sb - sa;
  const la = a.badge ? new Date(a.badge.lastAt).getTime() : 0;
  const lb = b.badge ? new Date(b.badge.lastAt).getTime() : 0;
  if (la !== lb) return lb - la;
  return a.name.localeCompare(b.name, 'ko');
}

/* ─── 시각 ─── */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
/** 이 뒤로는 날짜를 세지 않는다 — 30일이 지나면 「오래됨」. */
const STALE_AFTER_MS = 30 * DAY_MS;

/**
 * 「방금 · n분 전 · n시간 전 · n일 전 · 오래됨」 — 세 단위로만 말한다(줄마다 모양이 다르면 20줄을 훑을 때 눈이 걸린다).
 * @param iso - 기준이 되는 시각(ISO 8601)
 * @param now - 지금(epoch ms) — 호출부가 넘긴다(렌더 안에서 시계를 읽지 않게)
 */
export function relativeTimeLabel(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return '';
  if (diff >= STALE_AFTER_MS) return '오래됨';
  if (diff < MINUTE_MS) return '방금';
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}분 전`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}시간 전`;
  return `${Math.floor(diff / DAY_MS)}일 전`;
}
