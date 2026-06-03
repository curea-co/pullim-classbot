'use client';

import { GraduationCap, Shield, UserCircle, MessageCircle, Eye, AlarmClock, Check } from 'lucide-react';
import { OnboardingTemplate } from '@/components/shell/onboarding-template';
import { MockBrowser } from '@/components/shell/mock-browser';
import { BotHeader } from '@/components/classbot/bot-header';
import { DemoChat } from './demo-chat';

/**
 * 데모 종료 후 "다음 단계"(선생님이 다 보고 있어요) 카드로 스크롤한다.
 * OnboardingTemplate 이 단계를 스크롤 리스트로 렌더하므로, 다음 단계 CTA(`/classbot/chat`)
 * 를 화면에 들여 후속 흐름을 연다. (04-ux-flow.md § 9.11.2)
 */
function scrollToNextStep() {
  const nextCta = document.querySelector<HTMLElement>('a[href="/classbot/chat"]');
  nextCta?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export default function ClassbotOnboardingPage() {
  return (
    <OnboardingTemplate
      featureName="풀림 클래스봇"
      Icon={GraduationCap}
      identity="내 봇은 우리 선생님이 직접 만든 AI 친구예요. 언제 어디서든 수업 그대로 물어볼 수 있어요."
      estimatedMin={4}
      finalHeading="이제 '수학이 형'한테 인사해 볼까요?"
      finalBody="이제 직접 사용해 보세요. 막히면 언제든 이 페이지로 돌아올 수 있어요."
      steps={[
        {
          Icon: UserCircle,
          title: '내가 받은 봇은 진짜 우리 선생님이 만든 거예요',
          description:
            "‘수학이 형’은 김수학 선생님 수업 그대로 답해요. 우리 반 진도, 우리 학원 자료를 알고 있어요. 다른 반 봇이랑 달라요.",
          bullets: [
            '선생님이 직접 말투(친근·정중·엄격)도 미리 정해 둬요',
            '선생님 PPT·PDF·수업 녹화를 봇이 미리 읽어 뒀어요',
            '네가 풀수록 봇도 점점 똑똑해져요',
          ],
          screenshot: (
            <MockBrowser dark label="봇 정체성">
              <BotHeader headingLevel="span" />
            </MockBrowser>
          ),
        },
        {
          Icon: Shield,
          title: '우리 봇은 어디까지 알려줘? — 상황마다 달라요',
          description:
            '시험 중엔 힌트도 막히고, 자율학습 시간엔 정답까지 알려줄 수 있어요. 선생님이 시간대별로 미리 정해 둬서 내가 바꿀 순 없어요.',
          signature: true,
          screenshot: (
            <MockBrowser label="봇 안전 등급 — 교사 설정">
              <section className="bg-card space-y-2 rounded-lg p-3">
                <header className="flex items-center gap-2">
                  <Shield className="text-pullim-blue-600 h-4 w-4" />
                  <p className="text-pullim-slate-900 text-sm font-bold">봇 안전 등급</p>
                  <span className="bg-pullim-blue-50 text-pullim-blue-700 ml-auto rounded-full px-2 py-0.5 font-mono text-[11px] font-bold">
                    지금: 개념까지만 (L3)
                  </span>
                </header>
                <ol className="grid grid-cols-5 gap-1" aria-label="안전 등급 1~5단계">
                  {[
                    { l: 1, label: '완전 차단' },
                    { l: 2, label: '질문만' },
                    { l: 3, label: '개념까지' },
                    { l: 4, label: '단계 제시' },
                    { l: 5, label: '정답 포함' },
                  ].map(({ l, label }) => {
                    const isCurrent = l === 3;
                    return (
                      <li
                        key={l}
                        aria-current={isCurrent ? 'true' : undefined}
                        className={
                          'flex flex-col items-center gap-0.5 rounded border-2 p-1 text-center text-[11px] font-bold ' +
                          (isCurrent
                            ? 'border-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700'
                            : 'border-pullim-slate-200 text-pullim-slate-500')
                        }
                      >
                        <span className="flex items-center gap-0.5">
                          {isCurrent && <Check aria-hidden className="h-2.5 w-2.5" />}
                          L{l}
                        </span>
                        <span className={isCurrent ? 'text-pullim-blue-700 text-[10px]' : 'text-[10px]'}>
                          {label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <p className="bg-pullim-blue-50 text-pullim-blue-700 flex items-start gap-1 rounded p-1.5 text-[11px] leading-snug">
                  <AlarmClock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  <span>자동 변경: 18:00–19:00 단계 제시 · 19:00–22:00 개념까지 · 22:00 이후 정답 포함</span>
                </p>
              </section>
            </MockBrowser>
          ),
        },
        {
          Icon: MessageCircle,
          title: '직접 봇에게 인사해 봐요 — 첫 손맛!',
          description:
            '아래 입력창에 뭐든 써봐요. 실제로 대화하는 게 가장 빠른 설명이에요.',
          demoSlot: <DemoChat onDone={scrollToNextStep} />,
        },
        {
          Icon: Eye,
          title: '선생님이 다 보고 있어요 — 그게 좋은 점이에요',
          description:
            '내가 봇에게 한 질문, 답변, 정답률까지 선생님 화면에 그대로 보여요. 덕분에 선생님이 내가 어디서 막히는지 바로 알 수 있어요.',
          bullets: [
            '내가 봇과 한 모든 활동은 기록돼요',
            '이름을 가린 채 봇이 더 똑똑해지는 데 쓰여요',
            '틀린 문제는 풀림 복습에 자동으로 모여요',
          ],
          cta: { label: '지금 봇에게 물어보기', href: '/classbot/chat' },
          screenshot: (
            <MockBrowser dark label="teacher/classbot — 실시간 피드">
              <ul className="space-y-1.5">
                {[
                  { name: '서연', q: '극값과 극점이 다른 거예요?', shared: false, ago: '방금' },
                  { name: '하윤', q: 'f\'(x)=0이면 무조건 극값?', shared: true, ago: '1분 전' },
                  { name: '도현', q: '이거 너무 어려워요...', shared: false, ago: '3분 전' },
                ].map((q, i) => (
                  <li
                    key={i}
                    className={
                      'rounded-md border p-1.5 text-white ' +
                      (q.shared
                        ? 'bg-pullim-lemon/15 border-pullim-lemon-ink/20'
                        : 'bg-pullim-slate-900 border-pullim-slate-800')
                    }
                  >
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="bg-pullim-blue-600 inline-flex h-4 w-4 items-center justify-center rounded-full text-[11px] font-bold">
                        {q.name[0]}
                      </span>
                      <span className="font-semibold">{q.name}</span>
                      <span className="text-pullim-slate-400">·</span>
                      <span className="text-pullim-slate-400 font-mono">{q.ago}</span>
                      {q.shared && (
                        <span className="bg-pullim-lemon-ink text-pullim-lemon ml-auto rounded-full px-1 py-0.5 text-[11px] font-bold">
                          공유됨
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] font-semibold">{q.q}</p>
                  </li>
                ))}
              </ul>
            </MockBrowser>
          ),
        },
      ]}
      finalCta={{ label: '수학이 형과 대화 시작하기', href: '/classbot/chat' }}
    />
  );
}
