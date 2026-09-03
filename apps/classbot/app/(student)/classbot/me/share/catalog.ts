import type { LucideIcon } from 'lucide-react';
import { BookOpen, HeartOff, ListX, MessageCircleOff } from 'lucide-react';

import type { ConsentType } from '@/hooks/api/consents';

/**
 * 공유 화면이 말하는 **두 목록** — 나갈 수 있는 것과, 어떻게 해도 안 나가는 것.
 *
 * 두 목록을 한 파일에 둔 이유: 둘은 같은 문장의 앞뒤다. 「무엇을 주나」만 적어 두면
 * 학생은 적히지 않은 것들의 처지를 짐작해야 하고, 짐작은 대체로 「저것도 딸려 가겠지」로
 * 기운다. 경계는 양쪽에서 적어야 눈에 보인다.
 *
 * ⛔ **여기에 줄을 더하는 것은 화면 작업이 아니다.** 위 목록에 타입을 더하려면 서버가
 * 그 타입을 알아야 하고(계약 §1 — `type` 값 추가), 아래 목록에서 줄을 빼려면 그 데이터가
 * 실제로 나가기 시작한다는 뜻이다. 특히 **기분 체크인은 이 동의에 딸려 나가면 안 된다**
 * (계약 §0 — 감정·웰빙은 별도 동의). 화면에서만 지우면 문서와 화면이 어긋난다.
 */

export interface ShareableItem {
  type: ConsentType;
  icon: LucideIcon;
  label: string;
  /**
   * 이 동의 하나로 나가는 칸들을 **하나씩** 적는다.
   * 「학습 요약」처럼 뭉뚱그리면 학생은 자기가 무엇을 줬는지 끝내 모른다.
   */
  fields: string[];
}

/** 지금 켤 수 있는 것. 동의는 타입별로 쪼갠다 — 한 줄이 한 동의다. */
export const SHAREABLE_ITEMS: readonly ShareableItem[] = [
  {
    type: 'self_study_summary',
    icon: BookOpen,
    label: '혼자 공부한 기록',
    fields: [
      '내가 담은 봇 이름과 과목',
      '봇을 담은 날',
      '이번 주에 공부한 날 수',
      '며칠 이어서 공부했는지',
    ],
  },
];

/** 어떻게 해도 안 나가는 것. 켜고 끄는 자리가 아예 없다 — 그래서 스위치도 안 그린다. */
export const NEVER_SHARED: ReadonlyArray<{
  icon: LucideIcon;
  label: string;
  note: string;
}> = [
  {
    icon: MessageCircleOff,
    label: '봇과 나눈 대화',
    note: '무슨 말을 했는지도, 줄여 놓은 요약도 나가지 않아요.',
  },
  {
    icon: HeartOff,
    label: '기분 체크인',
    note: '이 공유에 딸려 가지 않아요. 여기에는 켜는 자리도 없어요.',
  },
  {
    icon: ListX,
    label: '틀린 문제',
    note: '어느 문제를 몇 개 틀렸는지는 나가지 않아요.',
  },
];
