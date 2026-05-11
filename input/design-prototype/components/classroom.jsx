// 클래스룸 — 수업 라이브 + 내 클래스
(() => {
const { pullimTokens: T, Btn, Card, Chip, Avatar, Icon, AppShell } = window;
const { SubPage } = window;

/* ═══════════════ 수업 라이브 (진행 중인 수업) ═══════════════ */
function ClassroomLive() {
  return (
    <AppShell headerActive="study" sidebarActive="classroom" openGroup="classroom" subActive="live">
      <SubPage
        title="수학Ⅰ · 삼각함수 응용"
        subtitle="박지훈 선생님 · 라이브 진행 중"
        right={<>
          <Chip tone="danger" size="sm">● LIVE · 42:17</Chip>
          <Btn variant="outline" size="sm">손들기 ✋</Btn>
          <Btn variant="danger" size="sm">나가기</Btn>
        </>}
        bg="#0A0E1A"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, height: '100%' }}>
          {/* STAGE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 화이트보드 */}
            <div style={{
              flex: 1, background: '#fff', borderRadius: 14, position: 'relative', overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}>
              {/* 교사 썸네일 (우상단) */}
              <div style={{
                position: 'absolute', top: 12, right: 12, width: 180, height: 110,
                background: `linear-gradient(135deg, #4B5A72, #2C3545)`, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${T.blue[500]}`,
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}>
                <Avatar name="박" size={48} color={T.blue[600]}/>
                <div style={{
                  position: 'absolute', bottom: 8, left: 8, fontSize: 11,
                  color: '#fff', fontWeight: 700,
                  background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 4,
                }}>박지훈 T · 🎙</div>
                <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8,
                  background: T.success, borderRadius: '50%',
                  boxShadow: `0 0 0 3px ${T.success}40` }}/>
              </div>

              {/* 화이트보드 내용 */}
              <div style={{ padding: '48px 72px', height: '100%' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.blue[600], letterSpacing: '0.12em' }}>
                  EXAMPLE 3 · 삼각형 넓이
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, letterSpacing: '-0.03em', color: T.slate[900] }}>
                  두 변과 끼인각이 주어졌을 때
                </div>
                <div style={{ marginTop: 32, fontFamily: 'Georgia, serif', fontSize: 20, lineHeight: 1.9, color: T.slate[800] }}>
                  삼각형 ABC에서 <b>a = 8</b>, <b>b = 7</b>, <b>∠C = 60°</b>일 때,<br/>
                  넓이 <b>S</b>를 구하여라.
                </div>
                <div style={{ marginTop: 40, padding: 24, background: T.slate[25],
                  borderRadius: 12, border: `2px dashed ${T.blue[300]}` }}>
                  <div style={{ fontSize: 11, color: T.blue[600], fontWeight: 700, marginBottom: 10 }}>✍ 선생님이 작성 중…</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: T.slate[800], lineHeight: 1.8 }}>
                    <span>S = </span>
                    <span style={{ color: T.blue[600], fontWeight: 700 }}>½ × 8 × 7 × sin 60°</span>
                    <span style={{
                      display: 'inline-block', width: 2, height: 26, background: T.blue[500],
                      verticalAlign: 'middle', marginLeft: 4,
                      animation: 'none',
                    }}/>
                  </div>
                </div>
              </div>

              {/* 하단 툴바 */}
              <div style={{
                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(10, 14, 26, 0.9)', backdropFilter: 'blur(10px)',
                borderRadius: 999, padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center',
              }}>
                {['✋','💬','📝','🎯','📎','⋯'].map((i, idx) => (
                  <span key={idx} style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: idx === 1 ? T.blue[500] : 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 15,
                  }}>{i}</span>
                ))}
              </div>
            </div>

            {/* 아래 — 실시간 투표 + 진도 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>
              <div style={{ background: '#141A2E', borderRadius: 12, padding: 16,
                border: `1px solid #1F2744` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Chip tone="blue" size="sm">LIVE POLL</Chip>
                  <span style={{ fontSize: 12, color: '#A3B0CC', fontWeight: 600 }}>답을 골라보세요 · 남은 시간 00:23</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 12 }}>
                  S = ½ × 8 × 7 × sin 60° = ?
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { l: '14',  p: 8 },
                    { l: '14√3', p: 62, correct: true, selected: true },
                    { l: '28',  p: 18 },
                    { l: '28√3', p: 12 },
                  ].map(o => (
                    <div key={o.l} style={{
                      position: 'relative', padding: '10px 12px', borderRadius: 8,
                      background: o.selected ? T.blue[500] : '#1F2744',
                      border: `1px solid ${o.selected ? T.blue[400] : '#2A3555'}`,
                      overflow: 'hidden', cursor: 'pointer',
                    }}>
                      <div style={{ position: 'absolute', inset: 0,
                        background: o.selected ? 'rgba(255,255,255,0.1)' : 'rgba(91,139,255,0.15)',
                        width: `${o.p}%` }}/>
                      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: '#fff', fontWeight: 700, fontFamily: 'Georgia, serif' }}>{o.l}</span>
                        <span style={{ fontSize: 11, color: o.selected ? '#fff' : '#A3B0CC', fontWeight: 700 }}>{o.p}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#141A2E', borderRadius: 12, padding: 16,
                border: `1px solid #1F2744` }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7A9B', letterSpacing: '0.1em', marginBottom: 10 }}>
                  오늘 수업 진도
                </div>
                {[
                  { n: '사인법칙 복습',  done: true },
                  { n: '코사인법칙',     done: true },
                  { n: '삼각형 넓이',    cur: true },
                  { n: '실전 문제',      done: false },
                  { n: 'Q&A',            done: false },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: s.done ? T.success : s.cur ? T.blue[500] : '#1F2744',
                      color: '#fff', fontSize: 10, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: s.cur ? `0 0 0 3px ${T.blue[500]}30` : 'none',
                    }}>{s.done ? '✓' : s.cur ? '●' : ''}</span>
                    <span style={{
                      fontSize: 12, fontWeight: s.cur ? 700 : 500,
                      color: s.cur ? '#fff' : s.done ? '#6B7A9B' : '#8893AB',
                      textDecoration: s.done ? 'line-through' : 'none',
                    }}>{s.n}</span>
                    {s.cur && <span style={{ marginLeft: 'auto', fontSize: 10, color: T.blue[400], fontWeight: 700 }}>진행 중</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SIDEBAR — 참여자 + 채팅 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
            <div style={{ background: '#141A2E', border: `1px solid #1F2744`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7A9B', letterSpacing: '0.1em' }}>
                  참여자 · 28명
                </div>
                <span style={{ fontSize: 10, color: T.success, fontWeight: 700 }}>● 24 온라인</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {['박','김','이','정','최','강','조','윤','장','임','한','오','서','신','권','황'].map((n, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <Avatar name={n} size={28} color={['#3B6FF6','#8B5CF6','#EC4899','#12B26B','#F59E0B'][i % 5]}/>
                    {i < 3 && <span style={{ position: 'absolute', bottom: -1, right: -1, width: 7, height: 7,
                      borderRadius: '50%', background: T.success, border: '2px solid #141A2E' }}/>}
                  </div>
                ))}
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1F2744',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: '#A3B0CC', fontWeight: 700 }}>+12</div>
              </div>
              <div style={{ marginTop: 10, padding: '8px 10px', background: `${T.warn}15`,
                borderLeft: `2px solid ${T.warn}`, borderRadius: 4,
                fontSize: 11, color: T.warn, fontWeight: 600 }}>
                ✋ 3명이 손들고 있어요
              </div>
            </div>

            <div style={{ background: '#141A2E', border: `1px solid #1F2744`, borderRadius: 12,
              flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid #1F2744`,
                fontSize: 10, fontWeight: 800, color: '#6B7A9B', letterSpacing: '0.1em' }}>
                실시간 채팅
              </div>
              <div style={{ flex: 1, padding: 12, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { n: '김민재', t: 'sin 60°가 √3/2 맞죠?', c: '#8B5CF6' },
                  { n: '박지훈 T', t: '맞아요! 바로 대입해보세요', c: T.blue[500], teacher: true },
                  { n: '이서연', t: '14√3이요!', c: '#EC4899' },
                  { n: '정하람', t: '계산이 헷갈려요 😭', c: '#12B26B' },
                  { n: '박지훈 T', t: '½ × 8 × 7 = 28이 먼저 나오죠', c: T.blue[500], teacher: true },
                  { n: 'AI 풀림이', t: '📎 관련 문제 3개를 "오답정복"에 준비했어요', c: T.warn, ai: true },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <Avatar name={m.n[0]} size={24} color={m.c}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{m.n}</span>
                        {m.teacher && <Chip tone="blue" size="sm">선생님</Chip>}
                        {m.ai && <Chip tone="warn" size="sm">AI</Chip>}
                      </div>
                      <div style={{ fontSize: 12, color: '#C4CBDA', marginTop: 2, lineHeight: 1.5 }}>{m.t}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: 10, borderTop: `1px solid #1F2744`, display: 'flex', gap: 6 }}>
                <input placeholder="메시지 입력…" style={{
                  flex: 1, height: 32, padding: '0 10px', background: '#0A0E1A',
                  border: `1px solid #2A3555`, borderRadius: 6,
                  fontSize: 12, color: '#fff', fontFamily: 'inherit', outline: 'none',
                }}/>
                <button style={{
                  width: 32, height: 32, background: T.blue[500], border: 'none',
                  borderRadius: 6, color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{Icon.arrowRight(14)}</button>
              </div>
            </div>
          </div>
        </div>
      </SubPage>
    </AppShell>
  );
}

/* ═══════════════ 내 클래스 ═══════════════ */
function ClassroomRooms() {
  const now = [
    {
      t: '수학Ⅰ · 삼각함수 응용', teacher: '박지훈', avatar: T.blue[500],
      status: 'live', students: 28, time: '화·목 19:00', next: '지금 진행 중 · 42분째',
      tag: '수능 대비', color: T.blue[500],
      bg: `linear-gradient(135deg, ${T.blue[500]}, ${T.blue[700]})`,
    },
    {
      t: '영어 구문 독해 마스터', teacher: '김유진', avatar: '#8B5CF6',
      status: 'soon', students: 22, time: '월·수 20:30', next: '오늘 저녁 8:30',
      tag: '내신',  color: '#8B5CF6',
      bg: `linear-gradient(135deg, #8B5CF6, #6D28D9)`,
    },
    {
      t: '국어 비문학 · 독서', teacher: '이서윤', avatar: '#EC4899',
      status: 'scheduled', students: 15, time: '토 10:00', next: '토요일 10:00',
      tag: '모의', color: '#EC4899',
      bg: `linear-gradient(135deg, #EC4899, #BE185D)`,
    },
  ];
  const requests = [
    { t: '한국사 근현대사 속성반', teacher: '조민호', students: 8, status: 'invite' },
    { t: '물리학Ⅰ 역학 집중', teacher: '최재원', students: 12, status: 'waitlist' },
  ];

  return (
    <AppShell headerActive="study" sidebarActive="classroom" openGroup="classroom" subActive="rooms">
      <SubPage
        title="내 클래스"
        subtitle="선생님과 함께하는 라이브 수업 · 내 수업 3개"
        right={<>
          <Btn variant="outline" size="sm" icon={Icon.search(13)}>클래스 찾기</Btn>
          <Btn size="sm" icon={Icon.plus(13)}>새 수업 참여</Btn>
        </>}
      >
        {/* 히어로 — 지금 진행 중 */}
        <div style={{
          background: now[0].bg, borderRadius: 16, padding: 28, color: '#fff',
          display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 240, height: 240,
            background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }}/>
          <div style={{ position: 'absolute', bottom: -60, right: 80, width: 180, height: 180,
            background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}/>
          <div style={{
            width: 72, height: 72, borderRadius: 16, background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255,255,255,0.3)', zIndex: 1,
          }}>🎥</div>
          <div style={{ flex: 1, zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                background: T.danger, padding: '3px 9px', borderRadius: 999,
                fontSize: 10, fontWeight: 800, letterSpacing: '0.08em' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }}/>
                LIVE
              </span>
              <span style={{ fontSize: 12, opacity: 0.85 }}>42:17 · 28명 참여 중</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>
              {now[0].t}
            </div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
              지금 수업 중인 단원: <b>삼각형 넓이 · Example 3</b>
            </div>
          </div>
          <Btn variant="secondary" size="lg" style={{ background: '#fff', color: T.blue[700], zIndex: 1 }}>
            수업 참여 →
          </Btn>
        </div>

        {/* 내 수업 그리드 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>내 클래스</h3>
          <div style={{ display: 'flex', gap: 4, background: T.slate[100], padding: 2, borderRadius: 6 }}>
            {['카드','리스트'].map((v, i) => (
              <span key={v} style={{
                padding: '4px 12px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                background: i === 0 ? '#fff' : 'transparent',
                color: i === 0 ? T.slate[900] : T.slate[500],
                boxShadow: i === 0 ? shadow.xs : 'none', cursor: 'pointer',
              }}>{v}</span>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {now.map((r, i) => (
            <Card key={i} pad={0} style={{ overflow: 'hidden', cursor: 'pointer' }}>
              <div style={{ height: 80, background: r.bg, position: 'relative', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {r.status === 'live' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: T.danger, padding: '3px 8px', borderRadius: 999,
                      fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: '0.08em' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }}/>
                      LIVE
                    </span>
                  )}
                  {r.status === 'soon' && (
                    <span style={{ background: 'rgba(255,255,255,0.25)', padding: '3px 8px',
                      borderRadius: 999, fontSize: 9, fontWeight: 800, color: '#fff',
                      letterSpacing: '0.04em' }}>오늘 예정</span>
                  )}
                  {r.status === 'scheduled' && (
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '3px 8px',
                      borderRadius: 999, fontSize: 9, fontWeight: 700, color: '#fff',
                      letterSpacing: '0.04em' }}>예약됨</span>
                  )}
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '3px 8px',
                    borderRadius: 999, fontSize: 9, fontWeight: 700, color: '#fff',
                    letterSpacing: '0.04em' }}>#{r.tag}</span>
                </div>
                <div style={{ position: 'absolute', bottom: -22, left: 16 }}>
                  <Avatar name={r.teacher[0]} size={44} color={r.avatar}/>
                </div>
              </div>
              <div style={{ padding: '30px 16px 16px' }}>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>{r.t}</div>
                <div style={{ fontSize: 12, color: T.slate[500] }}>{r.teacher} 선생님 · {r.students}명</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.slate[100]}` }}>
                  <div>
                    <div style={{ fontSize: 10, color: T.slate[500], fontWeight: 600 }}>{r.time}</div>
                    <div style={{ fontSize: 12, color: r.status === 'live' ? T.danger : T.slate[800],
                      fontWeight: 700, marginTop: 2 }}>{r.next}</div>
                  </div>
                  <Btn size="sm" variant={r.status === 'live' ? 'primary' : 'outline'}>
                    {r.status === 'live' ? '참여' : '상세'}
                  </Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* 아래 — 초대/대기 + 이번 주 일정 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginTop: 20 }}>
          <Card pad={20}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em' }}>초대 · 대기</div>
                <div style={{ fontSize: 12, color: T.slate[500], marginTop: 2 }}>선생님이 보낸 초대와 내가 신청한 수업</div>
              </div>
              <span style={{ fontSize: 11, color: T.blue[600], fontWeight: 700, cursor: 'pointer' }}>모두 보기 →</span>
            </div>
            {requests.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 0', borderTop: i > 0 ? `1px solid ${T.slate[100]}` : 'none',
              }}>
                <Avatar name={r.teacher[0]} size={40} color={['#12B26B','#F59E0B'][i]}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{r.t}</div>
                  <div style={{ fontSize: 11, color: T.slate[500], marginTop: 2 }}>
                    {r.teacher} 선생님 · {r.students}명 · {r.status === 'invite' ? '초대 받음' : '대기 중 (3번째)'}
                  </div>
                </div>
                {r.status === 'invite' ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn variant="ghost" size="sm">거절</Btn>
                    <Btn size="sm">수락</Btn>
                  </div>
                ) : (
                  <Chip tone="warn" size="sm">대기 중</Chip>
                )}
              </div>
            ))}
          </Card>

          <Card pad={20}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>
              이번 주 수업 일정
            </div>
            {[
              { d: '월', day: '22', t: '영어 구문 독해', h: '20:30', c: '#8B5CF6', live: false },
              { d: '화', day: '23', t: '수학Ⅰ 삼각함수', h: '19:00', c: T.blue[500], live: true, now: true },
              { d: '수', day: '24', t: '영어 구문 독해', h: '20:30', c: '#8B5CF6' },
              { d: '목', day: '25', t: '수학Ⅰ 삼각함수', h: '19:00', c: T.blue[500] },
              { d: '토', day: '27', t: '국어 비문학',    h: '10:00', c: '#EC4899' },
            ].map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                borderTop: i > 0 ? `1px solid ${T.slate[100]}` : 'none',
              }}>
                <div style={{
                  width: 38, textAlign: 'center', padding: '4px 0', borderRadius: 6,
                  background: s.now ? T.blue[500] : T.slate[50],
                  color: s.now ? '#fff' : T.slate[700],
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, opacity: s.now ? 0.9 : 0.6 }}>{s.d}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em' }}>{s.day}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.c }}/>
                    {s.t}
                  </div>
                  <div style={{ fontSize: 10, color: T.slate[500], marginTop: 1 }}>{s.h}</div>
                </div>
                {s.now && <Chip tone="danger" size="sm">● LIVE</Chip>}
              </div>
            ))}
          </Card>
        </div>
      </SubPage>
    </AppShell>
  );
}

Object.assign(window, { ClassroomLive, ClassroomRooms });
})();
