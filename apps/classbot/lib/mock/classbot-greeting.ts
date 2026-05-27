/**
 * 클래스봇 시간대별 인사 prefix + 봇별 시그니처 인사 결합.
 * 권위: [07-branding § 4.6.1·4.6.3](proc/spec/07-branding.md).
 *
 * 첫 발화 카피가 매 세션 동일하면 "정적 챗봇" 인상을 준다.
 * 시간대 prefix + 봇 자기소개 + 시그니처 1차 질문 = 첫 손맛.
 */

/** ClassBot.tone과 동일 literal union (chat.ts의 내부 BotTone과 중복 — 명세적 단일 진실원은 classbot.ts) */
type BotTone = '정중' | '친근' | '스파르타' | '차분' | '열정';

const HOUR_PREFIXES_INFORMAL: { range: [number, number]; text: string }[] = [
  { range: [6, 10],  text: '좋은 아침이야' },
  { range: [11, 13], text: '점심은 챙겼어?' },
  { range: [14, 17], text: '오후도 만나서 반가워' },
  { range: [18, 21], text: '수업 끝났네! 고생했어' },
  { range: [22, 25], text: '늦은 시간까지 수고가 많아' },
  { range: [0, 1],   text: '늦은 시간까지 수고가 많아' },
];

const HOUR_PREFIXES_FORMAL: { range: [number, number]; text: string }[] = [
  { range: [6, 10],  text: '좋은 아침이에요' },
  { range: [11, 13], text: '점심 챙기셨어요?' },
  { range: [14, 17], text: '오후도 화이팅이에요' },
  { range: [18, 21], text: '수업 마치셨네요, 수고하셨어요' },
  { range: [22, 25], text: '늦은 시간이네요, 조심히 끝내요' },
  { range: [0, 1],   text: '늦은 시간이네요' },
];

const FORMAL_TONES: BotTone[] = ['정중', '차분'];

function pickPrefix(hour: number, tone: BotTone): string | null {
  const table = FORMAL_TONES.includes(tone) ? HOUR_PREFIXES_FORMAL : HOUR_PREFIXES_INFORMAL;
  const match = table.find(({ range }) => hour >= range[0] && hour <= range[1]);
  // 새벽 2~5시는 휴식 권유 (반환 안 함 — 컴포넌트가 fallback)
  if (hour >= 2 && hour <= 5) return null;
  return match?.text ?? null;
}

/**
 * 첫 발화 인사 — 시간대 prefix + 봇 시그니처 인사 결합.
 *
 * @param baseGreeting 봇 `ClassBot.greeting` (mock에서 정의된 봇별 첫 발화)
 * @param studentName  학생 호명 (예: "서연")
 * @param tone         봇 어조 (정중/차분은 존대, 그 외 반말)
 * @param now          현재 시각 (기본: new Date()) — 테스트용 주입 가능
 */
export function composeFirstGreeting(
  baseGreeting: string,
  studentName: string,
  tone: BotTone,
  now: Date = new Date(),
): string {
  const hour = now.getHours();
  const prefix = pickPrefix(hour, tone);

  // 새벽: 휴식 권유 + base greeting 후순위
  if (!prefix) {
    const isFormal = FORMAL_TONES.includes(tone);
    return isFormal
      ? `${studentName} 학생, 새벽이네요. 짧게만 도와드릴게요. ${baseGreeting}`
      : `${studentName}, 새벽이야. 짧게만 도와줄게. ${baseGreeting}`;
  }

  // baseGreeting이 이미 호명("서연 안녕" 등)으로 시작하면 prefix를 호명 앞으로
  const startsWithName = baseGreeting.startsWith(studentName);
  if (startsWithName) {
    const rest = baseGreeting.slice(studentName.length).trimStart();
    return `${prefix}, ${studentName}! ${rest}`.replace(/^([^!.?]*),\s*([^!.?]*)!\s*\1/, '$1, $2!');
  }
  return `${prefix}, ${studentName}! ${baseGreeting}`;
}
