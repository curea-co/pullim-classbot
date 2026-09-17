/**
 * 교사 개입 — 정본 DTO 를 화면이 쓰는 모양으로 옮기는 **순수 함수**들(계획 PR 5c · 완성 설계 § 8 5c).
 *
 * 문은 넷이고 전부 pullim-api 정본이다(`hooks/api/intervention.ts` 머리주석) — 이 파일은 그 응답을 두고
 * 「무엇을 어떻게 말하는가」만 정한다. 서버를 모르는 함수라 테스트가 HTTP 없이 선다.
 *
 * 종전에는 같은 일을 `lib/store/interventions.ts`(zustand + `pullim-interventions` localStorage persist)가
 * 했다 — 교사 표면이 브라우저에 쓰고 학생 벨이 **같은 브라우저에서** 읽는 구조라, 교사와 학생이 다른 기기면
 * 알림이 영영 도착하지 않았다. 그 스토어와 로컬 `send()` 는 이 PR 이 걷었다.
 *
 * ⚠ **`crisis` 는 교사가 내지 않는다.** 위험 신호 severity ≥ 4 에서 **서버가 자동으로 만든다**
 * (`proc/spec/05-business-rules.md § 3` · pullim-api `api.md § 3.8` 감지 훅). 그래서 아래 표에 `crisis` 가
 * 있는 것은 **읽는 쪽**(학생 인박스)이 그 유형을 받기 때문이고, 교사 UI 가 내는 것은 `remind`·`comment` 둘뿐이다.
 */

import { ClipboardList, Heart, MessageCircle, RotateCcw, type LucideIcon } from 'lucide-react';

import type {
  ClassMemberDto,
  InterventionDto,
  InterventionType,
  SubmissionsViewDto,
} from '@/lib/api/classbot-dto';

/** 인박스 한 줄의 겉모습 — 아이콘과 낭독기가 읽을 이름. */
export interface InterventionMeta {
  icon: LucideIcon;
  label: string;
}

/**
 * 유형별 표시 — **학생이 읽는 글자다.** 진단하지 않는다(`crisis` 를 「위기」로 쓰지 않는 이유 ·
 * `proc/spec/05 § 3`): 학생에게 그 알림은 선생님이 보낸 응원 한마디로만 보인다.
 */
const TYPE_META: Record<InterventionType, InterventionMeta> = {
  remind: { icon: ClipboardList, label: '과제 리마인드' },
  comment: { icon: MessageCircle, label: '선생님 한마디' },
  requiz: { icon: RotateCcw, label: '복습 과제' },
  crisis: { icon: Heart, label: '선생님 응원' },
};

/** 모르는 유형 — 서버가 유형을 늘리면 여기로 떨어진다. 이름을 지어내지 않고 「알림」으로 둔다. */
const UNKNOWN_META: InterventionMeta = { icon: MessageCircle, label: '알림' };

/**
 * 개입 한 건의 표시 — 서버가 `type` 을 string 으로 열어 두므로(정본 DTO) 표에 없으면 중립으로 떨어진다.
 * @param type - `InterventionDto.type`
 * @returns 아이콘 + 이름
 */
export function interventionMeta(type: string): InterventionMeta {
  return TYPE_META[type as InterventionType] ?? UNKNOWN_META;
}

/**
 * 개입 → 학생이 갈 자리.
 *  - 연계 과제가 있으면 그 과제로 — `comment` 는 이미 낸 것에 대한 말이라 **결과**, 나머지는 **과제 상세**다.
 *  - 과제가 없으면(= `crisis`) 그 반의 대화로. `botId` 는 반 id 라 챗의 정본 파라미터 `?classId=` 에 그대로 실린다
 *    (`app/(student)/classbot/chat/page.tsx` `resolveSlotKey`).
 * @param item - 개입 한 건
 * @returns 앱 내부 경로
 */
export function interventionHref(item: InterventionDto): string {
  if (item.assignmentId) {
    const base = `/classbot/assignment/${encodeURIComponent(item.assignmentId)}`;
    return item.type === 'comment' ? `${base}/result` : base;
  }
  return `/classbot/chat?classId=${encodeURIComponent(item.botId)}`;
}

/** 안 읽은 건수 — 벨 배지. */
export function unreadCount(items: readonly InterventionDto[]): number {
  return items.reduce((n, item) => (item.readAt === null ? n + 1 : n), 0);
}

/**
 * 인박스 정렬 — 최신이 위. 서버도 `created_at DESC` 로 주지만(`intervention.service.ts` `list`) 낙관 갱신으로
 * 우리가 만든 배열도 같은 차례를 지켜야 해서 화면이 한 번 더 세운다.
 * @param items - 인박스
 * @returns 새 배열(입력은 그대로 둔다)
 */
export function sortedInbox(items: readonly InterventionDto[]): InterventionDto[] {
  return [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/**
 * 낙관 갱신 — 한 건 읽음. 이미 읽은 건은 건드리지 않는다(서버도 멱등 no-op).
 * @param items - 지금 캐시
 * @param id - 읽은 개입
 * @param readAt - 읽은 시각(서버 값이 오면 덮인다)
 * @returns 새 배열
 */
export function markReadInInbox(
  items: readonly InterventionDto[],
  id: string,
  readAt: string,
): InterventionDto[] {
  return items.map((item) => (item.id === id && item.readAt === null ? { ...item, readAt } : item));
}

/**
 * 낙관 갱신 — 전부 읽음. 서버는 내 미읽음만 건드린다(`WHERE student_id==sub AND read_at IS NULL`).
 * @param items - 지금 캐시
 * @param readAt - 읽은 시각
 * @returns 새 배열
 */
export function markAllReadInInbox(
  items: readonly InterventionDto[],
  readAt: string,
): InterventionDto[] {
  return items.map((item) => (item.readAt === null ? { ...item, readAt } : item));
}

/**
 * 그 과제의 「선생님 한마디」 — 가장 최근 `comment` 하나. 결과 화면이 읽는다.
 * @param items - 내 인박스
 * @param assignmentId - 그 과제
 * @returns 최신 comment · 없으면 null
 */
export function latestCommentFor(
  items: readonly InterventionDto[],
  assignmentId: string,
): InterventionDto | null {
  const comments = sortedInbox(
    items.filter((item) => item.type === 'comment' && item.assignmentId === assignmentId),
  );
  return comments[0] ?? null;
}

/* ─── 교사 쪽 — 무엇을 누구에게 보내는가 ─────────────────────────────────────────── */

/**
 * 리마인드 기본 문구 — 교사가 그대로 보내도 학생이 무엇을 해야 하는지 아는 한 줄. 폼에서 고칠 수 있다.
 * @param assignmentTitle - 고른 과제 제목
 * @returns 학생이 인박스에서 읽을 문장
 */
export function remindDefaultMessage(assignmentTitle: string): string {
  return `「${assignmentTitle}」 과제가 아직 제출 전이에요. 오늘 안에 한 번 열어 볼까요?`;
}

/**
 * 아직 안 낸 학생 — **반 명단 − 제출자**. 비활성 멤버는 빼고(서버도 비활성에게는 발송을 400 으로 막는다),
 * 명단 차례를 그대로 지킨다.
 *
 * ⚠ **이 식은 「그 과제가 반 전체에 갔다」를 전제한다.** 정본은 `assignment_targets` 로 **일부 학생에게만**
 * 낼 수 있는데(data-model § 1.5 「빈 targets = 반 전체 대상」), `AssignmentSummaryResponseDto` ·
 * `AssignmentDetailResponseDto` 에 그 칸이 **없어서** 화면이 대상을 확인할 방법이 없다(2026-09-17 실측).
 * 오늘은 맞는다 — 이 앱 자신은 늘 반 전체로 낸다(`assignment-form.tsx` 의 `targetStudentIds: []`).
 * 다른 경로로 일부 대상 과제가 생기면 **받은 적 없는 학생에게** 미제출 리마인드가 갈 수 있다.
 * 닫는 자리는 여기가 아니라 응답 DTO 다(PR 본문 「pullim-api 후속」).
 * @param members - `GET /classes/:classId/members`
 * @param submissions - `GET /assignments/:id/submissions`
 * @returns 안 낸 활성 멤버들
 */
export function unsubmittedMembers(
  members: readonly ClassMemberDto[],
  submissions: readonly SubmissionsViewDto[],
): ClassMemberDto[] {
  const submitted = new Set(submissions.map((s) => s.studentId));
  return members.filter((m) => m.isActive && !submitted.has(m.memberId));
}

/** 명단 한 줄이 화면에서 불릴 이름 — 비어 있으면 지어내지 않고 sub 앞 여덟 자로 구분만 한다. */
export function memberLabel(member: ClassMemberDto): string {
  const name = member.displayName?.trim();
  return name && name.length > 0 ? name : `이름 없음 ${member.memberId.slice(0, 8)}`;
}

/** 일괄 리마인드 결과 — 학생 하나에 요청 하나라 **부분 성공**이 있다. */
export interface BulkRemindResult {
  /** 보낸 학생 수. */
  sent: number;
  /** 실패한 학생 수. */
  failed: number;
  /** 401 로 끊겨 **보내지도 못한** 나머지 — 로그인으로 가는 중이다. */
  aborted: number;
}

/**
 * 일괄 리마인드 요약 한 줄 — 교사가 토스트에서 읽는다. 부분 성공을 「보냈어요」로 뭉개지 않는다.
 *
 * 401 로 멈춘 경우에도 **그 전에 일어난 일을 먼저 말한다** — 이미 보낸 사람과 다른 까닭으로 실패한 사람이
 * 있는데 「로그인이 풀렸어요」 하나로 덮으면 교사가 같은 학생에게 두 번 보낸다.
 * @param result - 순차 발송 결과
 * @returns 토스트 문구
 */
export function bulkRemindSummary(result: BulkRemindResult): string {
  const { sent, failed, aborted } = result;
  if (aborted > 0) {
    const before: string[] = [];
    if (sent > 0) before.push(`${sent}명에게 보냈어요`);
    if (failed > 0) before.push(`${failed}명은 보내지 못했어요`);
    const head = before.length > 0 ? `${before.join(', ')}. ` : '';
    return `${head}로그인이 풀려서 남은 ${aborted}명에게는 못 보냈어요. 다시 로그인한 뒤 보내 주세요.`;
  }
  if (sent === 0) return `${failed}명 모두 보내지 못했어요. 잠시 후 다시 시도해 주세요.`;
  if (failed === 0) return `${sent}명에게 리마인드를 보냈어요.`;
  return `${sent}명에게 보냈고, ${failed}명은 보내지 못했어요.`;
}
