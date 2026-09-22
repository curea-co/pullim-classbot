/** 봇 도메인의 react-query 키. 순환 import 없이 봇·반 쓰기가 같은 캐시를 무효화한다. */
export const botKeys = {
  /** 정본 — 내 봇 목록(`GET /classbot/me/bots`). 신원 id 는 호출부가 꼬리에 붙인다. */
  myBots: ['my-bots'] as const,
};
