/**
 * 학생 홈 봇 카드 미리보기 데이터.
 * 권위: [04 § 9.2](proc/spec/04-ux-flow.md) — "마지막 메시지 1줄 + 미완료/라이브 카운트 + 1차 CTA"
 *
 * 추출본에서는 mock 1순위 마지막 발화만 보유. v2에서는 채팅 영구 저장소 또는
 * 서버에서 최신 turn을 가져오는 hook으로 대체.
 */

export type BotHomePreview = {
  /** 1줄 — text.tertiary로 노출, 24자 권장 */
  lastMessage: string;
  /** "n분 전" / "어제 19:50" 등 시각 라벨 */
  lastAt: string;
};

const PREVIEWS: Record<string, BotHomePreview> = {
  cb_001: { lastMessage: '오늘 진도 잘 따라왔어. 내일 변곡점 같이 보자.', lastAt: '오늘 19:55' },
  cb_002: { lastMessage: '빈칸 5번 다시 살펴봐요. 접속사가 핵심이에요.', lastAt: '오늘 20:48' },
  cb_003: { lastMessage: '전기회로 1차 정리 끝. 직렬·병렬 헷갈리지 마라.', lastAt: '어제 18:32' },
  cb_004: { lastMessage: '비문학 주제 1줄 요약 잘했어요. 다음은 근거 분류.', lastAt: '3일 전' },
  cb_005: { lastMessage: '시사 분석 한 칸씩 가보자! 다음엔 입장 매트릭스.', lastAt: '오늘 21:10' },
};

export function getBotHomePreview(botId: string): BotHomePreview | null {
  return PREVIEWS[botId] ?? null;
}
