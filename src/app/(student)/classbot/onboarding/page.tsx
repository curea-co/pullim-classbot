import { GraduationCap, Shield, UserCircle, MessageCircle, Eye, AlarmClock } from 'lucide-react';
import { OnboardingTemplate } from '@/components/shell/onboarding-template';
import { MockBrowser } from '@/components/shell/mock-browser';
import { BotHeader } from '@/components/classbot/bot-header';
import { LiveQuizCard } from '@/components/classbot/live-quiz-card';

export default function ClassbotOnboardingPage() {
  return (
    <OnboardingTemplate
      featureName="풀림 클래스봇"
      Icon={GraduationCap}
      identity="범용 AI 챗봇과 다름 — 교사가 만들고 통제하는 AI 학습 교실. 학생은 '수학이 형'(선생님 분신)과 대화하고, 모든 활동은 교사 대시보드에 실시간 기록됩니다."
      estimatedMin={4}
      steps={[
        {
          Icon: UserCircle,
          title: '봇 정체성 — 디지털 분신 선생님',
          description:
            '"수학이 형"은 김수학 선생님이 자신의 수업 방식·교안·말투를 AI에 이식해 만든 디지털 분신. 우리 반·학원의 컨텍스트로 답해요.',
          bullets: [
            '교사가 봇 페르소나(친근/정중/스파르타) 설정',
            '교사 업로드 자료(PPT·PDF·녹화)를 RAG 인덱스로',
            '봇은 교사 이름으로 발언하지 않음 (저작권/명예)',
          ],
          screenshotCaption: '실제 봇 헤더 (다크 그라데이션)',
          screenshot: (
            <MockBrowser dark label="봇 정체성">
              <BotHeader />
            </MockBrowser>
          ),
        },
        {
          Icon: Shield,
          title: 'Scope Guard 5단계 — 교사가 권한 통제',
          description:
            '봇이 어떤 응답까지 할 수 있는지 교사가 정함. L1(시험 시 전부 차단) ~ L5(완전 개방). 시간대별 자동 스위치도 가능.',
          signature: true,
          screenshotCaption: 'Scope Guard + 시간대 자동 스위치',
          screenshot: (
            <MockBrowser label="교사 설정 — Scope Guard">
              <section className="bg-card space-y-2 rounded-lg p-3">
                <header className="flex items-center gap-2">
                  <Shield className="text-pullim-blue-600 h-4 w-4" />
                  <h4 className="text-pullim-slate-900 text-xs font-bold">Scope Guard</h4>
                  <span className="bg-pullim-blue-50 text-pullim-blue-700 ml-auto rounded-full px-2 py-0.5 font-mono text-[9px] font-bold">
                    현재 L3
                  </span>
                </header>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map(l => (
                    <div
                      key={l}
                      className={
                        'rounded border-2 p-1 text-center text-[9px] font-bold ' +
                        (l === 3
                          ? 'border-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700'
                          : 'border-pullim-slate-200 text-pullim-slate-500')
                      }
                    >
                      L{l}
                    </div>
                  ))}
                </div>
                <div className="bg-pullim-warn-bg text-pullim-warn flex items-start gap-1 rounded p-1.5 text-[9px] leading-snug">
                  <AlarmClock className="mt-0.5 h-2.5 w-2.5 shrink-0" aria-hidden />
                  <span>자동 스위치: 18:00–19:00 L4 · 19:00–22:00 L3 · 22:00 이후 L5</span>
                </div>
              </section>
            </MockBrowser>
          ),
        },
        {
          Icon: MessageCircle,
          title: '봇 채팅 + 라이브 퀴즈 참여',
          description:
            '수업 중에는 라이브 퀴즈 참여 (응답 분포·타이머). 자기주도 시간엔 봇 채팅으로 개념 질문.',
          cta: { label: '봇 채팅 열기', href: '/classbot/chat' },
          screenshotCaption: '실제 라이브 퀴즈 카드',
          screenshot: (
            <MockBrowser label="라이브 퀴즈 진행 중">
              <LiveQuizCard />
            </MockBrowser>
          ),
        },
        {
          Icon: Eye,
          title: '실시간 모니터링 — 투명성',
          description:
            '내가 봇에게 한 모든 질문·답변·정답률·감정이 김수학 선생님 대시보드에 실시간 표시. 시험 기간엔 자동 차단.',
          bullets: [
            '학생도 알아야 할 것: 모든 활동 기록됨',
            '익명화되어 사고유도 모델 학습에도 쓰임',
            '오답은 풀림 복습으로 자동 흘러감',
          ],
          screenshotCaption: '교사 대시보드 — 실시간 봇 질문 피드',
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
                    <div className="flex items-center gap-1 text-[9px]">
                      <span className="bg-pullim-blue-600 inline-flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold">
                        {q.name[0]}
                      </span>
                      <span className="font-semibold">{q.name}</span>
                      <span className="text-pullim-slate-400">·</span>
                      <span className="text-pullim-slate-400 font-mono">{q.ago}</span>
                      {q.shared && (
                        <span className="bg-pullim-lemon-ink text-pullim-lemon ml-auto rounded-full px-1 py-0.5 text-[8px] font-bold">
                          공유됨
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] font-semibold">{q.q}</p>
                  </li>
                ))}
              </ul>
            </MockBrowser>
          ),
        },
      ]}
      finalCta={{ label: '풀림 클래스봇 시작하기', href: '/classbot' }}
    />
  );
}
