import React from 'react';
import { render, screen } from '@testing-library/react';
import { TeacherPageShell } from '../teacher-page-shell';

describe('TeacherPageShell', () => {
  it('renders back-link with href and label', () => {
    render(
      <TeacherPageShell
        backHref="/teacher"
        backLabel="교사 홈"
        header={{ title: 'Test Page' }}
      >
        Test content
      </TeacherPageShell>
    );

    const backLink = screen.getByRole('link', { name: /교사 홈/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/teacher');
  });

  it('renders page header with provided props', () => {
    render(
      <TeacherPageShell
        backHref="/teacher"
        backLabel="교사 홈"
        header={{
          title: 'AI 초안 검수',
          description: 'Test description',
        }}
      >
        Test content
      </TeacherPageShell>
    );

    expect(screen.getByRole('heading', { name: /AI 초안 검수/i })).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <TeacherPageShell
        backHref="/teacher"
        backLabel="교사 홈"
        header={{ title: 'Test Page' }}
      >
        <div>Test child content</div>
      </TeacherPageShell>
    );

    expect(screen.getByText('Test child content')).toBeInTheDocument();
  });

  it('applies the default section rhythm (space-y-7, no own vertical padding)', () => {
    const { container } = render(
      <TeacherPageShell
        backHref="/teacher"
        backLabel="교사 홈"
        header={{ title: 'Test Page' }}
      >
        Test content
      </TeacherPageShell>
    );

    // 섹션 간격 28px — 카드 패딩(20px)보다 넓어야 카드 경계가 읽힌다.
    // 세로 패딩은 주지 않는다 — DashboardShell(24px) + Breadcrumb(24px)이 이미 준다.
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('space-y-7');
    expect(wrapper).not.toHaveClass('py-4', 'lg:py-6');
  });

  it('groups the back-link with the header instead of giving it its own section gap', () => {
    const { container } = render(
      <TeacherPageShell
        backHref="/teacher"
        backLabel="교사 홈"
        header={{ title: 'Test Page' }}
      >
        Test content
      </TeacherPageShell>
    );

    const headerGroup = container.querySelector('a')?.parentElement;
    expect(headerGroup).toHaveClass('space-y-2');
    expect(headerGroup?.querySelector('header')).not.toBeNull();
  });

  it('renders back-link before page header', () => {
    const { container } = render(
      <TeacherPageShell
        backHref="/teacher"
        backLabel="교사 홈"
        header={{ title: 'Test Page' }}
      >
        Test content
      </TeacherPageShell>
    );

    const elements = Array.from(container.querySelectorAll('a, header'));
    const linkIndex = elements.findIndex(el => el.tagName === 'A');
    const headerIndex = elements.findIndex(el => el.tagName === 'HEADER');

    expect(linkIndex).toBeLessThan(headerIndex);
  });

  it('renders page header before children', () => {
    const { container } = render(
      <TeacherPageShell
        backHref="/teacher"
        backLabel="교사 홈"
        header={{ title: 'Test Page' }}
      >
        <div data-testid="child-content">Test content</div>
      </TeacherPageShell>
    );

    const elements = Array.from(container.querySelectorAll('header, [data-testid="child-content"]'));
    const headerIndex = elements.findIndex(el => el.tagName === 'HEADER');
    const childIndex = elements.findIndex(el => el.hasAttribute('data-testid'));

    expect(headerIndex).toBeLessThan(childIndex);
  });

  it('supports eyebrow in header prop', () => {
    render(
      <TeacherPageShell
        backHref="/teacher"
        backLabel="교사 홈"
        header={{
          title: 'Test Page',
          eyebrow: { text: 'TEST SECTION' },
        }}
      >
        Test content
      </TeacherPageShell>
    );

    expect(screen.getByText('TEST SECTION')).toBeInTheDocument();
  });

  it('renders with action prop in header', () => {
    render(
      <TeacherPageShell
        backHref="/teacher"
        backLabel="교사 홈"
        header={{
          title: 'Test Page',
          action: <button>Action Button</button>,
        }}
      >
        Test content
      </TeacherPageShell>
    );

    expect(screen.getByRole('button', { name: /Action Button/i })).toBeInTheDocument();
  });
});
