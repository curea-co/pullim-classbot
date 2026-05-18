/**
 * 라이브 세션 콘텐츠 — 봇별 transcript 시퀀스 + 슬라이드 메타.
 * 교사가 라이브 시작 시 이 데이터로 시뮬레이션 stream이 흐른다.
 * 라이브 종료 시 transcript snapshot이 리플레이로 변환된다.
 */

export type LiveTranscriptLine = {
  speaker: 'teacher' | 'bot';
  text: string;
  /** 시작 후 N초 (시뮬레이션 cursor 기준) */
  atSec: number;
};

export type LiveContent = {
  botId: string;
  slideTitle: string;
  slideSubtitle: string;
  slideStart: number;
  slideTotal: number;
  /** 마이크 ON 라벨 */
  micLabel: string;
  /** 라이브 시뮬 transcript */
  transcript: LiveTranscriptLine[];
  /** 라이브 종료 후 봇이 추출할 핵심 메시지 (검수 단계 진입 시 표시) */
  keyTakeaways: string[];
  /** 진행 시간(분) — 종료 시 리플레이 durationMin에 사용 */
  durationMin: number;
};

export const liveContents: Record<string, LiveContent> = {
  cb_001: {
    botId: 'cb_001',
    slideTitle: '도함수 부호 변화',
    slideSubtitle: "f'(x) = 0 → 부호 표 → 극값 판정",
    slideStart: 12,
    slideTotal: 30,
    micLabel: '김수학 선생님 음성 ON',
    transcript: [
      { atSec: 0,    speaker: 'teacher', text: '오늘은 도함수 활용 중에서 극값 판정을 다뤄볼게요.' },
      { atSec: 4,    speaker: 'teacher', text: "먼저 f'(x) = 0인 x를 찾는 것부터 시작합니다." },
      { atSec: 8,    speaker: 'teacher', text: '여기서 부호가 바뀌면 극값이고, 안 바뀌면 극값이 아니에요.' },
      { atSec: 12,   speaker: 'bot',     text: '[봇 정리] + → − 면 극대, − → + 면 극소.' },
      { atSec: 16,   speaker: 'teacher', text: '슬라이드 12를 봐주세요. 예시 함수가 있죠.' },
      { atSec: 20,   speaker: 'teacher', text: '여러분이 직접 부호 변화 표를 그려보세요. 3분 드립니다.' },
      { atSec: 24,   speaker: 'bot',     text: '[봇] 시간 안내 — 3분 타이머 시작.' },
      { atSec: 28,   speaker: 'teacher', text: '하윤 학생이 좋은 질문을 줬어요. 전체에 공유합니다.' },
      { atSec: 32,   speaker: 'teacher', text: '"f\'(x)=0이면 무조건 극값인가요?" — 좋은 의문이죠.' },
      { atSec: 36,   speaker: 'teacher', text: '답은 No. 부호 변화가 핵심이에요.' },
    ],
    keyTakeaways: [
      "f'(x) = 0이라고 무조건 극값은 아님 — 부호 변화가 본질",
      '+ → − 부호 변화: 극대 / − → +: 극소 / 변화 없음: 극값 X',
      '풀이 절차: 도함수 → 0인 점 → 부호 표 → 극값 판정 4단계',
    ],
    durationMin: 50,
  },
  cb_002: {
    botId: 'cb_002',
    slideTitle: '빈칸 추론 — 접속사 논리 관계',
    slideSubtitle: '역접/인과/예시 표시 → 후보 단어',
    slideStart: 7,
    slideTotal: 25,
    micLabel: '박영어 선생님 음성 ON',
    transcript: [
      { atSec: 0,  speaker: 'teacher', text: '오늘은 빈칸 추론 7유형 중 접속사 논리 관계를 다뤄요.' },
      { atSec: 4,  speaker: 'teacher', text: '빈칸 앞뒤 문장의 논리 관계부터 표시하는 게 1단계예요.' },
      { atSec: 8,  speaker: 'bot',     text: '[봇 정리] 역접(however/but) / 인과(thus/therefore) / 예시(for example).' },
      { atSec: 12, speaker: 'teacher', text: '관계만 맞히면 후보 단어는 두 개로 좁혀집니다.' },
      { atSec: 16, speaker: 'teacher', text: '슬라이드 7 — 실제 모의고사 문장 보세요.' },
      { atSec: 20, speaker: 'teacher', text: '2분 안에 관계만 표시해보세요.' },
      { atSec: 24, speaker: 'bot',     text: '[봇] 2분 타이머 시작.' },
      { atSec: 28, speaker: 'teacher', text: '서연 학생이 답을 골랐네요. 전체 공유합니다.' },
      { atSec: 32, speaker: 'teacher', text: '"however가 핵심이라서 빈칸은 반대 의미" — 정답입니다.' },
    ],
    keyTakeaways: [
      '빈칸 추론은 글의 논리 관계가 1차 단서',
      '역접·인과·예시 세 접속사군 식별이 80%',
      '후보 단어를 두 개로 좁힌 뒤 문맥으로 최종 선택',
    ],
    durationMin: 50,
  },
  cb_005: {
    botId: 'cb_005',
    slideTitle: '현대사회 쟁점 — 갈등 사례 분석',
    slideSubtitle: '입장 / 근거 분리 + 매트릭스',
    slideStart: 5,
    slideTotal: 20,
    micLabel: '강사회 선생님 음성 ON',
    transcript: [
      { atSec: 0,  speaker: 'teacher', text: '자, 오늘 현대사회 쟁점 들어갑니다. 가보자!' },
      { atSec: 4,  speaker: 'teacher', text: '분석은 두 축이에요 — 입장이랑 근거.' },
      { atSec: 8,  speaker: 'bot',     text: '[봇] 입장: 누가·무엇을·왜 주장. 근거: 사실 vs 가치판단.' },
      { atSec: 12, speaker: 'teacher', text: '슬라이드 5 사례 — 환경 vs 개발. 두 입장 매트릭스 그려봐.' },
      { atSec: 16, speaker: 'teacher', text: '3분! 짧고 빠르게.' },
      { atSec: 20, speaker: 'bot',     text: '[봇] 3분 타이머. 입장 매트릭스 템플릿 화면에 띄움.' },
      { atSec: 24, speaker: 'teacher', text: '도현 학생 좋은 정리네요. 전체 공유!' },
      { atSec: 28, speaker: 'teacher', text: '"사실 근거랑 가치 근거가 섞여 있다" — 맞아, 그게 핵심이야.' },
    ],
    keyTakeaways: [
      '시사 이슈 분석 = 입장 + 근거 두 축',
      '입장: 누가·무엇을·왜. 근거: 사실(데이터) vs 가치판단(의견)',
      '매트릭스화하면 쟁점이 바로 보임',
    ],
    durationMin: 50,
  },
};

export function getLiveContent(botId: string): LiveContent | undefined {
  return liveContents[botId];
}
