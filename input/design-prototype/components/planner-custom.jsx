// 플래너 · 커스텀 편집 + 성취도 + 오늘/주간
(() => {
const { pullimTokens: T, Btn, Card, Chip, Icon, AppShell, SubPage } = window;

/* ═══════════════ 2. 커스텀 편집 ═══════════════ */
function PlannerCustom() {
  const [selected, setSelected] = React.useState('math');
  const palette = [
    { k: 'math', n: '수학Ⅰ', c: T.blue[500] },
    { k: 'eng',  n: '영어',  c: '#8B5CF6' },
    { k: 'kor',  n: '국어',  c: '#EC4899' },
    { k: 'his',  n: '한국사', c: T.success },
    { k: 'etc',  n: '기타',  c: T.warn },
  ];
  const subj = palette.find(p => p.k === selected);

  const hours = Array.from({ length: 14 }, (_, i) => i + 8);
  const blocks = [
    { day: 0, start: 9, dur: 1, subj: 'math', title: '삼각함수 개념', locked: true },
    { day: 1, start: 14, dur: 2, subj: 'math', title: '사인법칙 응용 20문항', active: true },
    { day: 1, start: 19, dur: 0.5, subj: 'etc', title: '영단어 24개' },
    { day: 2, start: 10, dur: 1.5, subj: 'math', title: '코사인법칙' },
    { day: 2, start: 16, dur: 2, subj: 'eng', title: '빈칸 추론 세트' },
    { day: 3, start: 13, dur: 1, subj: 'kor', title: '비문학 독해' },
    { day: 4, start: 15, dur: 2, subj: 'math', title: '중간고사 대비 모의' },
    { day: 5, start: 10, dur: 3, subj: 'his', title: '근현대사 정리' },
  ];

  return (
    <AppShell headerActive="study" sidebarActive="planner" openGroup="planner" subActive="custom">
      <SubPage
        title="커스텀 편집"
        subtitle="내 플래너를 원하는 모양으로 — 색, 블록, 레이아웃까지"
        right={<>
          <Btn variant="ghost" size="sm">되돌리기</Btn>
          <Btn variant="outline" size="sm">미리보기</Btn>
          <Btn size="sm" icon={Icon.check(14)}>저장</Btn>
        </>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 280px', gap: 16, height: '100%' }}>
          {/* LEFT — 편집 도구 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
            {/* 레이아웃 */}
            <Card pad={16}>
              <SectionTitle n="레이아웃" ic={Icon.menu(13)}/>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 10 }}>
                {[
                  { k: 'week', label: '주간', active: true, svg: <LayoutIcon type="week"/> },
                  { k: 'day',  label: '일간', active: false, svg: <LayoutIcon type="day"/> },
                  { k: 'list', label: '리스트', active: false, svg: <LayoutIcon type="list"/> },
                ].map(l => (
                  <button key={l.k} style={{
                    padding: 10, borderRadius: 8, cursor: 'pointer',
                    background: l.active ? T.blue[50] : '#fff',
                    border: l.active ? `2px solid ${T.blue[500]}` : `1px solid ${T.slate[200]}`,
                    fontFamily: 'inherit',
                  }}>
                    {l.svg}
                    <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4,
                      color: l.active ? T.blue[700] : T.slate[600] }}>{l.label}</div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <Row label="시간 범위" val="7 – 23시"/>
                <Row label="시간 칸 높이" val={<SliderMini v={60}/>}/>
                <Row label="주 시작" val={<TinyToggle labels={['일','월']} active={1}/>}/>
                <Row label="시간 눈금" val={<TinyToggle labels={['30m','15m']} active={0}/>}/>
              </div>
            </Card>

            {/* 색상 팔레트 */}
            <Card pad={16}>
              <SectionTitle n="과목 색상"/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {palette.map(p => (
                  <div key={p.k} onClick={() => setSelected(p.k)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    borderRadius: 8, cursor: 'pointer',
                    background: selected === p.k ? T.slate[50] : 'transparent',
                    border: selected === p.k ? `1px solid ${T.slate[200]}` : `1px solid transparent`,
                  }}>
                    <span style={{ width: 18, height: 18, borderRadius: 5, background: p.c,
                      boxShadow: selected === p.k ? `0 0 0 3px ${p.c}30` : 'none' }}/>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.slate[800] }}>{p.n}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: T.slate[400],
                      fontFamily: 'ui-monospace, monospace' }}>{p.c}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, padding: 12, background: T.slate[25], borderRadius: 8,
                border: `1px solid ${T.slate[100]}` }}>
                <div style={{ fontSize: 11, color: T.slate[600], fontWeight: 700, marginBottom: 8 }}>"{subj?.n}" 색상</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['#3B6FF6','#2854D8','#1D3FA8','#8B5CF6','#6D28D9','#EC4899','#F59E0B','#12B26B','#0EA5E9','#EF4444','#64748B'].map(c => (
                    <div key={c} style={{
                      width: 24, height: 24, borderRadius: 6, background: c, cursor: 'pointer',
                      boxShadow: subj?.c === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : 'none',
                    }}/>
                  ))}
                </div>
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: T.slate[500] }}>블록 스타일</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['solid','tint','striped'].map((s, i) => (
                      <span key={s} style={{
                        padding: '2px 8px', borderRadius: 999,
                        background: i === 1 ? subj?.c : 'transparent',
                        color: i === 1 ? '#fff' : T.slate[600],
                        fontWeight: 600, cursor: 'pointer', fontSize: 10,
                        border: i !== 1 ? `1px solid ${T.slate[200]}` : 'none',
                      }}>{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* 테마 */}
            <Card pad={16}>
              <SectionTitle n="테마"/>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                {[
                  { k: 'light', active: true, bg: '#fff', text: T.slate[900] },
                  { k: 'dark',  active: false, bg: T.slate[900], text: '#fff' },
                  { k: 'cream', active: false, bg: '#FAF6EE', text: '#2E2A20' },
                  { k: 'pastel',active: false, bg: '#F0F4FF', text: T.blue[800] },
                ].map(t => (
                  <button key={t.k} style={{
                    padding: 12, borderRadius: 8, cursor: 'pointer',
                    background: t.bg, color: t.text,
                    border: t.active ? `2px solid ${T.blue[500]}` : `1px solid ${T.slate[200]}`,
                    fontFamily: 'inherit', fontSize: 11, fontWeight: 700, textAlign: 'left',
                  }}>
                    {t.k}
                    <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                      <span style={{ width: 12, height: 4, background: T.blue[500], borderRadius: 1 }}/>
                      <span style={{ width: 8, height: 4, background: '#8B5CF6', borderRadius: 1 }}/>
                      <span style={{ width: 6, height: 4, background: '#EC4899', borderRadius: 1 }}/>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* CENTER — 캘린더 실시간 프리뷰 */}
          <Card pad={0} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.slate[100]}`,
              display: 'flex', alignItems: 'center', gap: 10, background: T.slate[25] }}>
              <Chip tone="blue" size="sm">● LIVE PREVIEW</Chip>
              <span style={{ fontSize: 12, color: T.slate[600] }}>4월 21일 ~ 27일 · 이번 주</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                <IcoBtn>◀</IcoBtn>
                <IcoBtn>오늘</IcoBtn>
                <IcoBtn>▶</IcoBtn>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)' }}>
                <div style={{ background: T.slate[50], borderBottom: `1px solid ${T.slate[100]}` }}/>
                {['월','화','수','목','금','토','일'].map((d, i) => (
                  <div key={d} style={{
                    padding: '8px 10px', fontSize: 11, fontWeight: 700,
                    background: i === 1 ? T.blue[50] : T.slate[50],
                    color: i === 1 ? T.blue[700] : T.slate[700],
                    borderBottom: `1px solid ${T.slate[100]}`,
                    borderRight: i < 6 ? `1px solid ${T.slate[100]}` : 'none',
                  }}>
                    <div>{d} {21 + i}일</div>
                    {i === 1 && <div style={{ fontSize: 9, color: T.blue[500], marginTop: 2 }}>오늘</div>}
                  </div>
                ))}

                <div style={{ borderRight: `1px solid ${T.slate[100]}` }}>
                  {hours.map(h => (
                    <div key={h} style={{
                      height: 36, fontSize: 9, color: T.slate[400], padding: '2px 6px',
                      fontFamily: 'ui-monospace, monospace', textAlign: 'right',
                      borderBottom: `1px solid ${T.slate[50]}`,
                    }}>{h}:00</div>
                  ))}
                </div>

                {[0,1,2,3,4,5,6].map(di => (
                  <div key={di} style={{
                    position: 'relative',
                    borderRight: di < 6 ? `1px solid ${T.slate[100]}` : 'none',
                    background: di === 1 ? 'rgba(59, 111, 246, 0.02)' : 'transparent',
                  }}>
                    {hours.map(h => (
                      <div key={h} style={{ height: 36, borderBottom: `1px solid ${T.slate[50]}` }}/>
                    ))}
                    {blocks.filter(b => b.day === di).map((b, i) => {
                      const col = palette.find(p => p.k === b.subj)?.c || T.slate[400];
                      return (
                        <div key={i} style={{
                          position: 'absolute',
                          top: (b.start - 8) * 36 + 2,
                          height: b.dur * 36 - 4,
                          left: 3, right: 3,
                          background: b.active ? col : `${col}1A`,
                          borderLeft: `3px solid ${col}`,
                          borderRadius: 6, padding: '6px 8px',
                          color: b.active ? '#fff' : col,
                          fontSize: 10, fontWeight: 700,
                          overflow: 'hidden',
                          cursor: 'grab',
                          boxShadow: b.active ? shadow.md : 'none',
                          outline: b.active ? `2px dashed #fff` : 'none',
                          outlineOffset: -5,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {b.locked && <span>🔒</span>}
                            {b.title}
                          </div>
                          {b.active && (
                            <div style={{ fontSize: 9, marginTop: 2, opacity: 0.9, fontWeight: 500 }}>
                              드래그·리사이즈 중…
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {/* Now */}
                    {di === 1 && (
                      <div style={{ position: 'absolute', top: (15-8)*36 + 24, left: -4, right: 0,
                        height: 2, background: T.danger, zIndex: 2 }}>
                        <div style={{ position: 'absolute', left: -4, top: -3,
                          width: 8, height: 8, borderRadius: '50%', background: T.danger }}/>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* RIGHT — 선택된 블록 속성 + 블록 라이브러리 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
            <Card pad={16}>
              <SectionTitle n="선택된 블록"/>
              <div style={{ padding: 10, background: `${T.blue[500]}15`,
                borderLeft: `3px solid ${T.blue[500]}`, borderRadius: 6, marginTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.blue[700] }}>사인법칙 응용 20문항</div>
                <div style={{ fontSize: 10, color: T.slate[500], marginTop: 2 }}>화 · 14:00 ~ 16:00</div>
              </div>
              <div style={{ marginTop: 14 }}>
                <Field label="제목"><input defaultValue="사인법칙 응용 20문항" style={inputStyle}/></Field>
                <Field label="과목">
                  <div style={{ display: 'flex', gap: 4 }}>
                    {palette.slice(0,4).map(p => (
                      <span key={p.k} style={{ width: 20, height: 20, borderRadius: 5, background: p.c,
                        boxShadow: p.k === 'math' ? `0 0 0 2px #fff, 0 0 0 3px ${p.c}` : 'none', cursor: 'pointer' }}/>
                    ))}
                  </div>
                </Field>
                <Field label="유형">
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {['개념','문제','복습','암기','모의'].map((t, i) => (
                      <span key={t} style={{
                        fontSize: 10, padding: '3px 8px', borderRadius: 999,
                        background: i === 1 ? T.slate[900] : T.slate[100],
                        color: i === 1 ? '#fff' : T.slate[600], fontWeight: 600, cursor: 'pointer',
                      }}>{t}</span>
                    ))}
                  </div>
                </Field>
                <Field label="시간">
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input defaultValue="14:00" style={{ ...inputStyle, width: 64, textAlign: 'center' }}/>
                    <span style={{ color: T.slate[400] }}>→</span>
                    <input defaultValue="16:00" style={{ ...inputStyle, width: 64, textAlign: 'center' }}/>
                  </div>
                </Field>
                <Field label="알림">
                  <TinyToggle labels={['끔','10분 전','30분 전']} active={1}/>
                </Field>
                <Field label="반복">
                  <div style={{ fontSize: 11, color: T.slate[700] }}>매주 화요일</div>
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                <Btn variant="outline" size="sm" full>삭제</Btn>
                <Btn size="sm" full>저장</Btn>
              </div>
            </Card>

            <Card pad={16}>
              <SectionTitle n="블록 라이브러리" hint="드래그해서 배치"/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {[
                  { t: '무한풀기 세션', sub: '30분 · 적응형', c: T.blue[500] },
                  { t: '개념 VLM 3개', sub: '15분', c: T.blue[500] },
                  { t: '오답정복 5문항', sub: '20분', c: T.warn },
                  { t: '튜터 Q&A', sub: '10분', c: '#8B5CF6' },
                  { t: '영단어 암기',  sub: '15분', c: T.success },
                  { t: '자유 블록',    sub: '원하는 대로', c: T.slate[500] },
                ].map(b => (
                  <div key={b.t} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 6,
                    border: `1px solid ${T.slate[200]}`, cursor: 'grab', background: '#fff',
                  }}>
                    <span style={{ width: 3, height: 24, borderRadius: 2, background: b.c }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{b.t}</div>
                      <div style={{ fontSize: 10, color: T.slate[500] }}>{b.sub}</div>
                    </div>
                    <span style={{ color: T.slate[300], fontSize: 14 }}>⋮⋮</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </SubPage>
    </AppShell>
  );
}

const inputStyle = {
  width: '100%', height: 28, padding: '0 8px',
  border: `1px solid ${T.slate[200]}`, borderRadius: 6,
  fontSize: 12, fontFamily: 'inherit', outline: 'none', color: T.slate[800],
};
function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
      borderBottom: `1px solid ${T.slate[50]}` }}>
      <span style={{ fontSize: 11, color: T.slate[500], fontWeight: 600, width: 36, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
function SectionTitle({ n, ic, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {ic && <span style={{ color: T.slate[400] }}>{ic}</span>}
      <span style={{ fontSize: 11, fontWeight: 800, color: T.slate[800], letterSpacing: '0.04em', textTransform: 'uppercase' }}>{n}</span>
      {hint && <span style={{ marginLeft: 'auto', fontSize: 10, color: T.slate[400] }}>{hint}</span>}
    </div>
  );
}
function Row({ label, val }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '7px 0', fontSize: 11,
      borderTop: `1px solid ${T.slate[100]}` }}>
      <span style={{ color: T.slate[600], flex: 1, fontWeight: 600 }}>{label}</span>
      <span style={{ color: T.slate[800], fontWeight: 700 }}>{val}</span>
    </div>
  );
}
function SliderMini({ v }) {
  return (
    <div style={{ width: 80, display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ flex: 1, height: 3, background: T.slate[200], borderRadius: 2, position: 'relative' }}>
        <div style={{ width: `${v}%`, height: '100%', background: T.blue[500], borderRadius: 2 }}/>
        <div style={{ position: 'absolute', left: `${v}%`, top: '50%', transform: 'translate(-50%, -50%)',
          width: 10, height: 10, background: '#fff', border: `2px solid ${T.blue[500]}`, borderRadius: '50%' }}/>
      </div>
    </div>
  );
}
function TinyToggle({ labels, active }) {
  return (
    <div style={{ display: 'flex', background: T.slate[100], borderRadius: 5, padding: 2 }}>
      {labels.map((l, i) => (
        <span key={l} style={{
          padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 600,
          background: i === active ? '#fff' : 'transparent',
          color: i === active ? T.slate[900] : T.slate[500],
          boxShadow: i === active ? shadow.xs : 'none',
        }}>{l}</span>
      ))}
    </div>
  );
}
function IcoBtn({ children }) {
  return (
    <button style={{
      padding: '4px 10px', border: `1px solid ${T.slate[200]}`, background: '#fff',
      borderRadius: 6, fontSize: 11, color: T.slate[700], cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
    }}>{children}</button>
  );
}
function LayoutIcon({ type }) {
  if (type === 'week') return (
    <svg width="40" height="28" viewBox="0 0 40 28" fill="none">
      <rect x="1" y="1" width="38" height="26" rx="2" stroke={T.slate[300]}/>
      {[1,2,3,4,5,6].map(i => <line key={i} x1={i*5.4 + 1} y1="1" x2={i*5.4 + 1} y2="27" stroke={T.slate[200]}/>)}
      <rect x="7" y="6" width="4" height="10" fill={T.blue[400]} rx="1"/>
      <rect x="18" y="10" width="4" height="14" fill="#8B5CF6" rx="1"/>
      <rect x="30" y="4" width="4" height="8" fill="#EC4899" rx="1"/>
    </svg>
  );
  if (type === 'day') return (
    <svg width="40" height="28" viewBox="0 0 40 28" fill="none">
      <rect x="1" y="1" width="38" height="26" rx="2" stroke={T.slate[300]}/>
      <rect x="4" y="4" width="32" height="6" fill={T.blue[400]} rx="1"/>
      <rect x="4" y="12" width="32" height="4" fill="#8B5CF6" rx="1"/>
      <rect x="4" y="18" width="32" height="6" fill="#EC4899" rx="1"/>
    </svg>
  );
  return (
    <svg width="40" height="28" viewBox="0 0 40 28" fill="none">
      <rect x="1" y="1" width="38" height="26" rx="2" stroke={T.slate[300]}/>
      <line x1="4" y1="7" x2="36" y2="7" stroke={T.blue[400]} strokeWidth="2"/>
      <line x1="4" y1="13" x2="28" y2="13" stroke="#8B5CF6" strokeWidth="2"/>
      <line x1="4" y1="19" x2="32" y2="19" stroke="#EC4899" strokeWidth="2"/>
    </svg>
  );
}

/* ═══════════════ 3. 학습 성취도 ═══════════════ */
function PlannerStats() {
  return (
    <AppShell headerActive="study" sidebarActive="planner" openGroup="planner" subActive="stats">
      <SubPage
        title="학습 성취도"
        subtitle="플래너에서 실행한 학습 결과를 한눈에"
        right={<>
          <div style={{ display: 'flex', background: T.slate[100], borderRadius: 8, padding: 2 }}>
            {['주','월','6개월'].map((v, i) => (
              <span key={v} style={{
                padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: i === 1 ? 700 : 500,
                background: i === 1 ? '#fff' : 'transparent',
                color: i === 1 ? T.slate[900] : T.slate[500],
                boxShadow: i === 1 ? shadow.xs : 'none', cursor: 'pointer',
              }}>{v}</span>
            ))}
          </div>
          <Btn variant="outline" size="sm">리포트 내보내기</Btn>
        </>}
      >
        {/* Hero metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { l: '완료율',       v: '86', u: '%',  d: '+8%p', tone: 'success', note: '68 / 79 블록' },
            { l: '총 학습 시간', v: '42', u: 'h 18m', d: '+4h', tone: 'blue', note: '목표 40h 달성' },
            { l: '평균 정답률',  v: '74', u: '%',  d: '+3%p', tone: 'success', note: '전월 대비' },
            { l: '연속일',       v: '21', u: '일',  d: '자체 최장', tone: 'warn',    note: '4/3 ~ 4/23' },
          ].map(m => (
            <Card key={m.l} pad={20}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.slate[500], marginBottom: 8 }}>{m.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.04em' }}>{m.v}</span>
                <span style={{ fontSize: 13, color: T.slate[500] }}>{m.u}</span>
                <Chip tone={m.tone} size="sm">{m.d}</Chip>
              </div>
              <div style={{ fontSize: 11, color: T.slate[500], marginTop: 6 }}>{m.note}</div>
            </Card>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 주간 실행률 차트 */}
            <Card pad={24}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>4주간 계획 vs 실행</div>
                  <div style={{ fontSize: 11, color: T.slate[500], marginTop: 2 }}>계획한 시간을 얼마나 지켰는지</div>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: T.slate[600] }}>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, background: T.slate[200], borderRadius: 2, marginRight: 4 }}/>계획</span>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, background: T.blue[500], borderRadius: 2, marginRight: 4 }}/>실행</span>
                </div>
              </div>
              <svg width="100%" height="200" viewBox="0 0 700 200">
                {[0, 1, 2, 3].map(i => (
                  <line key={i} x1="40" y1={40 + i*40} x2="680" y2={40 + i*40} stroke={T.slate[100]}/>
                ))}
                {[0,25,50,75,100].map(v => (
                  <text key={v} x="32" y={180 - v*1.4 + 4} fontSize="10" fill={T.slate[500]} textAnchor="end">{v}%</text>
                ))}
                {['W1','W2','W3','W4'].map((w, wi) => {
                  const plan = [100, 100, 100, 100][wi];
                  const done = [68, 74, 88, 86][wi];
                  const x = 100 + wi * 150;
                  return (
                    <g key={w}>
                      <rect x={x - 28} y={180 - plan*1.4} width="28" height={plan*1.4} fill={T.slate[200]} rx="3"/>
                      <rect x={x + 2}  y={180 - done*1.4} width="28" height={done*1.4} fill={T.blue[500]} rx="3"/>
                      <text x={x} y="196" fontSize="11" fill={T.slate[600]} textAnchor="middle" fontWeight="700">{w}</text>
                      <text x={x + 16} y={180 - done*1.4 - 6} fontSize="10" fill={T.blue[700]} textAnchor="middle" fontWeight="800">{done}%</text>
                    </g>
                  );
                })}
              </svg>
            </Card>

            {/* 과목별 시간 & 정답률 */}
            <Card pad={24}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>과목별 시간 투입 & 정답률</div>
              {[
                { n: '수학Ⅰ', h: 19, pct: 78, c: T.blue[500], blocks: 32 },
                { n: '영어',   h: 10, pct: 68, c: '#8B5CF6', blocks: 18 },
                { n: '국어',   h: 8,  pct: 72, c: '#EC4899', blocks: 14 },
                { n: '한국사', h: 3,  pct: 85, c: T.success, blocks: 4 },
                { n: '기타',   h: 2,  pct: 0,  c: T.warn,    blocks: 0, muted: true },
              ].map(s => (
                <div key={s.n} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 60px',
                  gap: 14, alignItems: 'center', padding: '10px 0', borderTop: `1px solid ${T.slate[100]}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c }}/>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{s.n}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 8, background: T.slate[100], borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${s.h / 19 * 100}%`, height: '100%', background: s.c }}/>
                    </div>
                    <span style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace',
                      color: T.slate[700], fontWeight: 700, minWidth: 36 }}>{s.h}h</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.slate[500] }}>
                    {s.muted ? '실행 없음' : <>정답률 <b style={{ color: T.slate[900] }}>{s.pct}%</b></>}
                  </div>
                  <div style={{ fontSize: 11, color: T.slate[500], textAlign: 'right' }}>{s.blocks}블록</div>
                </div>
              ))}
            </Card>

            {/* Heatmap */}
            <Card pad={24}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>학습 히트맵 · 최근 6주</div>
                <span style={{ fontSize: 11, color: T.slate[500] }}>진하기 = 학습 시간</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gap: 3, fontSize: 9,
                  color: T.slate[400], height: 'auto', paddingTop: 2 }}>
                  {['월','','수','','금','','일'].map((d, i) => (
                    <span key={i} style={{ height: 18, display: 'flex', alignItems: 'center' }}>{d}</span>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(42, 1fr)', gap: 3, flex: 1 }}>
                  {Array.from({length: 42*7}).map((_, i) => {
                    const r = Math.random();
                    const col = r > 0.9 ? T.heat5 : r > 0.75 ? T.heat4 : r > 0.55 ? T.heat3 : r > 0.35 ? T.heat2 : r > 0.2 ? T.heat1 : T.heat0;
                    return <div key={i} style={{ aspectRatio: '1', background: col, borderRadius: 2 }}/>;
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.slate[500], marginTop: 8, paddingLeft: 24 }}>
                <span>3/15</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  적음 {[T.heat0,T.heat1,T.heat2,T.heat3,T.heat4,T.heat5].map((c,i) => <span key={i} style={{ width: 10, height: 10, background: c, borderRadius: 2, display: 'inline-block' }}/>)} 많음
                </span>
                <span>오늘</span>
              </div>
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 성취 배지 */}
            <Card pad={20}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>🏆 이번 달 성취</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { e: '🔥', n: '21일 연속', t: '최장 기록' },
                  { e: '🎯', n: '목표 100%', t: '수학Ⅰ' },
                  { e: '⚡', n: '최단시간', t: '12분 풀이' },
                  { e: '📈', n: '3단계↑',  t: '사인법칙' },
                  { e: '🧠', n: '오답정복', t: '17패턴' },
                  { e: '🔒', n: '잠김',      t: '다음 주' },
                ].map((b, i) => (
                  <div key={i} style={{
                    aspectRatio: '1', padding: 10, background: i < 5 ? T.blue[50] : T.slate[50],
                    border: `1px solid ${i < 5 ? T.blue[100] : T.slate[100]}`,
                    borderRadius: 10, textAlign: 'center',
                    opacity: i < 5 ? 1 : 0.4,
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 4, filter: i >= 5 ? 'grayscale(1)' : 'none' }}>{b.e}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.slate[800] }}>{b.n}</div>
                    <div style={{ fontSize: 9, color: T.slate[500], marginTop: 1 }}>{b.t}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* AI 인사이트 */}
            <Card pad={20} tone="tint">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ color: T.blue[500] }}>{Icon.sparkle(16)}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: T.blue[700], letterSpacing: '0.04em' }}>AI 인사이트</span>
              </div>
              {[
                { tone: 'good', t: '오전 학습의 정답률이 오후보다 14%p 높아요. 수학은 오전에 더 배치해볼까요?' },
                { tone: 'warn', t: '수요일 저녁엔 완료율이 40%로 낮아요. 블록 크기를 1h → 40m으로 줄이는 걸 제안해요.' },
                { tone: 'good', t: '삼각함수 정답률이 3주간 42 → 78%로 상승 중. 다음 단원으로 넘어갈 준비가 됐어요.' },
              ].map((i, idx) => (
                <div key={idx} style={{ padding: '10px 0', borderTop: idx > 0 ? `1px solid ${T.blue[200]}` : 'none' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ flexShrink: 0, color: i.tone === 'good' ? T.success : T.warn }}>
                      {i.tone === 'good' ? '↑' : '⚠'}
                    </span>
                    <span style={{ fontSize: 12, color: T.blue[900], lineHeight: 1.5 }}>{i.t}</span>
                  </div>
                </div>
              ))}
              <Btn variant="outline" size="sm" full style={{ marginTop: 10 }}>모든 인사이트 보기</Btn>
            </Card>

            {/* 취약 단원 */}
            <Card pad={20}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>⚠ 아직 약한 단원</div>
              {[
                { n: '영어 빈칸추론 · 논리관계', s: '영어', pct: 51 },
                { n: '국어 고전시가 주제파악', s: '국어', pct: 58 },
                { n: '수학 수열 점화식', s: '수학Ⅰ', pct: 61 },
              ].map((w, i) => (
                <div key={i} style={{ padding: '10px 0',
                  borderTop: i > 0 ? `1px solid ${T.slate[100]}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{w.n}</span>
                    <span style={{ fontSize: 11, color: T.warn, fontWeight: 700 }}>{w.pct}%</span>
                  </div>
                  <Progress value={w.pct} tone="warn" height={4}/>
                </div>
              ))}
              <Btn variant="outline" size="sm" full icon={Icon.sparkle(12)} style={{ marginTop: 12 }}>
                이 단원 집중 플랜 만들기
              </Btn>
            </Card>
          </div>
        </div>
      </SubPage>
    </AppShell>
  );
}

Object.assign(window, { PlannerCustom, PlannerStats });
})();
