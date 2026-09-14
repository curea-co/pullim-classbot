import {
  emptyDraft, grades, subjectIds, subjectMeta,
  type BotDraft, type SubjectId, type ToneId,
} from '@/components/builder/builder-types';
import type { ClassBot } from '@/lib/mock';
import type { TeacherBotRow } from '@/lib/mock/classbot-teacher-ops';

/**
 * 이미 있는 봇 한 줄 → 빌더 드래프트.
 *
 * 수정 화면은 새로 만드는 화면과 **같은 마당·같은 항목**을 쓴다. 다른 것은 첫 값뿐이라,
 * 갈라지는 자리를 이 함수 하나로 모은다 — 화면이 값을 주무르면 「봇 카탈로그가 뭘 갖고
 * 있나」와 「빌더가 뭘 묻나」가 두 군데서 어긋난다.
 *
 * **카탈로그가 들고 있지 않아 기본값으로 남는 것 셋**:
 *   - 수업 자료(`files`) — 올린 파일 목록은 카탈로그에 없다. 빈 채로 연다.
 *   - 평소에(`style`) · 틀렸을 때(`wrong`) — 봇마다 다른 값이 아직 없다.
 * 없는 값을 지어내지 않는다. 저장이 붙으면 그때 카탈로그가 이 셋을 갖게 되고,
 * 여기서 읽어 오면 된다.
 */

/**
 * 카탈로그의 과목 이름 → 빌더 과목 id.
 *
 * 학교 교과 이름은 빌더의 다섯보다 잘다 — 과학봇의 과목은 「통합과학」이다. 이름이 그대로
 * 겹치는 것을 먼저 보고, 없으면 품고 있는 것을 찾는다. 둘 다 아니면 `null` 이라 수정 화면이
 * 「과목을 골라야 해요」로 막는다 — 모르는 과목을 아무거나로 채우는 것보다 낫다.
 */
function toSubject(subject: string): SubjectId | null {
  const exact = subjectIds.find((id) => subjectMeta[id].label === subject);
  if (exact) return exact;
  return subjectIds.find((id) => subject.includes(subjectMeta[id].label)) ?? null;
}

/**
 * 카탈로그의 말투 다섯 → 빌더의 셋.
 * 빌더는 「존댓말이냐 · 반말이냐 · 짧게냐」 세 갈래로만 묻는다. 차분은 정중 쪽,
 * 열정은 친근 쪽에 붙는다 — 둘 다 존댓말/반말 축에서 같은 편이다.
 */
const TONE_OF: Record<ClassBot['tone'], ToneId> = {
  정중: 'polite',
  차분: 'polite',
  친근: 'friendly',
  열정: 'friendly',
  스파르타: 'firm',
};

/** 고를 수 있는 학년 밖의 값이면 기본값으로 — 아무 칩도 안 눌린 채로 열리지 않게 한다. */
function toGrade(grade: string): string {
  return (grades as readonly string[]).includes(grade) ? grade : emptyDraft.grade;
}

export function botDraft(row: TeacherBotRow): BotDraft {
  const { bot, ops } = row;
  return {
    ...emptyDraft,
    subject: toSubject(bot.subject),
    grade: toGrade(bot.grade),
    name: bot.name,
    tone: TONE_OF[bot.tone],
    scope: bot.scope,
    // 반은 운영 기록이 갖는다(`BotOps.classrooms`) — 카탈로그가 아니라 거기서 읽는다
    classes: ops.classrooms.map((c) => c.id),
  };
}
