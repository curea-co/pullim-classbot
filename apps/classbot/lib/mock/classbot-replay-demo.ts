/**
 * 데모 리플레이 시드 (회고 깊이 데모용). spec §2 / PR-B.
 *
 * `studentReplays`는 출시 빈 배열이라 회고를 보여줄 리플레이가 없다. 데모/미인증에서
 * 회고 카드·시험지 재도전을 시연할 수 있도록 sent 리플레이 2건을 시드한다.
 * 약점 키(atSec)는 classbot-replay-exam의 getReplayQuiz 시드와 일치:
 *   - rp_demo_math @1100 (오답 퀴즈) → 수학 〈보기〉 문항
 *   - rp_demo_eng  @740  (오답 퀴즈) → 영어 지문 문항
 * rp_demo_math는 1920s(변곡점, ownedByMe)에 집중 저하 1건도 포함(다시보기/질문만).
 */
import type {
  Replay, ReplaySegment, TranscriptLine, ReplayBookmark,
  ReplayTeacherQuestion, ReplayViewerStats,
} from './classbot';

const NO_STATS: ReplayViewerStats = {
  enrolledCount: 18, startedCount: 16, completedCount: 11,
  avgWatchedPct: 82, totalQuestions: 9, totalBookmarks: 14,
};

function makeDemoReplay(over: Partial<Replay> & Pick<Replay, 'id' | 'botId' | 'botName' | 'title' | 'chapter' | 'durationMin' | 'segments' | 'focusBins'>): Replay {
  return {
    lessonId: `${over.id}_lesson`,
    classroom: '고2 A반',
    date: '2026-06-24',
    startedAt: '19:00',
    endedAt: '어제 19:35',
    participantCount: 18,
    status: 'sent',
    aiProcessedAt: '어제 19:50',
    sentAt: '어제 20:05',
    myAccuracy: 67,
    keyTakeaways: [],
    transcript: [],
    watchProgress: { lastSec: 0, completed: true },
    bookmarks: [] as ReplayBookmark[],
    teacherQuestions: [] as ReplayTeacherQuestion[],
    viewerStats: NO_STATS,
    ...over,
  };
}

const mathSegments: ReplaySegment[] = [
  { at: '0:00', atSec: 0, ratio: 0, type: 'concept', label: '극값의 정의' },
  { at: '18:20', atSec: 1100, ratio: 1100 / 2100, type: 'quiz', label: 'Q3 극대·극소 판정', ownedByMe: true, myAnswer: '극소', correctAnswer: '극대' },
  { at: '32:00', atSec: 1920, ratio: 1920 / 2100, type: 'concept', label: '변곡점', ownedByMe: true },
];
// 35분 → 분당 빈, 32분(변곡점)에서 집중 저하
const mathFocus = Array.from({ length: 35 }, (_, i) => (i === 32 ? 28 : 72 + ((i * 7) % 18)));

const engSegments: ReplaySegment[] = [
  { at: '0:00', atSec: 0, ratio: 0, type: 'concept', label: '빈칸 추론 접근법' },
  { at: '12:20', atSec: 740, ratio: 740 / 900, type: 'quiz', label: 'Q2 빈칸 추론', ownedByMe: true, myAnswer: 'faster', correctAnswer: 'more meaningful' },
];
const engFocus = Array.from({ length: 15 }, (_, i) => 74 + ((i * 5) % 16));

const mathTranscript: TranscriptLine[] = [
  { at: '0:00', atSec: 0, endSec: 1100, speaker: '교사', text: '오늘은 도함수의 부호로 극값을 판정해 볼게요.' },
  { at: '18:20', atSec: 1100, endSec: 1920, speaker: '봇', text: 'Q3 — f′(x)의 부호 변화를 보고 극대·극소를 골라봐요.' },
  { at: '32:00', atSec: 1920, endSec: 2100, speaker: '교사', text: '변곡점은 f″(x)의 부호가 바뀌는 지점이에요.' },
];
const engTranscript: TranscriptLine[] = [
  { at: '0:00', atSec: 0, endSec: 740, speaker: '교사', text: '빈칸 추론은 글의 논리 흐름을 먼저 잡는 게 핵심이에요.' },
  { at: '12:20', atSec: 740, endSec: 900, speaker: '봇', text: 'Q2 — 대조 구조를 보고 빈칸에 들어갈 말을 골라봐요.' },
];

export const demoReplays: Replay[] = [
  makeDemoReplay({
    id: 'rp_demo_math', botId: 'cb_001', botName: '수학이 형',
    title: '도함수의 활용 · 극값', chapter: '미적분 III',
    durationMin: 35, segments: mathSegments, focusBins: mathFocus,
    transcript: mathTranscript, myAccuracy: 67,
    keyTakeaways: [
      '극값은 도함수 f′(x)의 부호가 바뀌는 점에서 생긴다',
      "f′(x)=0 이라고 항상 극값인 것은 아니다(부호 변화 필요)",
      '증감표로 부호 변화를 확인하면 극대·극소를 구분할 수 있다',
    ],
  }),
  makeDemoReplay({
    id: 'rp_demo_eng', botId: 'cb_002', botName: '영어 누나',
    title: '빈칸 추론 집중', chapter: '수능 영어 · 빈칸',
    durationMin: 15, segments: engSegments, focusBins: engFocus,
    transcript: engTranscript, myAccuracy: 75,
    keyTakeaways: [
      '빈칸 앞뒤의 대조·인과 신호어를 먼저 찾는다',
      '지문 단어를 그대로 베낀 선택지는 함정인 경우가 많다',
      '빈칸엔 글 전체 논지와 같은 방향의 말이 들어간다',
    ],
  }),
];
