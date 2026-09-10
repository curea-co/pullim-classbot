/**
 * 교사 홈이 읽는 「먼저 볼 학생」 — 관제소 명단에서 오늘 손댈 학생만 골라낸다.
 *
 * 홈과 관제소의 경계:
 *   - 홈(/teacher)             = 오늘 먼저 볼 사람 + 나를 기다리는 일. **예외만 짧게.**
 *   - 관제소(/teacher/monitor) = 학급 전체 진단 — 다시 가르칠 개념 + 학생 20줄 + 필터.
 * 그래서 이 파일은 20명을 다시 늘어놓지 않고 **골라낸 몇 명**만 만든다.
 *
 * 고르는 순서는 조사에서 교사가 먼저 알고 싶다고 답한 순서다.
 *   ① 오늘 안 들어옴 — 조용한 이탈. 진행률에는 안 잡히고 교사가 가장 늦게 안다
 *   ② 미도달        — 과제 대화에서 성취기준까지 못 갔다
 *   ③ 목표 수준 미달 — 완료로 보이는데 요구한 사고 수준엔 못 닿았다 (실측 37.7%)
 *
 * 담지 않는 것: 감정·집중도·체류시간, 대화 수 같은 총량 지표. 고르는 근거로도 쓰지 않는다.
 * 지름길 시도도 고르는 근거가 아니다 — 학생을 벌주는 숫자가 아니라 과제·프롬프트 설계 신호라
 * 관제소 명단 아래 학급 합계로만 읽는다.
 */

import {
  isDepthShort, isOfflineToday, lastSeenRank, monitoredRoster,
  type MonitoredStudent,
} from './classbot-monitoring';

/** 이 학생을 먼저 봐야 하는 이유 — 셋 중 하나. 겹치면 위에 있는 것이 이긴다. */
export type AttentionReason = 'offline' | 'not-reached' | 'depth-short';

/*
 * 이유를 문장으로 적던 두 벌(「오늘 안 들어왔어요」·「접속부터 확인」)은 걷어냈다.
 * 상태는 줄의 배지 두 벌이 말하고(도달 배지 · 최근 접속 배지), 이동은 줄 전체가 맡는다 —
 * 같은 것을 문장으로 한 번 더 적으면 줄이 길어지기만 한다.
 * 이유는 여전히 **고르는 순서**로 쓰인다 (`attentionReason`).
 */

export type AttentionStudent = {
  student: MonitoredStudent;
  reason: AttentionReason;
};

const reasonOrder: AttentionReason[] = ['offline', 'not-reached', 'depth-short'];

/** 이 학생이 걸린 이유. 아무 데도 안 걸리면 null — 홈에 올리지 않는다. */
export function attentionReason(s: MonitoredStudent): AttentionReason | null {
  if (isOfflineToday(s)) return 'offline';
  if (s.reach === 'not-reached') return 'not-reached';
  if (isDepthShort(s)) return 'depth-short';
  return null;
}

/**
 * 먼저 볼 학생 — 이유 순서 → 활동 오래된 순 → 이름순.
 * limit 을 넘겨도 전체 인원은 `countAttentionStudents` 로 따로 읽는다(「12명 중 5명」).
 */
export function pickAttentionStudents(
  roster: MonitoredStudent[] = monitoredRoster,
  limit = 5,
): AttentionStudent[] {
  const picked = roster
    .map(student => ({ student, reason: attentionReason(student) }))
    .filter((r): r is AttentionStudent => r.reason !== null);

  picked.sort((a, b) => (
    reasonOrder.indexOf(a.reason) - reasonOrder.indexOf(b.reason)
    || lastSeenRank(b.student) - lastSeenRank(a.student)
    || a.student.name.localeCompare(b.student.name, 'ko')
  ));

  return picked.slice(0, limit);
}

/** 먼저 볼 학생 전체 인원 (limit 을 걸기 전) */
export function countAttentionStudents(roster: MonitoredStudent[] = monitoredRoster): number {
  return roster.filter(s => attentionReason(s) !== null).length;
}
