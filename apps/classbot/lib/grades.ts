/**
 * 학년 목록 — 초1~고3. 손으로 적게 두면 「고2」·「고 2」·「2학년」이 한 화면에 섞인다.
 *
 * 반 만들기 폼(`app/(teacher)/teacher/classroom/create-classroom-form.tsx`)·봇 만들기 폼
 * (`app/(teacher)/teacher/classroom/[id]/class-bot-tab.tsx`)·과제 내기 폼
 * (`app/(teacher)/teacher/assignment/new/assignment-form.tsx`)이 같은 고르개를 쓴다. 정본 `subject`·`grade` 는
 * 선택 칸이라 빈 값(「안 정함」)을 강제하지 않는다 — 고르개의 빈 option 은 각 폼이 둔다.
 *
 * 과제 내기는 목록에 **없는 값이 자동 채움으로 올 수 있다**(옛 반·옛 봇이 손으로 적던 시절의 글자). 그 폼은 그 값을
 * 선택지로 한 줄 더 세워 지우지 않는다 — 목록을 넓히는 것이 아니라, 이미 저장된 것을 잃지 않으려는 것이다.
 */
export const GRADES = [
  '초1', '초2', '초3', '초4', '초5', '초6',
  '중1', '중2', '중3',
  '고1', '고2', '고3',
] as const;

export type Grade = (typeof GRADES)[number];
