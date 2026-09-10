import type { AssignmentRow, ParentChildItem, StudentClassroomItem } from '@/hooks/api/types';
import { hasSchoolWorkToShow } from '../assignment-status';

/**
 * 여기서 지키는 것은 표시 규칙이 아니라 **계약 §3 의 한 줄**이다 —
 * 부모가 「보여주기로 안 함」과 「보여주기로 했지만 아직 없음」을 구별할 수 있으면 안 된다.
 *
 * 반·과제가 자녀 동의 뒤로 옮겨 가면서(계약 §2) `GET /api/parent/children` 은 미동의
 * 자녀에게 **빈 배열**을 준다. 그래서 이 판정이 두 방향으로 동시에 틀리면 안 된다:
 *
 *  - 빈 배열을 「0개」로 확정하면 → 숨긴 것을 **없는 것으로 바꿔 말한다.**
 *  - 미동의만 따로 「알 수 없음」으로 적으면 → 무활동 자녀와 갈려 **동의 여부가 샌다.**
 *
 * 답은 하나뿐이라 판정도 하나뿐이다: 아무것도 안 온 자녀에게는 **숫자를 아예 안 적는다.**
 * 자기주도 화면의 `hasSomethingToShow` 와 같은 규칙이고, 같은 이유로 잠가 둔다.
 */

const room = (over: Partial<StudentClassroomItem> = {}): StudentClassroomItem =>
  ({
    classroomId: 'c1',
    label: '3학년 2반 수학',
    subject: '수학',
    grade: '중3',
    teacherName: '김수학 선생님',
    organization: '풀림중학교',
    botAvatarEmoji: '🧮',
    ...over,
  }) as StudentClassroomItem;

const assignment = (over: Partial<AssignmentRow> = {}): AssignmentRow =>
  ({
    id: 'a1',
    title: '이차함수 연습',
    dDay: 'D-3',
    state: 'assigned',
    completedCount: 0,
    questionCount: 10,
    ...over,
  }) as AssignmentRow;

const child = (over: Partial<ParentChildItem> = {}): ParentChildItem => ({
  id: 'student_001',
  name: '서연',
  relation: 'mother',
  classrooms: [],
  assignments: [],
  ...over,
});

describe('숫자를 적어도 되는가 — 미동의와 무활동이 같은 자리로 접힌다', () => {
  it('아무것도 안 온 자녀는 false — 미동의든 무활동이든 **같은 답**이다', () => {
    // 미동의 자녀(서버가 반·과제를 읽지도 않는다)와, 동의했지만 아직 반이 없는 자녀는
    // 응답 모양이 똑같다. 이 함수가 둘을 가르면 그 순간 동의 여부가 화면에 샌다.
    const notConsented = child({ name: '민준' });
    const consentedButEmpty = child({ name: '서연' });

    expect(hasSchoolWorkToShow(notConsented)).toBe(false);
    expect(hasSchoolWorkToShow(consentedButEmpty)).toBe(false);
    // 같은 답이어야 한다는 것 자체를 박아 둔다 — 한쪽만 고치는 변경을 여기서 잡는다.
    expect(hasSchoolWorkToShow(notConsented)).toBe(
      hasSchoolWorkToShow(consentedButEmpty),
    );
  });

  it('반이 하나라도 오면 true — 그 자녀는 보여주기로 한 것이 확실하다', () => {
    expect(hasSchoolWorkToShow(child({ classrooms: [room()] }))).toBe(true);
  });

  it('반은 없고 과제만 와도 true — 그때의 「수업방 0개」는 참이다', () => {
    // 과제가 왔다는 것은 동의가 있다는 뜻이라, 0 을 적어도 숨긴 것을 없다고 말하는 게 아니다.
    expect(hasSchoolWorkToShow(child({ assignments: [assignment()] }))).toBe(true);
  });

  it('둘 다 오면 true', () => {
    expect(
      hasSchoolWorkToShow(child({ classrooms: [room()], assignments: [assignment()] })),
    ).toBe(true);
  });
});
