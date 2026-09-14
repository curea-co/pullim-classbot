/**
 * 교사의 학급 목록 — 학급은 **봇과 독립된 자원**이다.
 *
 * `lib/db/schema.ts` 의 `classrooms` 테이블이 그렇게 잡혀 있다 (id · label · organization ·
 * teacherId). 봇에 붙는 것은 그 다음 일이고, 참여 코드가 `(bot_id, classroom_id)` 짝을
 * 가리키는 것도 둘이 별개 자원이기 때문이다.
 *
 * 이 파일이 그 마스터 목록의 mock 이다. 종전에는 목록이 따로 없어 `BotOps.classrooms`
 * (= 봇에 붙은 학급)를 학급 목록처럼 썼는데, 그러면 **아직 어느 봇에도 안 붙은 학급을
 * 표현할 수 없다** — 교사가 첫 봇을 만들 때 고를 반이 하나도 없게 된다.
 *
 * 권위 관계:
 *  - 학급 이름은 참여 코드 맵(`class-codes.ts` `CODE_MAP`)·운영 사실(`classbot-teacher-ops.ts`)과
 *    **같은 id·label** 을 쓴다. 어긋나면 학생이 코드로 들어간 반과 교사가 보는 반이 달라진다.
 *  - 봇이 붙었는지 여부는 여기 담지 않는다. 그건 `BotOps.classrooms` 가 갖는다.
 */

export type TeacherClassroom = {
  id: string;
  /** 학생·교사가 같이 보는 반 이름 */
  label: string;
  studentCount: number;
};

/**
 * 교사가 가진 학급 전부.
 * 앞의 여섯은 봇이 붙어 있고(`classbot-teacher-ops.ts` 참고), 마지막 하나는 **아직 안 붙은 학급**이다 —
 * 봇 없는 학급이 목록에서 사라지지 않는지 이 데이터가 지킨다.
 */
export const teacherClassrooms: TeacherClassroom[] = [
  { id: 'cr_math_a', label: '중2 수학 A반', studentCount: 18 },
  { id: 'cr_eng_a', label: '중3 영어 읽기반', studentCount: 12 },
  { id: 'cr_sci_a', label: '통합과학 심화반', studentCount: 17 },
  { id: 'cr_kor_a', label: '중3 국어 A반', studentCount: 9 },
  { id: 'cr_kor_b', label: '중3 국어 B반', studentCount: 7 },
  { id: 'cr_soc_a', label: '고1 사회 탐구반', studentCount: 14 },
  { id: 'cr_math_b', label: '중2 수학 B반', studentCount: 15 },
];

export function classroomById(id: string): TeacherClassroom | undefined {
  return teacherClassrooms.find((c) => c.id === id);
}
