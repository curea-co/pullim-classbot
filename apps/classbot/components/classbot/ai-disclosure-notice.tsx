/**
 * AI 검증 고지 배너 — 봇 답변이 **AI 생성물이며 검증이 필요**함을 상시 고지한다(출시 필수).
 *
 * 근거: 클래스봇 도메인 핸드오프 §13.2 — AI 응답에 "AI 답변, 검증 필요" 고지 기본 표시.
 * 교육 도메인에서 학생이 봇 답변을 무비판 수용하지 않도록 하는 안전 장치다.
 *
 * 배치: 챗 상단(봇 칩 스트립 아래·메시지 위) **고정 1줄** — 봇 수·플래그(실챗/mock)와 무관하게 항상.
 * 버블마다 반복하지 않아 긴 대화에서도 노이즈가 없고, 모든 봇 답변이 AI 라는 사실과 정확히 일치한다.
 *
 * 톤: 경고(빨강) 아님 — 정보성(`role="note"`, slate). 색 규약(blue/slate) 준수.
 */
export function AiDisclosureNotice() {
  return (
    <div
      role="note"
      className="bg-pullim-slate-50 border-pullim-slate-200 text-pullim-slate-500 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
    >
      <span aria-hidden className="text-sm leading-none">
        🤖
      </span>
      <span>봇 답변은 AI가 만들어요 · 중요한 내용은 스스로 확인해요</span>
    </div>
  );
}
