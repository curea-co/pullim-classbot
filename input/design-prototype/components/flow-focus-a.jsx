// 플래너 블록 → 무한풀기 실행 플로우 · 변형 C (Focus · 차분)
// 6화면: 블록 상세 모달 / 오늘의 플랜 / 실행 / 블록 완료 / 쉬기 전환 / 하루 종료
(() => {
const { pullimTokens: T, Btn, Card, Chip, Avatar, Progress, Icon, AppShell } = window;
const { SubPage } = window;

/* ─── 공통: 차분 톤 ─── */
const Focus = {
  bg: T.slate[50], surface: '#fff', border: T.slate[200],
  text: T.slate[900], sub: T.slate[500], accent: T.blue[500],
  accentSoft: T.blue[50], accentDeep: T.blue[700],
};

/* ═══════════════ 1. 블록 상세 모달 (배경: 오늘의 플랜) ═══════════════ */
function FocusBlockDetail() {
  return (
    <AppShell headerActive="study" sidebarActive="planner" openGroup="planner" subActive="today">
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        {/* 배경 — 오늘의 플랜 (흐릿하게) */}
        <div style={{ filter: 'blur(3px) saturate(0.8)', opacity: 0.6, pointerEvents: 'none', height: '100%' }}>
          <TodayPlanBackground/>
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10, 14, 30, 0.45)' }}/>

        {/* 모달 */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 720, maxHeight: '86%', overflow: 'auto',
          background: Focus.surface, borderRadius: 20,
          boxShadow: '0 40px 80px rgba(10, 14, 30, 0.3)',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            padding: '24px 28px', borderBottom: `1px solid ${Focus.border}`,
            background: `linear-gradient(180deg, ${T.blue[50]}, #fff)`,
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Chip tone="blue" size="sm">14:00 ~ 16:00 · 오늘 화요일</Chip>
              <Chip tone="neutral" size="sm">{Icon.sparkle(11)} AI 추천 범위</Chip>
              <span style={{ marginLeft: 'auto', color: Focus.sub, cursor: 'pointer' }}>{Icon.close(18)}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.blue[700] }}>수학Ⅰ · 삼각함수</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', margin: '4px 0 2px' }}>
              사인법칙 응용
            </h2>
            <p style={{ fontSize: 13, color: Focus.sub, margin: 0 }}>
              어제 학습한 '사인법칙 기본'을 실전 유형에 적용해봐요.
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: 28, flex: 1 }}>
            {/* 범위 */}
            <Section label="📚 범위" n="1">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <ScopeItem n="사인법칙 · 삼각형의 외접원" meta="기출 빈도 높음" on/>
                <ScopeItem n="사인법칙 · 변의 길이 구하기" meta="정답률 72%" on/>
                <ScopeItem n="사인법칙 · 각도 구하기" meta="정답률 68%" on/>
                <ScopeItem n="사인법칙 · 코사인법칙 혼합" meta="다음 블록에서" muted/>
              </div>
              <button style={{
                marginTop: 8, padding: '8px 12px', background: 'transparent',
                border: `1px dashed ${T.slate[300]}`, borderRadius: 8,
                fontSize: 12, color: T.slate[600], cursor: 'pointer', fontFamily: 'inherit',
              }}>+ 범위 직접 추가</button>
            </Section>

            {/* 완료 조건 */}
            <Section label="🎯 완료 조건" n="2">
              <div style={{ background: T.slate[25], borderRadius: 10,
                border: `1px solid ${T.slate[100]}`, padding: 4 }}>
                <Condition
                  icon="⏱"
                  label="시간 제한"
                  value="30분"
                  sub="이 시간이 되면 현재 문항까지만"
                  on
                  editable
                />
                <Condition
                  icon="📝"
                  label="문항 수"
                  value="20문항"
                  sub="완료 기준"
                  on
                  editable
                  primary
                />
                <Condition
                  icon="🎯"
                  label="정답률 목표"
                  value="75% 이상"
                  sub="이하일 때 5문항 추가"
                  on
                  editable
                />
                <Condition
                  icon="💡"
                  label="정복 목표"
                  value="약점 패턴 3개"
                  sub="선택 사항"
                />
                <Condition
                  icon="📖"
                  label="단원 범위"
                  value="사인법칙 전체"
                  on
                />
              </div>

              <div style={{ marginTop: 10, padding: '10px 12px', background: T.blue[50],
                borderRadius: 8, border: `1px solid ${T.blue[100]}`,
                display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.blue[700] }}>완료 로직</span>
                <div style={{ display: 'flex', background: '#fff', padding: 2, borderRadius: 5,
                  border: `1px solid ${T.blue[200]}` }}>
                  {['모두(AND)', '하나(OR)', '주+서브'].map((o, i) => (
                    <span key={o} style={{
                      padding: '3px 10px', borderRadius: 3, fontSize: 11, fontWeight: 600,
                      background: i === 2 ? T.blue[500] : 'transparent',
                      color: i === 2 ? '#fff' : T.slate[600], cursor: 'pointer',
                    }}>{o}</span>
                  ))}
                </div>
                <span style={{ fontSize: 11, color: T.slate[600], marginLeft: 'auto' }}>
                  <b>문항 20개</b>를 기준, 30분은 상한
                </span>
              </div>
            </Section>

            {/* 문제 출처 */}
            <Section label="📦 문제 풀 (Pool)" n="3">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <PoolCard
                  icon="🎓"
                  n="풀림 기본 DB"
                  meta="2,400+ 문항 · 적응형"
                  on primary
                />
                <PoolCard
                  icon="📘"
                  n="스튜디오 (내 교재)"
                  meta="84문항 업로드"
                  on
                  badge="+"
                />
                <PoolCard
                  icon="🛒"
                  n="스토어 · 수능완성"
                  meta="구매 완료 · 120문항"
                  on
                  badge="PAID"
                />
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: Focus.sub, display: 'flex', alignItems: 'center', gap: 6 }}>
                {Icon.sparkle(12)}<span>AI가 선택된 풀에서 범위·난이도에 맞춰 20문항을 적응형으로 출제해요.</span>
              </div>
            </Section>

            {/* AI 권장 */}
            <div style={{ padding: 14, background: `linear-gradient(135deg, ${T.blue[50]}, #fff)`,
              border: `1px solid ${T.blue[100]}`, borderRadius: 12, marginTop: 8,
              display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10,
                background: `linear-gradient(135deg, ${T.blue[400]}, ${T.blue[600]})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                {Icon.sparkle(18)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.blue[700], letterSpacing: '0.04em' }}>AI 풀림이의 권장</div>
                <div style={{ fontSize: 13, color: T.slate[800], lineHeight: 1.6, marginTop: 4 }}>
                  어제 '사인법칙 기본' 정답률 <b>72%</b>였어요. 오늘은 <b>20문항</b>이 딱 맞는 양이에요.
                  마지막 5문항은 외접원 응용으로 어려워질 거예요 — 힘내세요!
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 28px', borderTop: `1px solid ${Focus.border}`,
            display: 'flex', alignItems: 'center', gap: 10, background: T.slate[25],
          }}>
            <Btn variant="ghost" size="md">나중에 하기</Btn>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: T.slate[500], textAlign: 'right' }}>
                <div>예상 소요 <b style={{ color: T.slate[800] }}>22~28분</b></div>
                <div>+ <b style={{ color: T.warn }}>15 XP</b> · 연속 7일째 🔥</div>
              </div>
              <Btn size="lg" icon={Icon.play(14)}>집중 모드로 시작</Btn>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ n, label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 18, height: 18, borderRadius: 5, background: T.slate[900],
          color: '#fff', fontSize: 10, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function ScopeItem({ n, meta, on, muted }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
      background: on ? T.blue[50] : muted ? T.slate[25] : '#fff',
      border: `1px solid ${on ? T.blue[200] : T.slate[100]}`,
      opacity: muted ? 0.5 : 1,
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 4,
        background: on ? T.blue[500] : '#fff',
        border: on ? 'none' : `1.5px solid ${T.slate[300]}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        flexShrink: 0,
      }}>{on && Icon.check(11)}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: on ? T.blue[800] : T.slate[800] }}>{n}</span>
      <span style={{ marginLeft: 'auto', fontSize: 11, color: T.slate[500] }}>{meta}</span>
    </label>
  );
}

function Condition({ icon, label, value, sub, on, editable, primary }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 12px', borderRadius: 8,
      background: primary ? '#fff' : 'transparent',
      border: primary ? `1.5px solid ${T.blue[400]}` : 'none',
      boxShadow: primary ? `0 0 0 4px ${T.blue[100]}` : 'none',
      marginBottom: primary ? 4 : 0,
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: 5,
        background: on ? T.blue[500] : T.slate[200],
        border: on ? 'none' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {on ? <span style={{ color: '#fff', fontSize: 11 }}>{Icon.check(11)}</span> : null}
      </span>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.slate[800] }}>
          {label}
          {primary && <span style={{ marginLeft: 6, fontSize: 9, color: T.blue[600], fontWeight: 800, letterSpacing: '0.06em' }}>주 기준</span>}
        </div>
        <div style={{ fontSize: 11, color: T.slate[500], marginTop: 1 }}>{sub}</div>
      </div>
      {on && (
        <span style={{
          fontSize: 13, fontFamily: 'ui-monospace, monospace', fontWeight: 700,
          color: primary ? T.blue[700] : T.slate[800],
          padding: '3px 10px', background: primary ? T.blue[50] : T.slate[100],
          borderRadius: 6,
        }}>{value}</span>
      )}
      {editable && <span style={{ color: T.slate[400], fontSize: 11, cursor: 'pointer' }}>✎</span>}
    </div>
  );
}

function PoolCard({ icon, n, meta, on, primary, badge }) {
  return (
    <div style={{
      padding: 12, borderRadius: 10, cursor: 'pointer',
      background: on ? '#fff' : T.slate[25],
      border: on ? (primary ? `2px solid ${T.blue[500]}` : `1.5px solid ${T.blue[200]}`) : `1px solid ${T.slate[200]}`,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{
          width: 14, height: 14, borderRadius: 3,
          background: on ? T.blue[500] : '#fff',
          border: on ? 'none' : `1.5px solid ${T.slate[300]}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          marginLeft: 'auto',
        }}>{on && <span style={{ fontSize: 9 }}>✓</span>}</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, color: T.slate[800] }}>{n}</div>
      <div style={{ fontSize: 10, color: T.slate[500], marginTop: 2 }}>{meta}</div>
      {badge && (
        <span style={{
          position: 'absolute', top: 8, right: 26,
          fontSize: 8, fontWeight: 800, letterSpacing: '0.08em',
          padding: '2px 5px', borderRadius: 3,
          background: badge === 'PAID' ? T.warnBg : T.successBg,
          color: badge === 'PAID' ? T.warn : T.success,
        }}>{badge}</span>
      )}
    </div>
  );
}

/* ═══════════════ 공용: 오늘의 플랜 (배경용 + 단독용) ═══════════════ */
function TodayPlanBackground() {
  return <TodayPlanInner/>;
}
function TodayPlanInner({ highlight = 'current' }) {
  const blocks = [
    { t: '08:30', d: 30, s: 'etc',  title: '영단어 24개',         done: true, pct: 100, m: '24/24 · 92%' },
    { t: '09:00', d: 60, s: 'math', title: '삼각함수 개념 복습',  done: true, pct: 100, m: '15문항 · 78%' },
    { t: '11:00', d: 45, s: 'eng',  title: '빈칸 추론 세트',      past: true, pct: 55,  m: '11/20 · 미뤘어요' },
    { t: '14:00', d: 120,s: 'math', title: '사인법칙 응용 20문항', cur: highlight === 'current', pct: 0,   m: '시작 전' },
    { t: '16:10', d: 10, s: 'rest', title: '잠깐 쉬기',           pct: 0 },
    { t: '16:20', d: 40, s: 'kor',  title: '비문학 독해 세트',    pct: 0 },
    { t: '17:00', d: 30, s: 'etc',  title: '오답 정복 · 5패턴',   pct: 0 },
    { t: '19:00', d: 60, s: 'math', title: '클래스룸 · 라이브',   pct: 0, live: true },
  ];
  const colors = {
    math: T.blue[500], eng: '#8B5CF6', kor: '#EC4899',
    his: T.success, etc: T.warn, rest: T.slate[400],
  };

  return (
    <SubPage
      title="오늘의 플랜"
      subtitle="4월 23일 화요일 · 총 7블록 · 4시간 35분"
      right={<>
        <Chip tone="blue" size="sm">3 / 7 완료</Chip>
        <Btn variant="outline" size="sm">플래너 편집</Btn>
      </>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, height: '100%' }}>
        {/* TIMELINE */}
        <Card pad={0} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.slate[100]}`,
            display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>타임라인</div>
            <span style={{ fontSize: 11, color: T.slate[500] }}>지금 · 15:42</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              <Chip tone="success" size="sm">● 진행 중 1</Chip>
              <Chip tone="neutral" size="sm">예정 3</Chip>
              <Chip tone="warn" size="sm">밀림 1</Chip>
            </div>
          </div>

          <div style={{ position: 'relative', padding: '20px 24px' }}>
            {/* Current time marker */}
            <div style={{
              position: 'absolute', left: 78, right: 24, top: 228,
              height: 2, background: T.danger, zIndex: 2,
            }}>
              <div style={{ position: 'absolute', left: -8, top: -5, width: 12, height: 12,
                borderRadius: '50%', background: T.danger,
                boxShadow: `0 0 0 4px ${T.danger}30` }}/>
              <span style={{ position: 'absolute', right: 0, top: -18,
                fontSize: 10, fontWeight: 700, color: T.danger }}>NOW · 15:42</span>
            </div>

            {blocks.map((b, i) => {
              const col = colors[b.s];
              const state = b.done ? 'done' : b.cur ? 'current' : b.past ? 'past' : 'upcoming';
              return (
                <div key={i} style={{ display: 'flex', gap: 16, position: 'relative', paddingBottom: 10 }}>
                  {/* time */}
                  <div style={{ width: 56, paddingTop: 12, textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace',
                      fontWeight: 700, color: state === 'upcoming' ? T.slate[500] : T.slate[800] }}>
                      {b.t}
                    </div>
                    <div style={{ fontSize: 10, color: T.slate[400] }}>{b.d}분</div>
                  </div>

                  {/* rail + dot */}
                  <div style={{ position: 'relative', width: 12, flexShrink: 0 }}>
                    {i < blocks.length - 1 && (
                      <div style={{ position: 'absolute', left: 5, top: 20, bottom: -10,
                        width: 2, background: T.slate[100] }}/>
                    )}
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%', marginTop: 14,
                      background: state === 'done' ? T.success
                                : state === 'current' ? col
                                : state === 'past' ? T.warn : '#fff',
                      border: state === 'upcoming' ? `2px solid ${T.slate[300]}` : 'none',
                      boxShadow: state === 'current' ? `0 0 0 4px ${col}30` : 'none',
                    }}/>
                  </div>

                  {/* block */}
                  <div style={{
                    flex: 1, padding: state === 'current' ? '16px 18px' : '10px 14px',
                    borderRadius: 10, marginBottom: 4,
                    background: state === 'done' ? T.slate[50]
                              : state === 'current' ? col
                              : state === 'past' ? `${T.warn}10`
                              : '#fff',
                    border: `1px solid ${
                      state === 'current' ? col
                      : state === 'past' ? `${T.warn}40`
                      : T.slate[100]
                    }`,
                    color: state === 'current' ? '#fff' : state === 'done' ? T.slate[500] : T.slate[800],
                    opacity: state === 'past' ? 0.78 : 1,
                    filter: state === 'past' ? 'saturate(0.7)' : 'none',
                    cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {state === 'done' && <span style={{ color: T.success }}>{Icon.check(14)}</span>}
                      {state === 'past' && <span style={{ color: T.warn, fontSize: 11 }}>⚠</span>}
                      {b.live && <Chip tone="danger" size="sm">● 곧 LIVE</Chip>}
                      <div style={{
                        fontSize: state === 'current' ? 16 : 13,
                        fontWeight: state === 'current' ? 800 : 700,
                        textDecoration: state === 'done' ? 'line-through' : 'none',
                      }}>{b.title}</div>
                      {state === 'current' && (
                        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Chip tone="blue" size="sm" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                            지금 이 블록
                          </Chip>
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, marginTop: 4,
                      opacity: state === 'current' ? 0.9 : state === 'done' ? 0.8 : 0.7 }}>
                      {b.m}
                    </div>
                    {state === 'current' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button style={{
                          height: 36, padding: '0 18px', background: '#fff', color: col,
                          border: 'none', borderRadius: 8,
                          fontSize: 13, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>{Icon.play(12)} 집중 모드로 시작</button>
                        <button style={{
                          height: 36, padding: '0 14px',
                          background: 'rgba(255,255,255,0.2)', color: '#fff',
                          border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8,
                          fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                        }}>상세 설정</button>
                      </div>
                    )}
                    {state === 'past' && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button style={chipBtn(T.warn)}>지금이라도 시작</button>
                        <button style={chipBtn(T.slate[500])}>내일로 미루기</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* SIDEBAR — 오늘 요약 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card pad={20}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14 }}>오늘의 진행</div>
            <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="58" fill="none" stroke={T.slate[100]} strokeWidth="12"/>
                <circle cx="70" cy="70" r="58" fill="none" stroke={T.blue[500]} strokeWidth="12"
                  strokeLinecap="round" strokeDasharray={`${3/7 * 365} 365`} transform="rotate(-90 70 70)"/>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em' }}>3/7</div>
                <div style={{ fontSize: 10, color: T.slate[500], fontWeight: 700, letterSpacing: '0.04em' }}>완료</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
              padding: 10, background: T.slate[25], borderRadius: 8 }}>
              <MiniStat v="1h 42m" l="학습 완료"/>
              <MiniStat v="39" l="푼 문항"/>
              <MiniStat v="82%" l="평균 정답률"/>
            </div>
          </Card>

          <Card pad={20} tone="tint">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ color: T.blue[500] }}>{Icon.sparkle(14)}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: T.blue[700], letterSpacing: '0.04em' }}>AI 코치</span>
            </div>
            <div style={{ fontSize: 13, color: T.blue[900], lineHeight: 1.6 }}>
              빈칸 추론이 미뤄졌어요. <b>16:20</b>의 비문학 블록과 합쳐서 진행할까요?
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <Btn variant="outline" size="sm">나중에</Btn>
              <Btn size="sm">합치기</Btn>
            </div>
          </Card>

          <Card pad={20}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 10, color: T.slate[700] }}>🔥 스트릭 & XP</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: T.warn, letterSpacing: '-0.04em' }}>7</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>연속 학습</div>
                <div style={{ fontSize: 10, color: T.slate[500] }}>최장 21일</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: T.slate[500] }}>오늘 XP</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.blue[600] }}>+42 XP</div>
              </div>
            </div>
            <Progress value={42} max={100} tone="blue" height={5} />
            <div style={{ fontSize: 10, color: T.slate[500], marginTop: 4 }}>Lv 12 · 다음 레벨까지 58 XP</div>
          </Card>
        </div>
      </div>
    </SubPage>
  );
}

function MiniStat({ v, l }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em' }}>{v}</div>
      <div style={{ fontSize: 9, color: T.slate[500], fontWeight: 600 }}>{l}</div>
    </div>
  );
}
function chipBtn(c) {
  return {
    height: 26, padding: '0 10px', background: '#fff', color: c,
    border: `1px solid ${c}40`, borderRadius: 6,
    fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
  };
}

/* ═══════════════ 2. 오늘의 플랜 (단독) ═══════════════ */
function FocusTodayPlan() {
  return (
    <AppShell headerActive="study" sidebarActive="planner" openGroup="planner" subActive="today">
      <TodayPlanInner/>
    </AppShell>
  );
}

Object.assign(window, {
  FocusBlockDetail, FocusTodayPlan, TodayPlanInner,
  PlannerSection: Section, PlannerScopeItem: ScopeItem,
  PlannerCondition: Condition, PlannerPoolCard: PoolCard,
  chipBtn, MiniStat,
});
})();
