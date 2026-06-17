import { render, screen } from '@testing-library/react';
import { BotIdentityCard } from '../bot-identity-card';
import { classBots } from '@/lib/mock';

const bot = classBots[0]; // 수학이 형, isLive=true, scope=3

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
