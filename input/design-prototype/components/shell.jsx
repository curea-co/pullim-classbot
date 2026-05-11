// 학생 앱 셸 — 헤더(스튜디오/스토어/스터디) + 사이드바(아코디언)
(() => {
const { pullimTokens: T, Logo, Avatar, Icon, Chip } = window;

function AppShell({ headerActive = 'study', sidebarActive = 'planner', openGroup = 'planner', subActive = 'custom', children }) {
  return (
    <div style={{
      width: 1440, height: 960, background: T.slate[50],
      fontFamily: 'Pretendard Variable, Pretendard, -apple-system, sans-serif',
      color: T.slate[900], display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <Header active={headerActive}/>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar active={sidebarActive} openGroup={openGroup} subActive={subActive}/>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Header({ active }) {
  const tabs = [
    { k: 'studio', n: '스튜디오', sub: '크리에이터' },
    { k: 'store',  n: '스토어',   sub: '교재·강의' },
    { k: 'study',  n: '스터디',   sub: '내 학습' },
  ];
  return (
    <header style={{
      height: 60, background: '#fff', borderBottom: `1px solid ${T.slate[100]}`,
      display: 'flex', alignItems: 'center', padding: '0 24px', gap: 32, flexShrink: 0,
    }}>
      <Logo size={24}/>
      <nav style={{ display: 'flex', gap: 2, height: '100%', alignItems: 'stretch' }}>
        {tabs.map(t => (
          <button key={t.k} style={{
            padding: '0 20px', height: '100%', border: 'none', background: 'transparent',
            cursor: 'pointer', fontFamily: 'inherit', position: 'relative',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', gap: 2,
            borderBottom: active === t.k ? `2px solid ${T.blue[500]}` : '2px solid transparent',
          }}>
            <span style={{ fontSize: 14, fontWeight: active === t.k ? 700 : 600,
              color: active === t.k ? T.blue[600] : T.slate[700], letterSpacing: '-0.02em' }}>{t.n}</span>
            <span style={{ fontSize: 10, color: T.slate[400], letterSpacing: '0.02em' }}>{t.sub}</span>
          </button>
        ))}
      </nav>
      <div style={{ flex: 1, maxWidth: 440, marginLeft: 16 }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.slate[400] }}>{Icon.search(16)}</span>
          <input placeholder="무엇이든 찾아보세요 — 단원, 선생님, 문항, 교재…" style={{
            width: '100%', height: 36, padding: '0 12px 0 36px',
            background: T.slate[50], border: `1px solid transparent`, borderRadius: 8,
            fontSize: 13, fontFamily: 'inherit', outline: 'none', color: T.slate[800],
          }}/>
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 10, color: T.slate[400], padding: '2px 6px', border: `1px solid ${T.slate[200]}`, borderRadius: 4 }}>⌘K</span>
        </div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: T.slate[700], fontWeight: 600 }}>
          <span style={{ color: T.warn }}>{Icon.flame(14)}</span>7일
        </div>
        <div style={{ fontSize: 12, color: T.slate[700], fontWeight: 600,
          background: T.slate[100], padding: '4px 10px', borderRadius: 999 }}>크레딧 240</div>
        <div style={{ position: 'relative', color: T.slate[600], cursor: 'pointer' }}>
          {Icon.bell(18)}
          <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8,
            borderRadius: '50%', background: T.danger, border: '2px solid #fff' }}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <Avatar name="혜" size={30} color={T.blue[400]}/>
          <div style={{ fontSize: 12, lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700 }}>김혜원</div>
            <div style={{ fontSize: 10, color: T.slate[500] }}>고2 · Standard</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ active, openGroup, subActive }) {
  const groups = [
    {
      k: 'planner', n: '플래너', ic: Icon.calendar, badge: '3',
      children: [
        { k: 'today',   n: '오늘의 플랜' },
        { k: 'week',    n: '주간 캘린더' },
        { k: 'ai',      n: 'AI 플래닝' },
        { k: 'custom',  n: '커스텀 편집' },
        { k: 'stats',   n: '학습 성취도' },
      ],
    },
    {
      k: 'classroom', n: '클래스룸', ic: Icon.users,
      children: [
        { k: 'live',     n: '수업 라이브' },
        { k: 'rooms',    n: '내 클래스' },
        { k: 'archive',  n: '지난 수업' },
        { k: 'notes',    n: '수업 노트' },
      ],
    },
  ];
  return (
    <aside style={{
      width: 248, background: '#fff', borderRight: `1px solid ${T.slate[100]}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100%',
    }}>
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: T.blue[50],
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.blue[600] }}>{Icon.book(16)}</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.slate[900] }}>스터디</div>
          <div style={{ fontSize: 10, color: T.slate[500] }}>내 학습 공간</div>
        </div>
      </div>

      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {groups.map(g => {
          const isOpen = openGroup === g.k;
          const isActive = active === g.k;
          return (
            <div key={g.k}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                background: isActive ? T.blue[50] : 'transparent',
                color: isActive ? T.blue[700] : T.slate[700],
                fontSize: 13, fontWeight: isActive ? 700 : 600,
              }}>
                <span>{g.ic(17)}</span>
                {g.n}
                {g.badge && (
                  <span style={{ background: T.blue[500], color: '#fff', fontSize: 10, fontWeight: 700,
                    padding: '1px 6px', borderRadius: 999, marginLeft: 2 }}>{g.badge}</span>
                )}
                <span style={{ marginLeft: 'auto', color: T.slate[400],
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 4 l3 3 l3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </div>
              {isOpen && (
                <div style={{ padding: '2px 0 6px 30px', display: 'flex', flexDirection: 'column', gap: 1,
                  position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 20, top: 4, bottom: 10, width: 1, background: T.slate[100] }}/>
                  {g.children.map(c => {
                    const isSubActive = subActive === c.k && isActive;
                    return (
                      <div key={c.k} style={{
                        padding: '7px 12px', borderRadius: 6, cursor: 'pointer',
                        fontSize: 12.5, fontWeight: isSubActive ? 700 : 500,
                        color: isSubActive ? T.blue[700] : T.slate[600],
                        background: isSubActive ? T.blue[50] : 'transparent',
                        position: 'relative',
                      }}>
                        {isSubActive && (
                          <span style={{ position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)',
                            width: 3, height: 14, borderRadius: 2, background: T.blue[500] }}/>
                        )}
                        {c.n}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 'auto', padding: 12 }}>
        <div style={{
          background: `linear-gradient(135deg, ${T.blue[500]}, ${T.blue[700]})`,
          borderRadius: 12, padding: 14, color: '#fff',
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.85, letterSpacing: '0.08em' }}>PREMIUM</div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, marginBottom: 8, lineHeight: 1.3 }}>
            플래너·클래스룸<br/>무제한 이용
          </div>
          <button style={{
            width: '100%', height: 28, background: '#fff', color: T.blue[700],
            border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>업그레이드</button>
        </div>
      </div>
    </aside>
  );
}

Object.assign(window, { AppShell, StudentHeader: Header, StudySidebar: Sidebar });
})();
