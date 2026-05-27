import { GraduationCap, Shield, UserCircle, MessageCircle, Eye, AlarmClock, Check } from 'lucide-react';
import { OnboardingTemplate } from '@/components/shell/onboarding-template';
import { MockBrowser } from '@/components/shell/mock-browser';
import { BotHeader } from '@/components/classbot/bot-header';
import { LiveQuizCard } from '@/components/classbot/live-quiz-card';

export default function ClassbotOnboardingPage() {
  return (
    <OnboardingTemplate
      featureName="풀림 클래스봇"
      Icon={GraduationCap}
      identity="우리 반 선생님이 직접 만든 AI 친구예요. ‘수학이 형’에게 물어본 건 선생님 화면에도 그대로 보여요."
      estimatedMin={4}
      finalHeading="이제 ‘수학이 형’한테 인사해 볼까요?"
      finalBody="이제 직접 사용해 보세요. 막히면 언제든 이 페이지로 돌아올 수 있어요."
      steps={[
        {
          Icon: UserCircle,
          title: '내가 받은 봇은 우리 선생님이 만든 거예요',
          description:
            '‘수학이 형’은 김수학 선생님 수업 그대로 답해요. 우리 반 진도, 우리 학원 자료를 알고 있어요.',
          bullets: [
            '선생님이 봇 말투(친근·정중·엄격)도 미리 정해 둬요',
            '선생님 PPT·PDF·수업 녹화를 봇이 미리 읽어 둬요',
            '봇은 선생님 이름으로 직접 말하지 않아요 (정확성·신뢰)',
          ],
          screenshot: (
            <MockBrowser dark label="봇 정체성">
              <BotHeader headingLevel="span" />
            </MockBrowser>
          ),
        },
        {
          Icon: Shield,
          title: '시간대마다 답할 수 있는 범위가 달라져요',
          description:
            '시험 중에는 답을 막고, 자율학습 시간엔 자유롭게 물어볼 수 있어요. 선생님이 시간대별로 미리 정해 둬요.',
          signature: true,
          screenshot: (
            <MockBrowser label="교사 설정 — Scope Guard">
              <section className="bg-card space-y-2 rounded-lg p-3">
                <header className="flex items-center gap-2">
                  <Shield className="text-pullim-blue-600 h-4 w-4" />
                  <p className="text-pullim-slate-900 text-sm font-bold">Scope Guard</p>
                  <span className="bg-pullim-blue-50 text-pullim-blue-700 ml-auto rounded-full px-2 py-0.5 font-mono text-[11px] font-bold">
                    현재 L3
                  </span>
                </header>
                <ol className="grid grid-cols-5 gap-1" aria-label="Scope Guard 레벨 1~5">
                  {[1, 2, 3, 4, 5].map(l => {
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
                        {isCurrent && (
                          <span className="text-pullim-blue-700 text-[11px] font-semibold">
                            현재
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
                <p className="bg-pullim-blue-50 text-pullim-blue-700 flex items-start gap-1 rounded p-1.5 text-[11px] leading-snug">
                  <AlarmClock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  <span>자동 스위치: 18:00–19:00 L4 · 19:00–22:00 L3 · 22:00 이후 L5</span>
                </p>
              </section>
            </MockBrowser>
          ),
        },
        {
          Icon: MessageCircle,
          title: '수업 중엔 함께 풀고, 끝나면 혼자 물어보세요',
          description:
            '수업 시간엔 친구들과 같이 라이브 퀴즈를 풀고, 혼자 공부할 땐 봇에게 개념을 자유롭게 물어볼 수 있어요.',
          cta: { label: '지금 봇에게 물어보기', href: '/classbot/chat' },
          screenshot: (
            <MockBrowser label="라이브 퀴즈 진행 중">
              <LiveQuizCard />
            </MockBrowser>
          ),
        },
        {
          Icon: Eye,
          title: '선생님이 다 보고 있어요 — 그게 좋은 점이에요',
          description:
            '내가 봇에게 한 질문, 답변, 정답률까지 김수학 선생님 화면에 그대로 보여요. 시험 기간엔 자동으로 막혀요.',
          bullets: [
            '내가 봇과 한 모든 활동은 기록돼요',
            '이름을 가린 채 봇이 더 똑똑해지는 데 쓰여요',
            '틀린 문제는 풀림 복습에 자동으로 모여요',
          ],
          screenshot: (
            <MockBrowser dark label="teacher/classbot — 라이브 피드">
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
      finalCta={{ label: '수학이 형과 대화 시작하기', href: '/classbot' }}
    />
  );
}
