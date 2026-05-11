// 디자인 시스템 쇼케이스
const { pullimTokens: T, Logo, Btn, Card, Chip, Avatar, Progress, Icon } = window;

function SysSection({ title, subtitle, children }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{
          fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em',
          color: T.slate[900], margin: 0, marginBottom: 4,
        }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 13, color: T.slate[500], margin: 0 }}>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Swatch({ name, hex, dark }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{
        background: hex, height: 72, borderRadius: 10,
        border: `1px solid ${T.slate[200]}`, marginBottom: 8,
      }}/>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.slate[800] }}>{name}</div>
      <div style={{ fontSize: 11, color: T.slate[500], fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>{hex.toUpperCase()}</div>
    </div>
  );
}

function DesignSystemPage() {
  return (
    <div style={{
      width: 1440, background: T.slate[25], padding: '56px 72px',
      fontFamily: 'Pretendard, -apple-system, sans-serif', color: T.slate[900],
    }}>
      {/* Header */}
      <div style={{ marginBottom: 48, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <Logo size={32}/>
          <h1 style={{
            fontSize: 40, fontWeight: 800, letterSpacing: '-0.04em',
            margin: '20px 0 8px', color: T.slate[900],
          }}>디자인 시스템 v0.1</h1>
          <p style={{ fontSize: 15, color: T.slate[600], margin: 0, maxWidth: 640, lineHeight: 1.6 }}>
            AI 교육 콘텐츠 생산·유통·소비 통합 플랫폼 풀림의 기초 시각 언어.
            <br/>푸른 계열의 신뢰감 + 부드러운 타이포그래피 + 학생이 즉시 이해할 수 있는 UI 패턴을 지향합니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Chip tone="blue">v0.1 draft</Chip>
          <Chip tone="neutral">2026.04</Chip>
        </div>
      </div>

      {/* 1. 로고 */}
      <SysSection title="로고 & 브랜드마크" subtitle="ㅍ 이니셜을 풀어낸 라인 + 엔드포인트 닷. 엔드포인트는 '풀어냄의 결과' = 학습 인사이트를 상징">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <Card pad={32} tone="default" style={{ textAlign: 'center' }}>
            <Logo size={48}/>
            <div style={{ fontSize: 11, color: T.slate[500], marginTop: 16 }}>PRIMARY · 라이트 배경</div>
          </Card>
          <Card pad={32} style={{ textAlign: 'center', background: T.slate[900], border: 'none' }}>
            <Logo size={48} color="#fff"/>
            <div style={{ fontSize: 11, color: T.slate[400], marginTop: 16 }}>REVERSE · 다크 배경</div>
          </Card>
          <Card pad={32} tone="default" style={{ textAlign: 'center' }}>
            <Logo size={48} mono/>
            <div style={{ fontSize: 11, color: T.slate[500], marginTop: 16 }}>MONO · 1색 프린트</div>
          </Card>
        </div>
      </SysSection>

      {/* 2. 컬러 */}
      <SysSection title="컬러 팔레트" subtitle="풀림 블루 — '풀어낸다'의 푸른 물결. OKLCH 기반 균등 밝기 스케일.">
        <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: T.slate[700] }}>Brand · Pullim Blue</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 8, marginBottom: 28 }}>
          {[50,100,200,300,400,500,600,700,800,900,950].map(k =>
            <Swatch key={k} name={k === 500 ? `${k} · primary` : String(k)} hex={T.blue[k]}/>
          )}
        </div>
        <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: T.slate[700] }}>Neutral · Slate</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 8, marginBottom: 28 }}>
          {[25,50,100,200,300,400,500,600,700,800,900].map(k =>
            <Swatch key={k} name={String(k)} hex={T.slate[k]}/>
          )}
        </div>
        <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: T.slate[700] }}>Semantic</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
          <Swatch name="Success" hex={T.success}/>
          <Swatch name="Success BG" hex={T.successBg}/>
          <Swatch name="Warn" hex={T.warn}/>
          <Swatch name="Warn BG" hex={T.warnBg}/>
          <Swatch name="Danger" hex={T.danger}/>
          <Swatch name="Danger BG" hex={T.dangerBg}/>
        </div>
      </SysSection>

      {/* 3. 타이포그래피 */}
      <SysSection title="타이포그래피 스케일" subtitle="Pretendard Variable — 국문 가독성 + 영숫자 균형. 자간은 제목 −3%, 본문 −1%">
        <Card pad={32} tone="default">
          {[
            { size: 56, weight: 800, label: 'Display / 56 · 800 · -4%', sample: '문제를 풀면 길이 보인다' },
            { size: 40, weight: 800, label: 'H1 / 40 · 800 · -3%', sample: '오늘의 학습 인덱스' },
            { size: 28, weight: 700, label: 'H2 / 28 · 700 · -3%', sample: '풀림 무한풀기' },
            { size: 20, weight: 700, label: 'H3 / 20 · 700 · -2%', sample: '수학Ⅰ · 삼각함수' },
            { size: 16, weight: 600, label: 'Title / 16 · 600 · -1%', sample: '취약 단원 5개를 찾았어요' },
            { size: 15, weight: 400, label: 'Body / 15 · 400 · -1%', sample: '맞추면 조금 더 어렵게, 틀리면 조금 더 쉽게 — 내 실력에 딱 맞는 문제가 끊임없이 나와요.' },
            { size: 13, weight: 500, label: 'Caption / 13 · 500', sample: 'Level 3 · 정답률 72% · 3:14' },
            { size: 11, weight: 600, label: 'Micro / 11 · 600 · +4% uppercase', sample: 'NEW · LIVE · BETA' },
          ].map((t, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '220px 1fr',
              padding: '16px 0',
              borderBottom: i < 7 ? `1px solid ${T.slate[100]}` : 'none',
              alignItems: 'baseline',
            }}>
              <div style={{ fontSize: 12, color: T.slate[500],
                fontFamily: 'ui-monospace, monospace' }}>{t.label}</div>
              <div style={{
                fontSize: t.size, fontWeight: t.weight,
                letterSpacing: t.size >= 28 ? '-0.03em' : '-0.01em',
                color: T.slate[900], lineHeight: 1.25,
              }}>{t.sample}</div>
            </div>
          ))}
        </Card>
      </SysSection>

      {/* 4. 간격 / 라운드 / 그림자 */}
      <SysSection title="간격 · 라운드 · 그림자" subtitle="4 기반 스페이싱, 10/14/20 주요 라운드, 4단계 엘리베이션">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          <Card pad={24}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: T.slate[700] }}>Spacing · 4 base</div>
            {[4,8,12,16,20,24,32,48].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <div style={{ width: s, height: 8, background: T.blue[400], borderRadius: 2 }}/>
                <span style={{ fontSize: 12, color: T.slate[500], fontFamily: 'ui-monospace, monospace' }}>{s}px</span>
              </div>
            ))}
          </Card>
          <Card pad={24}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: T.slate[700] }}>Radius</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[{k:'xs',v:4},{k:'sm',v:6},{k:'md',v:10},{k:'lg',v:14},{k:'xl',v:20},{k:'pill',v:999}].map(r => (
                <div key={r.k} style={{ textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, background: T.blue[100], borderRadius: r.v,
                    border: `1px solid ${T.blue[200]}` }}/>
                  <div style={{ fontSize: 11, color: T.slate[500], marginTop: 4, fontFamily: 'ui-monospace, monospace' }}>{r.k}·{r.v < 999 ? r.v : '∞'}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card pad={24}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: T.slate[700] }}>Shadow</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.entries(window.shadow).map(([k, v]) => (
                <div key={k} style={{
                  height: 32, background: '#fff', borderRadius: 8,
                  boxShadow: v, display: 'flex', alignItems: 'center', paddingLeft: 12,
                  fontSize: 11, color: T.slate[600], fontFamily: 'ui-monospace, monospace',
                }}>{k}</div>
              ))}
            </div>
          </Card>
        </div>
      </SysSection>

      {/* 5. 버튼 */}
      <SysSection title="버튼" subtitle="5 variant × 3 size. 대상 행동에 따른 위계 명확히">
        <Card pad={28}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
            {['primary','secondary','outline','ghost','danger'].map(v => (
              <div key={v} style={{ textAlign: 'center' }}>
                <Btn variant={v}>문제 풀기</Btn>
                <div style={{ fontSize: 11, color: T.slate[500], marginTop: 8 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Btn size="sm">Small</Btn>
            <Btn size="md">Medium</Btn>
            <Btn size="lg">Large</Btn>
            <Btn icon={Icon.sparkle(14)}>AI 생성</Btn>
            <Btn variant="outline" icon={Icon.plus()}>추가</Btn>
          </div>
        </Card>
      </SysSection>

      {/* 6. 인풋 & 카드 */}
      <SysSection title="인풋 & 카드" subtitle="40/48 height, focus 시 블루 2px ring">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Card pad={24}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.slate[700], display: 'block', marginBottom: 6 }}>이메일</label>
              <input defaultValue="student@example.com" style={{
                width: '100%', height: 44, padding: '0 14px',
                border: `1px solid ${T.slate[200]}`, borderRadius: 10,
                fontSize: 14, fontFamily: 'inherit', outline: 'none',
              }}/>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.slate[700], display: 'block', marginBottom: 6 }}>비밀번호 · focused</label>
              <input defaultValue="••••••••" type="password" style={{
                width: '100%', height: 44, padding: '0 14px',
                border: `2px solid ${T.blue[500]}`, borderRadius: 10,
                fontSize: 14, fontFamily: 'inherit', outline: 'none',
                boxShadow: '0 0 0 4px rgba(59,111,246,0.15)',
              }}/>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.slate[700], display: 'block', marginBottom: 6 }}>검색 · with icon</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: T.slate[400] }}>{Icon.search()}</span>
                <input placeholder="단원, 문항, 교재 검색" style={{
                  width: '100%', height: 44, padding: '0 14px 0 40px',
                  border: `1px solid ${T.slate[200]}`, borderRadius: 10,
                  background: T.slate[50], fontSize: 14, fontFamily: 'inherit', outline: 'none',
                }}/>
              </div>
            </div>
          </Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Card tone="default" pad={20}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.slate[500], marginBottom: 4 }}>default</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>수학Ⅰ · 삼각함수</div>
              <div style={{ fontSize: 13, color: T.slate[500], marginTop: 4 }}>기본 카드</div>
            </Card>
            <Card tone="raised" pad={20}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.slate[500], marginBottom: 4 }}>raised</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>풀림 인덱스 리포트</div>
              <div style={{ fontSize: 13, color: T.slate[500], marginTop: 4 }}>엘리베이션 있음</div>
            </Card>
            <Card tone="tint" pad={20}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.blue[600], marginBottom: 4 }}>tint (AI 제안)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.blue[900] }}>AI가 추천한 오늘의 집중 영역</div>
              <div style={{ fontSize: 13, color: T.blue[700], marginTop: 4 }}>브랜드 컬러 강조</div>
            </Card>
          </div>
        </div>
      </SysSection>

      {/* 7. Chips & Progress */}
      <SysSection title="뱃지 · 칩 · 진행률" subtitle="상태, 카테고리, 학습 진도 표시">
        <Card pad={24}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            <Chip tone="neutral">전체</Chip>
            <Chip tone="blue">진단 중</Chip>
            <Chip tone="success">✓ 정복 완료</Chip>
            <Chip tone="warn">⚠ 주의 필요</Chip>
            <Chip tone="danger">오답 누적</Chip>
            <Chip tone="solid">Premium</Chip>
            <Chip tone="blue">★ AI 추천</Chip>
            <Chip tone="neutral" size="sm">Core</Chip>
            <Chip tone="blue" size="sm">Growth</Chip>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <Progress value={78} label="수학Ⅰ 정답률" tone="blue"/>
              <div style={{ height: 12 }}/>
              <Progress value={42} label="영어 독해" tone="warn"/>
              <div style={{ height: 12 }}/>
              <Progress value={91} label="기억장치 복습률" tone="success"/>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>IRT 난이도 스펙트럼</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[T.lvl1,T.lvl2,T.lvl3,T.lvl4,T.lvl5].map((c, i) => (
                  <div key={i} style={{ flex: 1, height: 32, background: c, borderRadius: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: i >= 3 ? '#fff' : T.slate[700], fontSize: 11, fontWeight: 700 }}>Lv{i+1}</div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: T.slate[500], marginTop: 6 }}>
                현재 θ = 1.2 · 내 수준 범위 <span style={{ color: T.blue[600], fontWeight: 700 }}>Lv3~4</span>
              </div>
            </div>
          </div>
        </Card>
      </SysSection>

      {/* 8. 차트 토큰 */}
      <SysSection title="차트 & 시각화 토큰" subtitle="히트맵 / 레이더 / IRT 곡선 — 학습 데이터 전용 팔레트">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          {/* 히트맵 */}
          <Card pad={24}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>정답률 히트맵</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
              {Array.from({length: 35}).map((_, i) => {
                const v = [0,1,2,3,4,5][Math.floor(Math.random()*6)];
                const colors = [T.heat0, T.heat1, T.heat2, T.heat3, T.heat4, T.heat5];
                return <div key={i} style={{ aspectRatio: '1', background: colors[v], borderRadius: 3 }}/>;
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.slate[500], marginTop: 8 }}>
              <span>적음</span><span>많음</span>
            </div>
          </Card>
          {/* 레이더 */}
          <Card pad={24}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>사고유형 레이더</div>
            <svg viewBox="0 0 200 160" width="100%" height="160">
              {[1,2,3,4].map(r => (
                <polygon key={r} points="100,20 170,70 140,150 60,150 30,70"
                  fill="none" stroke={T.slate[200]} strokeWidth="1"
                  transform={`scale(${r/4}) translate(${100*(4-r)/r/1}, ${80*(4-r)/r/1})`}/>
              ))}
              <polygon points="100,20 170,70 140,150 60,150 30,70" fill="none" stroke={T.slate[200]}/>
              <polygon points="100,42 148,80 125,125 72,118 58,82" fill={T.blue[200]} fillOpacity="0.5" stroke={T.blue[500]} strokeWidth="2"/>
              {['이해','적용','분석','판단','표현'].map((t, i) => {
                const angle = -Math.PI/2 + i * 2*Math.PI/5;
                const x = 100 + Math.cos(angle)*88; const y = 80 + Math.sin(angle)*70;
                return <text key={t} x={x} y={y} fontSize="10" fill={T.slate[600]} textAnchor="middle" dominantBaseline="central">{t}</text>;
              })}
            </svg>
          </Card>
          {/* IRT 곡선 */}
          <Card pad={24}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>IRT 3PL 곡선 (θ 추정)</div>
            <svg viewBox="0 0 200 140" width="100%" height="140">
              <line x1="20" y1="120" x2="190" y2="120" stroke={T.slate[200]}/>
              <line x1="20" y1="10" x2="20" y2="120" stroke={T.slate[200]}/>
              <path d="M 20 115 Q 80 110, 100 70 T 190 20" fill="none" stroke={T.blue[500]} strokeWidth="2.5"/>
              <circle cx="100" cy="70" r="5" fill={T.blue[500]}/>
              <line x1="100" y1="70" x2="100" y2="120" stroke={T.blue[500]} strokeDasharray="3 3" strokeWidth="1"/>
              <text x="100" y="135" fontSize="10" fill={T.blue[700]} textAnchor="middle" fontWeight="700">θ = 1.2</text>
              <text x="12" y="15" fontSize="9" fill={T.slate[500]} textAnchor="end">1.0</text>
              <text x="12" y="122" fontSize="9" fill={T.slate[500]} textAnchor="end">0</text>
            </svg>
          </Card>
        </div>
      </SysSection>

      {/* 9. 아이콘 */}
      <SysSection title="아이콘 스타일 가이드" subtitle="1.6~1.8 스트로크, 라운드 캡, 20×20 viewBox — 선 기반 미니멀">
        <Card pad={28}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 12 }}>
            {Object.entries(Icon).filter(([k]) => !['dot'].includes(k)).map(([k, fn]) => (
              <div key={k} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 10,
                  background: T.slate[50], display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: T.slate[700], margin: '0 auto 6px',
                }}>{fn(20)}</div>
                <div style={{ fontSize: 10, color: T.slate[500], fontFamily: 'ui-monospace, monospace' }}>{k}</div>
              </div>
            ))}
          </div>
        </Card>
      </SysSection>

      {/* 10. AI UI 패턴 */}
      <SysSection title="AI 관련 UI 패턴" subtitle="대화 / 스트리밍 / 5단계 힌트 — 풀림 튜터·클래스봇의 핵심 시각 언어">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* 대화 */}
          <Card pad={24}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: T.blue[500] }}>{Icon.sparkle(14)}</span> AI 튜터 대화
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ alignSelf: 'flex-end', maxWidth: '75%', background: T.blue[500], color: '#fff',
                padding: '10px 14px', borderRadius: '14px 14px 4px 14px', fontSize: 13 }}>
                이 문제 모르겠어요
              </div>
              <div style={{ alignSelf: 'flex-start', maxWidth: '80%', background: T.slate[100], color: T.slate[800],
                padding: '10px 14px', borderRadius: '14px 14px 14px 4px', fontSize: 13 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.blue[600], marginBottom: 4 }}>힌트 Lv1 · 방향 제시</div>
                어떤 부분에서 막혔는지 말해줄 수 있어?
              </div>
              <div style={{ alignSelf: 'flex-start', maxWidth: '80%', background: T.slate[100], color: T.slate[800],
                padding: '10px 14px', borderRadius: '14px 14px 14px 4px', fontSize: 13,
                display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', gap: 3 }}>
                  {[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: '50%',
                    background: T.slate[400], opacity: 0.4 + i*0.2 }}/>)}
                </span>
                <span style={{ fontSize: 11, color: T.slate[500] }}>AI가 생각 중</span>
              </div>
            </div>
          </Card>

          {/* 5단계 힌트 */}
          <Card pad={24}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>5단계 스캐폴딩 힌트</div>
            {[
              { lv: 1, name: '방향 제시', text: '어떤 부분을 다시 읽어볼까?', active: true },
              { lv: 2, name: '핵심 개념', text: '이 문제는 인과관계를 묻고 있어', active: true },
              { lv: 3, name: '구체 단서', text: '3번째 문장의 because에 주목해봐', active: false },
              { lv: 4, name: '거의 정답', text: 'A/B 중 because 절과 일치하는 건?', active: false },
              { lv: 5, name: '해설 공개', text: '학생이 원할 때만 공개', active: false },
            ].map(h => (
              <div key={h.lv} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: h.lv < 5 ? `1px solid ${T.slate[100]}` : 'none',
                opacity: h.active ? 1 : 0.45,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: h.active ? T.blue[500] : T.slate[200],
                  color: h.active ? '#fff' : T.slate[500],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                }}>{h.lv}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.slate[800] }}>{h.name}</div>
                  <div style={{ fontSize: 11, color: T.slate[500], marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.text}</div>
                </div>
                {h.active && <span style={{ color: T.success }}>{Icon.check()}</span>}
              </div>
            ))}
          </Card>

          {/* 스트리밍 */}
          <Card pad={24} style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: T.blue[500] }}>{Icon.sparkle(14)}</span> AI 스트리밍 응답 · 토큰 단위 렌더
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: T.slate[800] }}>
              이 문제는 <mark style={{ background: T.blue[100], color: T.blue[800], padding: '0 4px', borderRadius: 3 }}>사인법칙</mark>을 활용하는 유형이야.
              삼각형에서 두 변과 끼인각을 알 때 쓰는 공식을 떠올려봐.
              S = ½ab·sinC — <span style={{
                display: 'inline-block', width: 8, height: 16, background: T.blue[500],
                verticalAlign: 'text-bottom', animation: 'blink 1s step-end infinite',
              }}/>
            </div>
            <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
          </Card>
        </div>
      </SysSection>

      {/* 11. 다크모드 미리보기 */}
      <SysSection title="다크모드" subtitle="야간 학습 / OLED 절전 / 집중 모드 전환용">
        <div style={{ background: T.slate[950], padding: 28, borderRadius: 16, border: `1px solid ${T.slate[800]}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div style={{ background: T.slate[900], borderRadius: 12, padding: 18, border: `1px solid ${T.slate[800]}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.blue[300], marginBottom: 6, letterSpacing: '0.04em' }}>AI 추천</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>오늘의 집중 영역</div>
              <div style={{ fontSize: 13, color: T.slate[400] }}>삼각함수 · 사인법칙 응용</div>
            </div>
            <div style={{ background: T.blue[950], borderRadius: 12, padding: 18, border: `1px solid ${T.blue[900]}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.blue[300], marginBottom: 6, letterSpacing: '0.04em' }}>학습 중</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>풀림 무한풀기</div>
              <Progress value={62} tone="blue" height={6}/>
            </div>
            <div style={{ background: T.slate[900], borderRadius: 12, padding: 18, border: `1px solid ${T.slate[800]}` }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <Chip tone="blue">진단중</Chip>
                <span style={{ background: 'rgba(18,178,107,0.15)', color: '#4ADE80',
                  padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>✓ 3일 연속</span>
              </div>
              <div style={{ fontSize: 13, color: T.slate[400] }}>학습 스트릭 유지 중</div>
            </div>
          </div>
        </div>
      </SysSection>

      {/* Footer */}
      <div style={{ marginTop: 60, paddingTop: 24, borderTop: `1px solid ${T.slate[200]}`,
        fontSize: 12, color: T.slate[500], display: 'flex', justifyContent: 'space-between' }}>
        <span>풀림 디자인 시스템 · v0.1 draft · 2026.04</span>
        <span>Pretendard Variable · 1440 base grid · OKLCH-derived blue scale</span>
      </div>
    </div>
  );
}

window.DesignSystemPage = DesignSystemPage;
