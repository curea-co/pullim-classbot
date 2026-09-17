/**
 * 교사 대화 기록 뷰어 — 줄마다 시각·화자·본문이 서고, 신호가 `messageId` 로 가리키는 자리에 칩이 붙으며, 「확인함」이
 * `onAck` 을 부르고, 확인된 신호는 버튼 대신 「확인함」으로 읽히는 것. 세기 4 이상 줄은 빨강, 학습 문맥 강등은 한 마디.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { SignalMark, TranscriptRow } from '@/lib/risk-signals';
import { MemberTranscript } from '../member-transcript';

const AT = Date.parse('2026-09-17T01:00:00.000Z');

const ROWS: TranscriptRow[] = [
  { id: 'msg_1', role: 'user', content: '답 알려줘', cardType: null, botId: 'bot_1', at: AT },
  { id: 'msg_2', role: 'assistant', content: '어디까지 생각했는지 먼저 말해 줄래?', cardType: null, botId: 'bot_1', at: AT + 5_000 },
  { id: 'msg_3', role: 'assistant', content: null, cardType: 'quiz', botId: 'bot_1', at: AT + 6_000 },
  { id: 'msg_4', role: 'user', content: '주인공은 왜 자살했나요', cardType: null, botId: 'bot_1', at: AT + 60_000 },
];

function mark(over: Partial<SignalMark>): SignalMark {
  return {
    id: 'sig_1', studentId: 's_1', kind: 'answer_seeking', label: '답 구하기', severity: 2, high: false, academic: false,
    downgradedFrom: null, category: null, categoryLabel: null, tier: null, messageId: 'msg_1',
    createdAt: '2026-09-17T01:00:00.000Z', ackedAt: null, acked: false, ...over,
  };
}

describe('MemberTranscript', () => {
  it('줄마다 화자·본문이 서고 카드 블록은 종류만 말한다', () => {
    render(<MemberTranscript studentName="김학생" rows={ROWS} marks={[]} onAck={jest.fn()} pendingAckIds={new Set()} />);

    expect(within(screen.getByTestId('transcript-msg-msg_1')).getByText('김학생')).toBeInTheDocument();
    expect(within(screen.getByTestId('transcript-msg-msg_2')).getByText('봇')).toBeInTheDocument();
    expect(screen.getByTestId('transcript-msg-msg_3')).toHaveTextContent('카드 · 퀴즈');
    expect(screen.queryByTestId('signal-list')).toBeNull();
  });

  it('신호는 원문 자리에 칩으로 붙고, 「확인함」을 누르면 그 신호 id 로 onAck 이 불린다', () => {
    const onAck = jest.fn();
    render(
      <MemberTranscript
        studentName="김학생"
        rows={ROWS}
        marks={[mark({ id: 'sig_1', messageId: 'msg_1' }), mark({ id: 'sig_2', messageId: 'msg_1', kind: 'repeat_bypass', label: '반복 시도', acked: true, ackedAt: '2026-09-17T01:30:00.000Z' })]}
        onAck={onAck}
        pendingAckIds={new Set()}
      />,
    );

    const row = screen.getByTestId('transcript-msg-msg_1');
    expect(within(row).getByTestId('signal-mark-sig_1')).toHaveTextContent('답 구하기');
    expect(within(row).getByTestId('signal-mark-sig_2')).toHaveTextContent('반복 시도');
    // 확인된 신호에는 버튼이 없다 — 「확인함」 글자만.
    expect(within(row).queryByTestId('signal-ack-sig_2')).toBeNull();
    expect(within(row).getByTestId('signal-mark-sig_2')).toHaveTextContent('확인함');

    fireEvent.click(within(row).getByTestId('signal-ack-sig_1'));
    expect(onAck).toHaveBeenCalledWith('sig_1');

    // 위 목록에도 같은 신호가 있고 원문으로 뛰는 길이 있다.
    const list = screen.getByTestId('signal-list');
    expect(within(list).getAllByRole('button', { name: '원문 보기' })).toHaveLength(2);
  });

  it('확인 요청이 나가 있는 신호의 버튼은 잠긴다', () => {
    render(<MemberTranscript studentName="김학생" rows={ROWS} marks={[mark({})]} onAck={jest.fn()} pendingAckIds={new Set(['sig_1'])} />);
    for (const button of screen.getAllByTestId('signal-ack-sig_1')) expect(button).toBeDisabled();
  });

  it('세기 4 이상 줄은 위험으로 읽히고, 위기 갈래가 글자로 붙으며, 학습 문맥 강등은 원래 세기까지 글자에 싣는다', () => {
    render(
      <MemberTranscript
        studentName="김학생"
        rows={ROWS}
        marks={[
          mark({ id: 'sig_hi', messageId: 'msg_1', kind: 'crisis_keyword', label: '위기 신호', severity: 5, high: true, category: 'suicide_self_harm', categoryLabel: '자살·자해', tier: 5 }),
          mark({ id: 'sig_ac', messageId: 'msg_4', kind: 'crisis_keyword', label: '위기 신호', severity: 2, academic: true, downgradedFrom: 4, category: 'school_violence', categoryLabel: '학교폭력', tier: 1 }),
        ]}
        onAck={jest.fn()}
        pendingAckIds={new Set()}
      />,
    );

    const hi = within(screen.getByTestId('transcript-msg-msg_1')).getByTestId('signal-mark-sig_hi');
    expect(within(hi).getByLabelText('세기 5 · 위험')).toBeInTheDocument();
    expect(within(hi).getByText('자살·자해')).toHaveAttribute('title', '5단계');
    expect(screen.getByTestId('transcript-msg-msg_1').className).toContain('bg-pullim-danger-bg');

    const ac = within(screen.getByTestId('transcript-msg-msg_4')).getByTestId('signal-mark-sig_ac');
    // 원래 세기는 툴팁이 아니라 글자에 — 키보드·낭독기·터치에서도 읽힌다.
    expect(within(ac).getByText('학습 문맥으로 낮춤 · 원래 세기 4')).toBeInTheDocument();
    expect(within(ac).getByText('학교폭력')).toBeInTheDocument();
    expect(within(ac).getByLabelText('세기 2')).toBeInTheDocument();
    expect(screen.getByTestId('transcript-msg-msg_4').className).not.toContain('bg-pullim-danger-bg');
  });

  it('원문이 지워진 신호(messageId null)는 목록에 「원문 없음」으로만 남는다', () => {
    render(<MemberTranscript studentName="김학생" rows={ROWS} marks={[mark({ id: 'sig_gone', messageId: null })]} onAck={jest.fn()} pendingAckIds={new Set()} />);
    const list = screen.getByTestId('signal-list');
    expect(within(list).getByText('원문 없음')).toBeInTheDocument();
    expect(within(list).queryByRole('button', { name: '원문 보기' })).toBeNull();
  });

  it('기록이 없으면 빈 상태', () => {
    render(<MemberTranscript studentName="김학생" rows={[]} marks={[]} onAck={jest.fn()} pendingAckIds={new Set()} />);
    expect(screen.getByText('아직 기록이 없어요')).toBeInTheDocument();
  });
});
