// 플래너 — AI 플래닝 + 커스텀 편집 + 성취도
(() => {
const { pullimTokens: T, Logo, Btn, Card, Chip, Avatar, Progress, Icon, AppShell } = window;

/* ─── 서브탭 공통 ─── */
function SubPage({ title, subtitle, right, children, bg = T.slate[50] }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: '18px 28px', background: '#fff',
        borderBottom: `1px solid ${T.slate[100]}`,
        display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.blue[600], letterSpacing: '0.08em' }}>풀림 플래너</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 2 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>{title}</h1>
            {subtitle && <span style={{ fontSize: 13, color: T.slate[500] }}>{subtitle}</span>}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 24, background: bg }}>{children}</div>
    </div>
  );
}

function SubTabs({ active, onTab, items }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: T.slate[100], padding: 3, borderRadius: 10 }}>
      {items.map(i => (
        <button key={i.k} style={{
          padding: '6px 14px', border: 'none', borderRadius: 7,
          background: active === i.k ? '#fff' : 'transparent',
          color: active === i.k ? T.slate[900] : T.slate[600],
          fontWeight: active === i.k ? 700 : 500, fontSize: 13, cursor: 'pointer',
          boxShadow: active === i.k ? shadow.xs : 'none', fontFamily: 'inherit',
        }}>{i.n}</button>
      ))}
    </div>
  );
}

/* ═══════════════ 1. AI 플래닝 ═══════════════ */
function PlannerAI() {
  return (
    <AppShell headerActive="study" sidebarActive="planner" openGroup="planner" subActive="ai">
      <SubPage
        title="AI 플래닝"
        subtitle="목표와 남은 시간에 맞춰 풀림이 최적 스케줄을 설계해드려요"
        right={<>
          <Chip tone="blue">✨ Beta</Chip>
          <Btn variant="outline" size="sm">템플릿 둘러보기</Btn>
        </>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 1280 }}>
          {/* LEFT — 입력 카드 */}
          <div>
            <Card pad={28}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10,
                  background: `linear-gradient(135deg, ${T.blue[400]}, ${T.blue[700]})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{Icon.sparkle(18)}</div>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>스케줄러 · 3단계로 완성</div>
              </div>
              <p style={{ fontSize: 13, color: T.slate[500], marginTop: 2, marginBottom: 24 }}>
                선택지만 골라도 OK — 자연어로 말해도 풀림이 이해해요.
              </p>

              {/* 1. 기간 */}
              <FormRow n="1" label="언제까지 준비할까요?">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { l: '중간고사', d: 'D-14' },
                    { l: '기말고사', d: 'D-48' },
                    { l: '6월 모평', d: 'D-30', cur: true },
                  ].map(e => (
                    <OptCard key={e.l} title={e.l} sub={e.d} active={e.cur}/>
                  ))}
                </div>
                <button style={{
                  marginTop: 8, padding: '8px 12px', border: `1px dashed ${T.slate[300]}`,
                  background: 'transparent', borderRadius: 8, fontSize: 12, color: T.slate[600],
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>+ 직접 날짜 입력</button>
              </FormRow>

              {/* 2. 과목 */}
              <FormRow n="2" label="어떤 과목을 포함할까요?">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    { n: '수학Ⅰ', w: 45, on: true },
                    { n: '영어', w: 25, on: true },
                    { n: '국어', w: 20, on: true },
                    { n: '한국사', w: 10, on: false },
                    { n: '생명과학Ⅰ', w: 0, on: false },
                    { n: '화학Ⅰ', w: 0, on: false },
                  ].map(s => (
                    <button key={s.n} style={{
                      padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
                      border: s.on ? `1px solid ${T.blue[500]}` : `1px solid ${T.slate[200]}`,
                      background: s.on ? T.blue[50] : '#fff',
                      color: s.on ? T.blue[700] : T.slate[600],
                      fontWeight: s.on ? 700 : 500, fontSize: 12.5, fontFamily: 'inherit',
                    }}>
                      {s.on && '✓ '}{s.n}{s.on && ` · ${s.w}%`}
                    </button>
                  ))}
                </div>

                {/* 가중치 */}
                <div style={{ marginTop: 16, padding: 14, background: T.slate[25], borderRadius: 10,
                  border: `1px solid ${T.slate[100]}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.slate[600], marginBottom: 10, letterSpacing: '0.04em' }}>시간 배분 가중치</div>
                  {[
                    { n: '수학Ⅰ', w: 45, c: T.blue[500] },
                    { n: '영어',   w: 25, c: '#8B5CF6' },
                    { n: '국어',   w: 20, c: '#EC4899' },
                    { n: '여유·복습', w: 10, c: T.slate[400] },
                  ].map(s => (
                    <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, width: 70, color: T.slate[700], fontWeight: 600 }}>{s.n}</span>
                      <div style={{ flex: 1, height: 6, background: T.slate[100], borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${s.w}%`, height: '100%', background: s.c }}/>
                      </div>
                      <span style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace',
                        color: T.slate[700], fontWeight: 700, width: 32, textAlign: 'right' }}>{s.w}%</span>
                    </div>
                  ))}
                </div>
              </FormRow>

              {/* 3. 가용 시간 */}
              <FormRow n="3" label="하루에 얼마나 투자할 수 있나요?">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 14 }}>
                  {['월','화','수','목','금','토','일'].map((d, i) => {
                    const hrs = [2, 1.5, 2, 2, 1, 4, 3][i];
                    return (
                      <div key={d} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: T.slate[500], marginBottom: 4, fontWeight: 600 }}>{d}</div>
                        <div style={{
                          height: Math.max(24, hrs * 18), minHeight: 24,
                          background: T.blue[100], borderRadius: 6,
                          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                          padding: 4, position: 'relative',
                        }}>
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: T.blue[400], borderRadius: 6,
                            top: `${(4 - hrs) / 4 * 100}%`,
                          }}/>
                          <span style={{ fontSize: 10, color: '#fff', fontWeight: 800, position: 'relative' }}>{hrs}h</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: T.slate[500] }}>총 <b style={{ color: T.slate[800] }}>주 15.5시간</b> · 평균 <b style={{ color: T.slate[800] }}>2h 14m/일</b></div>
              </FormRow>

              {/* 프롬프트 */}
              <div style={{ marginTop: 8, padding: 14, background: T.blue[50], borderRadius: 10,
                border: `1px solid ${T.blue[100]}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.blue[700], marginBottom: 6, letterSpacing: '0.04em' }}>✨ 자연어로도 OK</div>
                <textarea defaultValue="삼각함수 응용이 약해요. 오전에 집중이 잘 되는 편이고, 수요일은 학원 때문에 저녁에만 가능해요." style={{
                  width: '100%', minHeight: 56, resize: 'none',
                  padding: 10, border: `1px solid ${T.blue[200]}`, borderRadius: 8,
                  fontSize: 13, fontFamily: 'inherit', outline: 'none', color: T.slate[800],
                }}/>
              </div>

              <Btn size="lg" full icon={Icon.sparkle(16)} style={{ marginTop: 16 }}>
                AI 플랜 생성하기 · 약 8초
              </Btn>
            </Card>
          </div>

          {/* RIGHT — 결과 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card pad={24}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <Chip tone="blue" size="sm">✨ 생성 완료</Chip>
                <Chip tone="neutral" size="sm">7.4s</Chip>
                <div style={{ marginLeft: 'auto', fontSize: 11, color: T.slate[500] }}>모델 · Pullim-Plan v2</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 10, marginBottom: 14 }}>
                6월 모평 · 30일 플랜
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 18 }}>
                {[
                  { l: '총 블록', v: '72', s: '개' },
                  { l: '총 시간', v: '68', s: '시간' },
                  { l: '예상 성취', v: '+18', s: '%p' },
                ].map(m => (
                  <div key={m.l} style={{ padding: 12, background: T.slate[25], borderRadius: 10,
                    border: `1px solid ${T.slate[100]}` }}>
                    <div style={{ fontSize: 10, color: T.slate[500], fontWeight: 600, marginBottom: 4 }}>{m.l}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>{m.v}</span>
                      <span style={{ fontSize: 11, color: T.slate[500] }}>{m.s}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: T.slate[700], marginBottom: 10, letterSpacing: '0.02em' }}>
                AI 추론 근거
              </div>
              {[
                '수학Ⅰ 삼각함수 정답률 42% → 가장 많은 블록을 배정 (20/72)',
                '오전 집중 성향 → 수·목·토 10~12시에 최약점 단원 고정',
                '수요일 저녁 제약 → 17:30 이후만 활용, 다른 요일로 물량 분산',
                '모평 D-3부터는 실전 모의만 배치 (5회)',
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 13, color: T.slate[700], lineHeight: 1.5 }}>
                  <span style={{ color: T.blue[500], fontWeight: 800, flexShrink: 0 }}>{i + 1}.</span>
                  <span>{r}</span>
                </div>
              ))}
            </Card>

            {/* 주간 미리보기 — mini heatmap */}
            <Card pad={20}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>30일 블록 배치 미리보기</div>
                <div style={{ display: 'flex', gap: 10, fontSize: 10, color: T.slate[500] }}>
                  <span><span style={{ width: 8, height: 8, background: T.blue[500], display: 'inline-block', borderRadius: 2, marginRight: 4 }}/>수학</span>
                  <span><span style={{ width: 8, height: 8, background: '#8B5CF6', display: 'inline-block', borderRadius: 2, marginRight: 4 }}/>영어</span>
                  <span><span style={{ width: 8, height: 8, background: '#EC4899', display: 'inline-block', borderRadius: 2, marginRight: 4 }}/>국어</span>
                  <span><span style={{ width: 8, height: 8, background: T.warn, display: 'inline-block', borderRadius: 2, marginRight: 4 }}/>모의</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(30, 1fr)', gap: 2 }}>
                {Array.from({length: 30*4}).map((_, i) => {
                  const day = i % 30;
                  const row = Math.floor(i / 30);
                  const colors = [T.blue[500], T.blue[500], '#8B5CF6', '#EC4899', T.warn];
                  const has = Math.random() > 0.3;
                  const isFinal = day >= 27;
                  return (
                    <div key={i} style={{
                      aspectRatio: '1', borderRadius: 2,
                      background: !has ? T.slate[50] :
                        isFinal ? T.warn :
                        colors[(day + row) % 4],
                      opacity: has ? (isFinal ? 1 : 0.6 + row*0.1) : 1,
                    }}/>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.slate[500], marginTop: 6 }}>
                <span>오늘</span>
                <span>D-15</span>
                <span style={{ color: T.warn, fontWeight: 700 }}>D-3~ 모의</span>
              </div>
            </Card>

            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="outline" size="md" full icon={Icon.sparkle(14)}>다시 생성</Btn>
              <Btn size="md" full icon={Icon.arrowRight(14)}>내 플래너에 적용</Btn>
            </div>
          </div>
        </div>
      </SubPage>
    </AppShell>
  );
}

function FormRow({ n, label, children }) {
  return (
    <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${T.slate[100]}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: T.slate[900],
          color: '#fff', fontSize: 11, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.slate[800] }}>{label}</div>
      </div>
      {children}
    </div>
  );
}

function OptCard({ title, sub, active }) {
  return (
    <div style={{
      padding: 14, borderRadius: 10, textAlign: 'left', cursor: 'pointer',
      background: active ? T.blue[50] : '#fff',
      border: active ? `2px solid ${T.blue[500]}` : `1px solid ${T.slate[200]}`,
      boxShadow: active ? shadow.glow : 'none',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: active ? T.blue[700] : T.slate[800] }}>{title}</div>
      <div style={{ fontSize: 11, color: T.slate[500], marginTop: 2 }}>{sub}</div>
    </div>
  );
}

Object.assign(window, { PlannerAI, SubPage, SubTabs, FormRow, OptCard });
})();
