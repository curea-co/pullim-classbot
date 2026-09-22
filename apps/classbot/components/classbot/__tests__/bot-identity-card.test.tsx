import { render, screen } from '@testing-library/react';
import { BotIdentityCard } from '../bot-identity-card';
import { classBots } from '@/lib/mock';

const bot = classBots[0]; // 수학봇, isLive=true, scope=3

describe('BotIdentityCard', () => {
  it('renders bot name as h1 by default', () => {
    render(<BotIdentityCard bot={bot} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(bot.name);
  });

  it('renders bot name as h2 when headingLevel="h2"', () => {
    render(<BotIdentityCard bot={bot} headingLevel="h2" />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent(bot.name);
  });

  it('renders bot name as span when headingLevel="span"', () => {
    render(<BotIdentityCard bot={bot} headingLevel="span" />);
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByText(bot.name).tagName.toLowerCase()).toBe('span');
  });

  it('shows org eyebrow when not collapsed', () => {
    render(<BotIdentityCard bot={bot} />);
    expect(screen.getByText(/클래스봇/)).toBeInTheDocument();
    expect(screen.getByText(/클래스봇/).textContent).toContain(bot.organization);
  });

  it('hides org eyebrow when collapsed', () => {
    render(<BotIdentityCard bot={bot} collapsed />);
    expect(screen.queryByText(/클래스봇/)).toBeNull();
  });

  it('live bot avatar gets pullim-anim-bot-breath class', () => {
    const { container } = render(<BotIdentityCard bot={bot} />);
    // bot is live — avatar should have breath animation class
    expect(container.querySelector('.pullim-anim-bot-breath')).not.toBeNull();
  });

  it('non-live bot avatar does NOT get pullim-anim-bot-breath class', () => {
    const nonLiveBot = { ...bot, isLive: false };
    const { container } = render(<BotIdentityCard bot={nonLiveBot} />);
    expect(container.querySelector('.pullim-anim-bot-breath')).toBeNull();
  });

  it('shows teacherName 디지털 분신 suffix', () => {
    render(<BotIdentityCard bot={bot} />);
    expect(screen.getByText(new RegExp(`${bot.teacherName}의 디지털 분신`))).toBeInTheDocument();
  });

  /*
    풀림 공식 봇 — spec `03 § 4.13.3`.

    「디지털 분신」은 **선생님의 복제**라는 뜻이라(`07 § 1`) 복제할 사람이 없는 봇에 붙으면
    거짓이다. 그런데 그 말 자체가 틀린 게 아니라 **붙은 자리가 틀렸던** 것이므로, 아래 두
    건은 **짝으로** 본다 — 공식 봇에서 사라지는가, 그리고 교사 봇에서 그대로 사는가.
    이 패널은 학생·교사가 함께 쓰는 primitive 라, 한쪽을 고치다 다른 쪽 겉모습을 바꾸면
    고친 화면보다 안 고친 화면에서 먼저 티가 난다.
  */
  it('공식 봇은 「…의 디지털 분신」을 쓰지 않는다 — 복제할 사람이 없다', () => {
    const officialBot = { ...bot, teacherName: '풀림 공식', isOfficial: true };
    render(<BotIdentityCard bot={officialBot} />);

    expect(screen.queryByText(/디지털 분신/)).toBeNull();
    // 그 자리를 비워 두지 않는다 — 무엇인지 한 마디로 말한다.
    expect(screen.getByText('풀림이 만든 봇')).toBeInTheDocument();
  });

  it('교사 봇은 「…의 디지털 분신」 그대로 — 그 말을 걷은 것이 아니다', () => {
    // `isOfficial` 이 명시적으로 false 인 길(마켓이 교사 봇이라고 알려준 봇).
    render(<BotIdentityCard bot={{ ...bot, isOfficial: false }} />);

    expect(screen.getByText(`${bot.teacherName}의 디지털 분신`)).toBeInTheDocument();
    expect(screen.queryByText('풀림이 만든 봇')).toBeNull();
  });

  it('`isOfficial` 이 아예 없는 봇도 종전 그대로 — 모르는 값에 공식 봇 모양을 씌우지 않는다', () => {
    // 카탈로그·`fallbackBot()` 이 세우는 봇에는 그 칸이 없다(`ClassBot.isOfficial?`).
    expect(bot.isOfficial).toBeUndefined();
    render(<BotIdentityCard bot={bot} />);

    expect(screen.getByText(`${bot.teacherName}의 디지털 분신`)).toBeInTheDocument();
  });

  it('shows scope badge with Shield icon and Korean label + mono code', () => {
    render(<BotIdentityCard bot={bot} />);
    // scope 3 → '교과 범위' label and 'L3' code
    expect(screen.getByText('교과 범위')).toBeInTheDocument();
    expect(screen.getByText('(L3)')).toBeInTheDocument();
  });

  it('hides subject/grade chips and children when collapsed', () => {
    render(
      <BotIdentityCard bot={bot} collapsed>
        <span>child-content</span>
      </BotIdentityCard>,
    );
    expect(screen.queryByText(bot.subject)).toBeNull();
    expect(screen.queryByText('child-content')).toBeNull();
  });

  it('shows children when not collapsed', () => {
    render(
      <BotIdentityCard bot={bot}>
        <span>child-content</span>
      </BotIdentityCard>,
    );
    expect(screen.getByText('child-content')).toBeInTheDocument();
  });

  it('renders leading and trailing slots', () => {
    render(
      <BotIdentityCard
        bot={bot}
        leading={<span>leading-slot</span>}
        trailing={<span>trailing-slot</span>}
      />,
    );
    expect(screen.getByText('leading-slot')).toBeInTheDocument();
    expect(screen.getByText('trailing-slot')).toBeInTheDocument();
  });

  it('showSignatureLiner renders the liner swipe element', () => {
    const { container } = render(<BotIdentityCard bot={bot} showSignatureLiner />);
    expect(container.querySelector('.pullim-anim-liner-swipe')).not.toBeNull();
  });

  it('does NOT show liner when showSignatureLiner is falsy', () => {
    const { container } = render(<BotIdentityCard bot={bot} />);
    expect(container.querySelector('.pullim-anim-liner-swipe')).toBeNull();
  });

  it('applies comfortable padding (p-5) by default', () => {
    const { container } = render(<BotIdentityCard bot={bot} />);
    const panel = container.firstElementChild;
    expect(panel).toHaveClass('p-5');
  });

  it('applies compact padding (p-3) when density="compact"', () => {
    const { container } = render(<BotIdentityCard bot={bot} density="compact" />);
    const panel = container.firstElementChild;
    expect(panel).toHaveClass('p-3');
  });

  it('applies dark gradient panel classes', () => {
    const { container } = render(<BotIdentityCard bot={bot} />);
    const panel = container.firstElementChild;
    expect(panel).toHaveClass('rounded-2xl', 'border', 'bg-gradient-to-br', 'text-white');
  });

  it('applies className prop', () => {
    const { container } = render(<BotIdentityCard bot={bot} className="custom-test-class" />);
    expect(container.firstElementChild).toHaveClass('custom-test-class');
  });
});
