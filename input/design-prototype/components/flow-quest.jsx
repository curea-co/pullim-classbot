// 플래너 실행 플로우 · 변형 Q (Quest · 게이미피케이션)
// 6화면: 퀘스트 브리핑 / 오늘의 모험 / 배틀 실행 / 승리 화면 / 휴식 보상 / 원정 결과
(() => {
const { pullimTokens: T, Btn, Card, Chip, Avatar, Progress, Icon } = window;

// 게이미 팔레트 (변형 B와 통일)
const Q = {
  bg:     '#0A0E1A',
  panel:  '#141A2E',
  panel2: '#1A2140',
  line:   '#242B4A',
  text:   '#F0F2F8',
  sub:    '#8693B8',
  accent: '#C4FF3D',  // 라임
  purple: '#A78BFA',
  pink:   '#F472B6',
  gold:   '#FCD34D',
  danger: '#FB7185',
};

const mono = 'ui-monospace, SFMono-Regular, "JetBrains Mono", monospace';

/* ═══════════════ 1. 퀘스트 브리핑 (블록 상세 모달) ═══════════════ */
function QuestBriefing() {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      background: Q.bg,
    }}>
      {/* 배경 맵 (흐릿) */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.35, filter: 'blur(2px)' }}>
        <TodayMapInner blurred/>
      </div>
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(10,14,26,0.5), rgba(10,14,26,0.92))' }}/>

      {/* 카드 */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 760, maxHeight: '92%', overflow: 'auto',
        background: Q.panel, borderRadius: 16,
        border: `1px solid ${Q.line}`,
        boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(196,255,61,0.1)',
        color: Q.text,
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 28px',
          background: `linear-gradient(180deg, rgba(196,255,61,0.08), transparent)`,
          borderBottom: `1px solid ${Q.line}`,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* 스캔라인 */}
          <div style={{ position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(0deg, transparent 0, transparent 3px, rgba(196,255,61,0.015) 3px, rgba(196,255,61,0.015) 4px)',
            pointerEvents: 'none' }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.3em',
              color: Q.accent, fontFamily: mono }}>▸ INCOMING QUEST</span>
            <QBadge tone="purple">ACT Ⅲ</QBadge>
            <QBadge tone="lime">DAILY</QBadge>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: Q.sub, fontFamily: mono }}>
              14:00 — 16:00
            </span>
            <span style={{ width: 26, height: 26, display: 'grid', placeItems: 'center',
              color: Q.sub, cursor: 'pointer', fontSize: 16 }}>✕</span>
          </div>
          <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em',
            margin: '0 0 4px', textShadow: `0 0 40px ${Q.accent}30` }}>
            <span style={{ color: Q.sub, fontSize: 16, marginRight: 8 }}>QUEST 07</span>
            사인법칙 응용
          </h2>
          <p style={{ fontSize: 13, color: Q.sub, margin: 0, lineHeight: 1.6 }}>
            외접원의 반지름을 구하라. Boss 문항 3개 포함 · 20 라운드 · 30분 제한
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {/* Loot / 보상 */}
          <QSection n="01" label="REWARDS · 보상">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <LootCard icon="⚡" value="+150" label="XP" tone={Q.accent}/>
              <LootCard icon="💎" value="+25" label="GEM" tone="#60A5FA"/>
              <LootCard icon="🏆" value="트로피 조각" label="×2" tone={Q.gold}/>
              <LootCard icon="🔥" value="STREAK" label="8일차 유지" tone={Q.pink}/>
            </div>
            <div style={{ marginTop: 8, padding: '8px 12px',
              background: `${Q.accent}10`, border: `1px solid ${Q.accent}30`,
              borderRadius: 8, fontSize: 11, color: Q.accent, fontFamily: mono,
              display: 'flex', alignItems: 'center', gap: 6 }}>
              ⚡ PERFECT 보너스 +75 XP · 정답률 90%+ 시
            </div>
          </QSection>

          {/* 오브젝티브 */}
          <QSection n="02" label="OBJECTIVES · 완료 조건">
            <QObjective icon="📝" label="Rounds" value="20 / 20" sub="주 목표" primary on/>
            <QObjective icon="⏱" label="Time limit" value="30:00" sub="하드 컷오프" on/>
            <QObjective icon="🎯" label="Accuracy" value="≥ 75%" sub="미달 시 +5 라운드" on/>
            <QObjective icon="👑" label="Boss clear" value="3 / 3" sub="보너스 조건"/>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', background: Q.panel2, borderRadius: 8,
              border: `1px solid ${Q.line}` }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: Q.sub, letterSpacing: '0.1em' }}>LOGIC</span>
              <div style={{ display: 'flex', gap: 2, background: Q.bg, padding: 2, borderRadius: 5 }}>
                {['ALL', 'ANY', 'PRIMARY + SUB'].map((o, i) => (
                  <span key={o} style={{
                    padding: '3px 10px', borderRadius: 3, fontSize: 10, fontWeight: 800,
                    fontFamily: mono, letterSpacing: '0.06em',
                    background: i === 2 ? Q.accent : 'transparent',
                    color: i === 2 ? '#000' : Q.sub, cursor: 'pointer',
                  }}>{o}</span>
                ))}
              </div>
            </div>
          </QSection>

          {/* 라운드 구성 */}
          <QSection n="03" label="BATTLE COMPOSITION · 전투 구성">
            <div style={{ display: 'flex', gap: 0, background: Q.panel2, borderRadius: 8,
              padding: 3, border: `1px solid ${Q.line}`, marginBottom: 10 }}>
              <CompSlot count={6} label="WARMUP" color="#64748B" w={30}/>
              <CompSlot count={8} label="NORMAL" color={Q.accent} w={40}/>
              <CompSlot count={3} label="HARD" color={Q.purple} w={15}/>
              <CompSlot count={3} label="BOSS" color={Q.pink} w={15} boss/>
            </div>
            <div style={{ fontSize: 10, color: Q.sub, fontFamily: mono,
              display: 'flex', gap: 12 }}>
              <span>● 6 WARMUP</span>
              <span style={{ color: Q.accent }}>● 8 NORMAL</span>
              <span style={{ color: Q.purple }}>● 3 HARD</span>
              <span style={{ color: Q.pink }}>● 3 BOSS 👑</span>
            </div>
          </QSection>

          {/* 풀 선택 */}
          <QSection n="04" label="ARSENAL · 문제 풀">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <ArsenalCard icon="⚔️" name="풀림 기본 DB" meta="2,400+ · 적응형" on primary/>
              <ArsenalCard icon="📘" name="내 교재 DB" meta="84 · 업로드" on/>
              <ArsenalCard icon="🛒" name="수능완성" meta="120 · 구매" on paid/>
            </div>
          </QSection>

          {/* AI 조언 */}
          <div style={{
            padding: 14, background: `linear-gradient(135deg, ${Q.purple}15, transparent)`,
            border: `1px solid ${Q.purple}40`, borderRadius: 10,
            display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 6,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${Q.purple}, #6D28D9)`,
              display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 18 }}>🧙</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: Q.purple,
                letterSpacing: '0.14em', fontFamily: mono }}>SCOUT · AI 풀림이</div>
              <div style={{ fontSize: 13, color: Q.text, lineHeight: 1.6, marginTop: 4 }}>
                "어제 '사인법칙 기본'을 72%로 통과했다. BOSS 3마리 중 2마리는 <span style={{ color: Q.accent, fontWeight: 700 }}>외접원 응용</span> 형태다.
                상위 10%는 이 퀘스트를 <span style={{ color: Q.gold, fontFamily: mono, fontWeight: 700 }}>24분</span>에 끝냈다. 도전해볼 만하다."
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px', borderTop: `1px solid ${Q.line}`,
          background: Q.panel2, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <button style={{
            height: 44, padding: '0 18px', background: 'transparent',
            border: `1px solid ${Q.line}`, borderRadius: 8,
            color: Q.sub, fontSize: 12, fontWeight: 700, fontFamily: mono,
            letterSpacing: '0.04em', cursor: 'pointer',
          }}>LATER</button>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: Q.sub, fontFamily: mono, letterSpacing: '0.1em' }}>ETA</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: Q.text, fontFamily: mono }}>22:00 – 28:00</div>
            </div>
            <div style={{ width: 1, height: 28, background: Q.line }}/>
            <button style={{
              height: 48, padding: '0 26px',
              background: Q.accent, color: '#000',
              border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 900, fontFamily: mono,
              letterSpacing: '0.1em', cursor: 'pointer',
              boxShadow: `0 0 0 3px ${Q.accent}30, 0 8px 20px ${Q.accent}30`,
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>▶ BEGIN QUEST</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QSection({ n, label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{
          fontSize: 9, fontWeight: 900, fontFamily: mono, letterSpacing: '0.12em',
          color: Q.accent, padding: '3px 8px', background: `${Q.accent}15`,
          borderRadius: 4, border: `1px solid ${Q.accent}30`,
        }}>§{n}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: Q.text,
          letterSpacing: '0.08em', fontFamily: mono }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: Q.line,
          backgroundImage: `linear-gradient(to right, ${Q.line}, transparent)` }}/>
      </div>
      {children}
    </div>
  );
}
function QBadge({ children, tone }) {
  const c = { lime: Q.accent, purple: Q.purple, gold: Q.gold, pink: Q.pink }[tone] || Q.accent;
  return (
    <span style={{
      padding: '3px 8px', borderRadius: 4,
      background: `${c}20`, border: `1px solid ${c}50`, color: c,
      fontSize: 9, fontWeight: 900, letterSpacing: '0.14em', fontFamily: mono,
    }}>{children}</span>
  );
}
function LootCard({ icon, value, label, tone }) {
  return (
    <div style={{
      padding: 12, background: Q.panel2,
      border: `1px solid ${Q.line}`, borderRadius: 10,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 900, color: tone, fontFamily: mono,
        letterSpacing: '-0.02em', marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 9, color: Q.sub, fontWeight: 700, letterSpacing: '0.1em',
        fontFamily: mono, marginTop: 2 }}>{label}</div>
    </div>
  );
}
function QObjective({ icon, label, value, sub, on, primary }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px', borderRadius: 8,
      background: primary ? `${Q.accent}08` : 'transparent',
      border: primary ? `1px solid ${Q.accent}50` : `1px solid transparent`,
      marginBottom: 4,
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 4,
        background: on ? Q.accent : 'transparent',
        border: on ? 'none' : `1px solid ${Q.line}`,
        display: 'grid', placeItems: 'center', color: '#000',
        fontSize: 11, fontWeight: 900, flexShrink: 0,
      }}>{on && '✓'}</span>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: mono, letterSpacing: '0.04em' }}>
          {label.toUpperCase()}
          {primary && <span style={{ marginLeft: 6, fontSize: 8, color: Q.accent,
            fontWeight: 900, letterSpacing: '0.12em' }}>◆ PRIMARY</span>}
        </div>
        <div style={{ fontSize: 10, color: Q.sub, marginTop: 1 }}>{sub}</div>
      </div>
      <span style={{
        fontSize: 13, fontWeight: 900, fontFamily: mono,
        color: on ? Q.accent : Q.sub,
        padding: '3px 10px', background: on ? `${Q.accent}15` : 'transparent',
        border: on ? `1px solid ${Q.accent}40` : `1px solid ${Q.line}`,
        borderRadius: 5,
      }}>{value}</span>
    </div>
  );
}
function CompSlot({ count, label, color, w, boss }) {
  return (
    <div style={{
      flex: w, height: 44, borderRadius: 5,
      background: `${color}20`, border: `1px solid ${color}60`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      margin: 1, position: 'relative',
    }}>
      <div style={{ fontSize: 18, fontWeight: 900, color, fontFamily: mono,
        letterSpacing: '-0.04em' }}>{count}{boss && ' 👑'}</div>
      <div style={{ fontSize: 8, fontWeight: 800, color, opacity: 0.8,
        letterSpacing: '0.1em', fontFamily: mono }}>{label}</div>
    </div>
  );
}
function ArsenalCard({ icon, name, meta, on, primary, paid }) {
  return (
    <div style={{
      padding: 12, borderRadius: 10,
      background: on ? (primary ? `${Q.accent}12` : Q.panel2) : Q.bg,
      border: primary ? `1.5px solid ${Q.accent}` : on ? `1px solid ${Q.line}` : `1px dashed ${Q.line}`,
      cursor: 'pointer', position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{
          marginLeft: 'auto', width: 14, height: 14, borderRadius: 3,
          background: on ? Q.accent : 'transparent',
          border: on ? 'none' : `1px solid ${Q.line}`,
          display: 'grid', placeItems: 'center', color: '#000',
          fontSize: 9, fontWeight: 900,
        }}>{on && '✓'}</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, color: Q.text, marginTop: 6 }}>{name}</div>
      <div style={{ fontSize: 9, color: Q.sub, fontFamily: mono,
        letterSpacing: '0.04em', marginTop: 2 }}>{meta}</div>
      {paid && <span style={{
        position: 'absolute', top: 10, right: 32,
        fontSize: 7, fontWeight: 900, color: Q.gold,
        letterSpacing: '0.18em', fontFamily: mono,
      }}>PAID</span>}
    </div>
  );
}

/* ═══════════════ 2. 오늘의 모험 (타임라인 맵) ═══════════════ */
function QuestTodayMap() {
  return (
    <div style={{ width: '100%', height: '100%', background: Q.bg, color: Q.text,
      display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 상단 바 */}
      <QTopBar/>
      <TodayMapInner/>
    </div>
  );
}

function QTopBar({ live, block }) {
  return (
    <div style={{
      height: 56, padding: '0 24px', background: Q.panel,
      borderBottom: `1px solid ${Q.line}`,
      display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 28, height: 28, background: Q.accent,
          display: 'grid', placeItems: 'center', borderRadius: 6,
          fontSize: 14, fontWeight: 900, color: '#000' }}>풀</span>
        <span style={{ fontSize: 10, fontWeight: 900, color: Q.sub,
          letterSpacing: '0.14em', fontFamily: mono }}>QUEST MODE</span>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Stat v="LV 12" sub="HERO"/>
        <Stat v="1,842" sub="XP" tone={Q.accent}/>
        <Stat v="8" sub="STREAK 🔥" tone={Q.pink}/>
        <Stat v="124" sub="💎 GEM" tone="#60A5FA"/>
        <div style={{ width: 1, height: 24, background: Q.line }}/>
        <Avatar name="민서" size={32} color={Q.purple}/>
      </div>
    </div>
  );
}
function Stat({ v, sub, tone }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 13, fontWeight: 900, fontFamily: mono,
        color: tone || Q.text, letterSpacing: '-0.02em', lineHeight: 1 }}>{v}</div>
      <div style={{ fontSize: 8, fontWeight: 800, color: Q.sub,
        letterSpacing: '0.14em', fontFamily: mono, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function TodayMapInner({ blurred }) {
  const nodes = [
    { t: '08:30', n: 'Q01 영단어 스프린트', s: 'done', lv: 1, xp: 12, icon: '📖', kind: 'mini' },
    { t: '09:00', n: 'Q02 삼각함수 튜토리얼', s: 'done', lv: 2, xp: 30, icon: '📐', kind: 'normal' },
    { t: '11:00', n: 'Q03 빈칸 추론', s: 'missed', lv: 3, xp: 0, icon: '💀', kind: 'skull' },
    { t: '14:00', n: 'Q04 사인법칙 응용', s: 'active', lv: 4, xp: 150, icon: '⚔️', kind: 'boss' },
    { t: '16:10', n: 'REST · 재충전', s: 'rest', lv: 0, xp: 0, icon: '🔋', kind: 'rest' },
    { t: '16:20', n: 'Q05 비문학 던전', s: 'locked', lv: 3, xp: 85, icon: '📘', kind: 'normal' },
    { t: '17:00', n: 'Q06 오답 정복전', s: 'locked', lv: 3, xp: 60, icon: '🗡️', kind: 'normal' },
    { t: '19:00', n: 'RAID · 라이브 클래스', s: 'locked', lv: 5, xp: 200, icon: '🏰', kind: 'raid' },
  ];

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: blurred ? 20 : '24px 32px' }}>
      {/* 상단 카운터 */}
      {!blurred && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 10, color: Q.sub, letterSpacing: '0.2em',
              fontWeight: 800, fontFamily: mono }}>ACT Ⅲ · TUE · APR 23</div>
            <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.04em',
              margin: '2px 0 0' }}>
              오늘의 원정
              <span style={{ marginLeft: 12, fontSize: 18, color: Q.accent, fontFamily: mono }}>
                3 / 7 CLEARED
              </span>
            </h1>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20 }}>
            <RingStat v="3/7" sub="CLEARED" pct={43} c={Q.accent}/>
            <RingStat v="2h 5m" sub="PLAYED" pct={62} c={Q.purple}/>
            <RingStat v="82%" sub="ACCURACY" pct={82} c={Q.pink}/>
          </div>
        </div>
      )}

      {/* 타임라인 맵 */}
      <div style={{ position: 'relative', padding: '10px 0' }}>
        {/* 중앙 라인 */}
        <div style={{
          position: 'absolute', left: 100, top: 20, bottom: 20, width: 2,
          background: `repeating-linear-gradient(180deg, ${Q.line} 0, ${Q.line} 6px, transparent 6px, transparent 12px)`,
        }}/>
        {/* NOW */}
        <div style={{ position: 'absolute', left: 74, top: 432,
          display: 'flex', alignItems: 'center', gap: 6, zIndex: 2 }}>
          <span style={{
            fontSize: 8, fontWeight: 900, color: Q.accent, fontFamily: mono,
            background: Q.bg, padding: '2px 6px', border: `1px solid ${Q.accent}`,
            borderRadius: 3, letterSpacing: '0.2em',
          }}>▸ NOW · 15:42</span>
        </div>

        {nodes.map((node, i) => (
          <QuestNode key={i} {...node} last={i === nodes.length - 1}/>
        ))}
      </div>
    </div>
  );
}

function QuestNode({ t, n, s, lv, xp, icon, kind, last }) {
  const colors = {
    done:   { ring: Q.sub, fill: Q.panel2, text: Q.sub },
    missed: { ring: Q.danger, fill: `${Q.danger}15`, text: Q.danger },
    active: { ring: Q.accent, fill: Q.accent, text: '#000' },
    locked: { ring: Q.line, fill: Q.bg, text: Q.sub },
    rest:   { ring: '#60A5FA', fill: '#60A5FA15', text: '#60A5FA' },
  };
  const c = colors[s];

  return (
    <div style={{ display: 'flex', gap: 20, minHeight: 90, position: 'relative' }}>
      {/* 시간 */}
      <div style={{ width: 80, paddingTop: 24, textAlign: 'right' }}>
        <div style={{ fontSize: 13, fontWeight: 900, fontFamily: mono,
          color: s === 'active' ? Q.accent : s === 'locked' ? Q.sub : Q.text }}>{t}</div>
      </div>

      {/* 노드 (원) */}
      <div style={{ position: 'relative', width: 48, flexShrink: 0 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: c.fill, border: `2px solid ${c.ring}`,
          display: 'grid', placeItems: 'center',
          marginTop: 16, position: 'relative',
          boxShadow: s === 'active'
            ? `0 0 0 6px ${Q.accent}20, 0 0 24px ${Q.accent}60`
            : s === 'missed' ? `0 0 16px ${Q.danger}40` : 'none',
          color: c.text,
          filter: s === 'done' ? 'grayscale(0.5)' : 'none',
          opacity: s === 'done' ? 0.7 : s === 'locked' ? 0.5 : 1,
        }}>
          <span style={{ fontSize: 20 }}>{s === 'done' ? '✓' : s === 'locked' ? '🔒' : icon}</span>
          {kind === 'boss' && s === 'active' && (
            <span style={{ position: 'absolute', top: -10, right: -8,
              fontSize: 8, fontWeight: 900, color: '#000', background: Q.gold,
              padding: '2px 5px', borderRadius: 3, letterSpacing: '0.1em',
              fontFamily: mono,
            }}>BOSS</span>
          )}
        </div>
      </div>

      {/* 카드 */}
      <div style={{
        flex: 1, marginBottom: 18,
        padding: s === 'active' ? 20 : '12px 16px',
        background: s === 'active' ? Q.accent
                  : s === 'missed' ? `${Q.danger}10`
                  : s === 'rest' ? `#60A5FA10`
                  : Q.panel,
        borderRadius: 12,
        border: `1px solid ${
          s === 'active' ? Q.accent
          : s === 'missed' ? `${Q.danger}60`
          : s === 'rest' ? `#60A5FA40`
          : Q.line
        }`,
        color: s === 'active' ? '#000' : Q.text,
        opacity: s === 'done' ? 0.5 : s === 'locked' ? 0.5 : 1,
        position: 'relative', overflow: 'hidden',
      }}>
        {s === 'active' && (
          <div style={{ position: 'absolute', top: 0, right: 0, padding: '2px 8px',
            background: '#000', color: Q.accent, fontSize: 9, fontWeight: 900,
            letterSpacing: '0.14em', fontFamily: mono }}>NEXT ▸</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 900, fontFamily: mono,
            letterSpacing: '0.14em',
            color: s === 'active' ? 'rgba(0,0,0,0.5)' : Q.sub,
          }}>
            {s === 'missed' ? 'MISSED' : s === 'rest' ? 'REST' :
             s === 'done' ? 'CLEARED' : s === 'active' ? 'READY' : 'LOCKED'}
            {' · '}LV{lv}
          </span>
          {xp > 0 && (
            <span style={{ fontSize: 10, fontWeight: 900, fontFamily: mono,
              color: s === 'active' ? '#000' : Q.accent }}>+{xp} XP</span>
          )}
        </div>
        <div style={{
          fontSize: s === 'active' ? 22 : 15,
          fontWeight: 800, letterSpacing: '-0.02em',
          marginTop: s === 'active' ? 4 : 2,
          textDecoration: s === 'done' ? 'line-through' : 'none',
        }}>{n}</div>

        {s === 'active' && (
          <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
            <button style={{
              height: 40, padding: '0 20px', background: '#000', color: Q.accent,
              border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 900, letterSpacing: '0.1em', fontFamily: mono,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>▶ ENTER BATTLE</button>
            <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.6)', fontFamily: mono }}>
              20 rounds · 3 boss · ~24min
            </span>
          </div>
        )}
        {s === 'missed' && (
          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            <QMiniBtn label="재도전" primary/>
            <QMiniBtn label="다음 주로"/>
            <QMiniBtn label="포기"/>
          </div>
        )}
        {s === 'rest' && (
          <div style={{ fontSize: 11, color: '#60A5FA', marginTop: 4, fontFamily: mono }}>
            10분 · +5 HP · 체력 회복
          </div>
        )}
      </div>
    </div>
  );
}
function QMiniBtn({ label, primary }) {
  return (
    <button style={{
      padding: '4px 10px', fontSize: 10, fontWeight: 900, fontFamily: mono,
      letterSpacing: '0.08em',
      background: primary ? Q.danger : 'rgba(0,0,0,0.15)',
      color: primary ? '#fff' : Q.danger,
      border: `1px solid ${Q.danger}40`,
      borderRadius: 5, cursor: 'pointer',
    }}>{label}</button>
  );
}

function RingStat({ v, sub, pct, c }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="22" fill="none" stroke={Q.line} strokeWidth="4"/>
        <circle cx="26" cy="26" r="22" fill="none" stroke={c} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={`${pct/100 * 138} 138`}
          transform="rotate(-90 26 26)"/>
      </svg>
      <div>
        <div style={{ fontSize: 16, fontWeight: 900, fontFamily: mono,
          color: c, letterSpacing: '-0.02em', lineHeight: 1 }}>{v}</div>
        <div style={{ fontSize: 8, fontWeight: 800, color: Q.sub,
          letterSpacing: '0.14em', fontFamily: mono, marginTop: 3 }}>{sub}</div>
      </div>
    </div>
  );
}

/* ═══════════════ 3. 배틀 실행 화면 ═══════════════ */
function QuestBattle() {
  return (
    <div style={{ width: '100%', height: '100%', background: Q.bg, color: Q.text,
      display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* HUD */}
      <div style={{
        padding: '12px 24px', background: Q.panel,
        borderBottom: `1px solid ${Q.line}`,
        display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
      }}>
        <button style={{
          width: 34, height: 34, borderRadius: 6,
          background: 'transparent', border: `1px solid ${Q.line}`,
          color: Q.sub, cursor: 'pointer', fontSize: 16,
        }}>✕</button>

        <div>
          <div style={{ fontSize: 9, fontWeight: 900, color: Q.accent,
            letterSpacing: '0.14em', fontFamily: mono }}>QUEST 04 · ACT Ⅲ</div>
          <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>사인법칙 응용</div>
        </div>

        {/* 진행 HUD */}
        <div style={{ flex: 1, margin: '0 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* HP */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9,
              fontWeight: 900, letterSpacing: '0.12em', fontFamily: mono, marginBottom: 3 }}>
              <span style={{ color: Q.danger }}>❤️ HP</span>
              <span style={{ color: Q.danger }}>3 / 3</span>
            </div>
            <div style={{ height: 6, background: Q.line, borderRadius: 3, display: 'flex', gap: 3 }}>
              {[1,1,1].map((_, i) => <div key={i} style={{ flex: 1, background: Q.danger, borderRadius: 2 }}/>)}
            </div>
          </div>

          {/* ROUND */}
          <div style={{ flex: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9,
              fontWeight: 900, letterSpacing: '0.12em', fontFamily: mono, marginBottom: 3 }}>
              <span style={{ color: Q.accent }}>⚔ ROUND</span>
              <span style={{ color: Q.accent, fontFamily: mono }}>8 / 20</span>
            </div>
            <div style={{ height: 6, background: Q.line, borderRadius: 3, display: 'flex', gap: 2, padding: 1 }}>
              {Array.from({length: 20}).map((_, i) => {
                const state = i < 7 ? (i === 2 ? 'wrong' : 'right') : i === 7 ? 'cur' : 'pending';
                const isBoss = [4, 13, 19].includes(i);
                return <div key={i} style={{
                  flex: 1,
                  background: state === 'right' ? Q.accent
                            : state === 'wrong' ? Q.danger
                            : state === 'cur' ? '#fff'
                            : 'transparent',
                  borderRadius: 1,
                  borderTop: isBoss ? `2px solid ${Q.gold}` : 'none',
                  animation: state === 'cur' ? 'pulse 1s infinite' : 'none',
                }}/>;
              })}
            </div>
          </div>

          {/* TIMER */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 900, color: Q.sub,
              letterSpacing: '0.12em', fontFamily: mono, textAlign: 'right' }}>⏱ TIME</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: Q.text, fontFamily: mono,
              letterSpacing: '-0.02em', lineHeight: 1, marginTop: 3 }}>22:14</div>
          </div>
        </div>

        {/* COMBO */}
        <div style={{
          padding: '8px 14px', background: `linear-gradient(135deg, ${Q.pink}25, ${Q.gold}25)`,
          border: `1px solid ${Q.pink}50`, borderRadius: 8,
        }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: Q.pink,
            letterSpacing: '0.14em', fontFamily: mono }}>🔥 COMBO</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: Q.pink, fontFamily: mono,
            letterSpacing: '-0.04em', lineHeight: 1 }}>×5</div>
        </div>
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 문제 */}
        <div style={{ flex: 1, padding: '32px 48px', overflow: 'auto', position: 'relative' }}>
          {/* 배경 장식 */}
          <div style={{ position: 'absolute', top: 40, right: 40,
            fontSize: 180, fontFamily: mono, fontWeight: 900, color: Q.panel,
            letterSpacing: '-0.08em', lineHeight: 1, pointerEvents: 'none',
            userSelect: 'none' }}>09</div>

          <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <span style={{
                padding: '4px 10px', fontSize: 10, fontWeight: 900, fontFamily: mono,
                letterSpacing: '0.12em', color: '#000', background: Q.accent, borderRadius: 4,
              }}>NORMAL · ★★★☆☆</span>
              <span style={{ fontSize: 10, color: Q.sub, fontFamily: mono }}>ROUND 09 / 20</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: Q.sub, fontFamily: mono }}>
                WORLD AVG 64%
              </span>
            </div>

            <div style={{ fontSize: 12, fontWeight: 900, color: Q.accent, fontFamily: mono,
              letterSpacing: '0.1em', marginBottom: 10 }}>▸ ENEMY INTEL</div>
            <div style={{ fontSize: 18, lineHeight: 1.75, color: Q.text }}>
              삼각형 ABC에서 <span style={{ color: Q.accent, fontFamily: 'Times, serif',
                fontStyle: 'italic' }}>a = 6</span>,{' '}
              <span style={{ color: Q.accent, fontFamily: 'Times, serif',
                fontStyle: 'italic' }}>∠B = 45°</span>,{' '}
              <span style={{ color: Q.accent, fontFamily: 'Times, serif',
                fontStyle: 'italic' }}>∠C = 75°</span>일 때, 외접원의 반지름의 길이는?
            </div>

            {/* 보기 */}
            <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { k: 'A', v: '2√2' },
                { k: 'B', v: '3√2', sel: true },
                { k: 'C', v: '4√2' },
                { k: 'D', v: '3√3' },
                { k: 'E', v: '4√3' },
              ].map(c => (
                <label key={c.k} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 20px', borderRadius: 10, cursor: 'pointer',
                  background: c.sel ? `${Q.accent}15` : Q.panel,
                  border: `1.5px solid ${c.sel ? Q.accent : Q.line}`,
                  boxShadow: c.sel ? `0 0 0 3px ${Q.accent}25, 0 0 20px ${Q.accent}30` : 'none',
                }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: 6,
                    background: c.sel ? Q.accent : Q.panel2,
                    border: c.sel ? 'none' : `1px solid ${Q.line}`,
                    color: c.sel ? '#000' : Q.sub,
                    display: 'grid', placeItems: 'center',
                    fontSize: 13, fontWeight: 900, fontFamily: mono,
                  }}>{c.k}</span>
                  <span style={{ fontSize: 18, fontFamily: 'Times, serif',
                    fontWeight: 600, color: c.sel ? Q.accent : Q.text }}>{c.v}</span>
                </label>
              ))}
            </div>

            {/* 액션 바 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 32 }}>
              <ActionBtn icon="💡" label="HINT" sub="2/5"/>
              <ActionBtn icon="⏭" label="SKIP" sub="-1 HP" danger/>
              <ActionBtn icon="⏸" label="PAUSE"/>
              <div style={{ marginLeft: 'auto', fontSize: 10, color: Q.sub,
                fontFamily: mono, letterSpacing: '0.1em' }}>
                ⏱ 01:24 · SPEED BONUS +5 XP
              </div>
              <button style={{
                height: 52, padding: '0 32px',
                background: Q.accent, color: '#000',
                border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 900, fontFamily: mono,
                letterSpacing: '0.14em', cursor: 'pointer',
                boxShadow: `0 0 0 3px ${Q.accent}30, 0 8px 20px ${Q.accent}40`,
              }}>⚔ STRIKE</button>
            </div>
          </div>
        </div>

        {/* 우측 — 전투 로그 */}
        <div style={{
          width: 280, background: Q.panel, borderLeft: `1px solid ${Q.line}`,
          padding: 20, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 900, color: Q.sub,
              letterSpacing: '0.14em', fontFamily: mono, marginBottom: 8 }}>▸ BATTLE LOG</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontFamily: mono }}>
              <LogLine icon="✓" text="R08 HIT · +15 XP · COMBO ×5" color={Q.accent}/>
              <LogLine icon="✓" text="R07 HIT · +10 XP · ×4" color={Q.accent}/>
              <LogLine icon="✓" text="R06 HIT · +10 XP · ×3" color={Q.accent}/>
              <LogLine icon="👑" text="R05 BOSS DOWN · +50 XP" color={Q.gold}/>
              <LogLine icon="✗" text="R03 MISS · -1 HP" color={Q.danger}/>
              <LogLine icon="✓" text="R02 HIT · +10 XP" color={Q.accent}/>
              <LogLine icon="✓" text="R01 HIT · +10 XP" color={Q.accent}/>
              <LogLine icon="▸" text="QUEST STARTED · 14:00" color={Q.sub}/>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 9, fontWeight: 900, color: Q.sub,
              letterSpacing: '0.14em', fontFamily: mono, marginBottom: 8 }}>▸ ENEMIES LEFT</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
              {Array.from({length: 12}).map((_, i) => {
                const isBoss = [1, 5, 11].includes(i);
                return (
                  <div key={i} style={{
                    aspectRatio: '1', background: isBoss ? `${Q.gold}15` : Q.panel2,
                    border: `1px solid ${isBoss ? Q.gold : Q.line}`,
                    borderRadius: 5,
                    display: 'grid', placeItems: 'center',
                    fontSize: 13, opacity: 0.7,
                  }}>{isBoss ? '👑' : '⚔'}</div>
                );
              })}
            </div>
          </div>

          <div style={{
            padding: 12, background: `${Q.purple}15`, border: `1px solid ${Q.purple}40`,
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: Q.purple,
              letterSpacing: '0.14em', fontFamily: mono, marginBottom: 6 }}>🧙 SCOUT</div>
            <div style={{ fontSize: 11, color: Q.text, lineHeight: 1.5 }}>
              "삼각형 내각의 합부터 떠올려라. ∠A 값을 먼저 구하라."
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}

function ActionBtn({ icon, label, sub, danger }) {
  return (
    <button style={{
      height: 44, padding: '0 14px',
      background: Q.panel, border: `1px solid ${Q.line}`, borderRadius: 8,
      color: danger ? Q.danger : Q.text, cursor: 'pointer', fontFamily: mono,
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.08em' }}>{label}</div>
        <div style={{ fontSize: 8, color: Q.sub, letterSpacing: '0.08em' }}>{sub}</div>
      </div>
    </button>
  );
}
function LogLine({ icon, text, color }) {
  return (
    <div style={{ display: 'flex', gap: 6, color, opacity: 0.9 }}>
      <span style={{ width: 12 }}>{icon}</span>
      <span style={{ flex: 1, letterSpacing: '0.02em' }}>{text}</span>
    </div>
  );
}

/* ═══════════════ 4. 승리 화면 (VICTORY) ═══════════════ */
function QuestVictory() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(ellipse at top, ${Q.panel2}, ${Q.bg} 60%)`,
      color: Q.text, overflow: 'hidden', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32,
    }}>
      {/* Confetti rays */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({length: 40}).map((_, i) => {
          const a = (i / 40) * 360;
          const colors = [Q.accent, Q.gold, Q.pink, Q.purple, '#60A5FA'];
          return <div key={i} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 2, height: 160, transformOrigin: '50% 0',
            transform: `translate(-50%, 0) rotate(${a}deg)`,
            background: `linear-gradient(180deg, transparent, ${colors[i % 5]}60, transparent)`,
            opacity: 0.4,
          }}/>;
        })}
      </div>

      <div style={{
        width: 720, position: 'relative',
        background: Q.panel, border: `1px solid ${Q.accent}40`, borderRadius: 16,
        padding: '40px 40px 28px',
        boxShadow: `0 0 0 1px ${Q.accent}30, 0 30px 80px rgba(0,0,0,0.5), 0 0 120px ${Q.accent}20`,
      }}>
        {/* 트로피 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: `radial-gradient(circle, ${Q.gold}, #D97706)`,
            display: 'grid', placeItems: 'center', fontSize: 44,
            boxShadow: `0 0 40px ${Q.gold}70, inset 0 -8px 16px rgba(0,0,0,0.3)`,
          }}>👑</div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: Q.accent,
            letterSpacing: '0.4em', fontFamily: mono,
            textShadow: `0 0 20px ${Q.accent}70` }}>V I C T O R Y</div>
          <h1 style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-0.05em',
            margin: '8px 0 4px',
            background: `linear-gradient(180deg, #fff, ${Q.accent})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Q04 · CLEARED</h1>
          <p style={{ fontSize: 13, color: Q.sub, margin: 0, fontFamily: mono,
            letterSpacing: '0.06em' }}>
            사인법칙 응용 · 20 / 20 ROUNDS · 84% ACCURACY
          </p>
        </div>

        {/* Loot */}
        <div style={{
          padding: 16, background: Q.bg, border: `1px solid ${Q.line}`,
          borderRadius: 12, marginBottom: 16,
        }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: Q.accent,
            letterSpacing: '0.14em', fontFamily: mono, marginBottom: 10 }}>▸ LOOT DROPPED</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            <BigLoot icon="⚡" v="+168" l="XP" tone={Q.accent} earned/>
            <BigLoot icon="💥" v="+75" l="PERFECT" tone={Q.pink}/>
            <BigLoot icon="🔥" v="+30" l="COMBO×5" tone={Q.pink}/>
            <BigLoot icon="💎" v="+25" l="GEM" tone="#60A5FA"/>
            <BigLoot icon="🏆" v="×2" l="TROPHY" tone={Q.gold}/>
          </div>
          <div style={{ marginTop: 10, padding: '8px 12px',
            background: `${Q.accent}08`, borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, fontFamily: mono,
          }}>
            <span style={{ color: Q.sub }}>LV 12</span>
            <div style={{ flex: 1, height: 5, background: Q.line, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: '68%', height: '100%',
                background: `linear-gradient(90deg, ${Q.accent}, ${Q.gold})` }}/>
            </div>
            <span style={{ color: Q.accent, fontWeight: 900 }}>68% → 32 XP TO LV 13</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16,
        }}>
          <VStat v="84%" l="ACCURACY" sub="↑ +6% vs last" tone={Q.accent}/>
          <VStat v="24:38" l="TIME" sub="BEAT ETA" tone={Q.text}/>
          <VStat v="×5" l="BEST COMBO" sub="NEW RECORD" tone={Q.pink}/>
          <VStat v="3/3" l="BOSS KILLS" sub="" tone={Q.gold}/>
        </div>

        {/* Insight */}
        <div style={{
          padding: 12, background: `${Q.purple}15`, border: `1px solid ${Q.purple}40`,
          borderRadius: 10, marginBottom: 20,
          display: 'flex', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>🧙</span>
          <div style={{ flex: 1, fontSize: 12, lineHeight: 1.6, color: Q.text }}>
            <b style={{ color: Q.purple }}>SCOUT:</b> 외접원 응용 3연속 적중. 상위 15% 속도.
            다만 <span style={{ color: Q.danger }}>각도 계산 실수 2회</span> — 복습 퀘스트 추천.
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{
            flex: 1, height: 52, background: Q.panel2,
            border: `1px solid ${Q.line}`, borderRadius: 10,
            color: Q.text, fontSize: 12, fontWeight: 900, fontFamily: mono,
            letterSpacing: '0.1em', cursor: 'pointer',
          }}>🔋 10m REST</button>
          <button style={{
            flex: 2, height: 52,
            background: Q.accent, color: '#000', border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 900, fontFamily: mono,
            letterSpacing: '0.14em', cursor: 'pointer',
            boxShadow: `0 0 0 3px ${Q.accent}30, 0 8px 20px ${Q.accent}50`,
          }}>▶ NEXT QUEST · Q05</button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <QChip label="+10 BONUS ROUND"/>
          <QChip label="REPLAY WRONG ONLY"/>
          <QChip label="END EXPEDITION"/>
        </div>
      </div>
    </div>
  );
}
function BigLoot({ icon, v, l, tone, earned }) {
  return (
    <div style={{
      padding: 10, background: Q.panel, border: `1px solid ${Q.line}`,
      borderRadius: 8, textAlign: 'center', position: 'relative',
    }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 900, color: tone, fontFamily: mono,
        marginTop: 2, letterSpacing: '-0.02em' }}>{v}</div>
      <div style={{ fontSize: 8, fontWeight: 800, color: Q.sub,
        letterSpacing: '0.1em', fontFamily: mono, marginTop: 1 }}>{l}</div>
    </div>
  );
}
function VStat({ v, l, sub, tone }) {
  return (
    <div style={{
      padding: 12, background: Q.bg, border: `1px solid ${Q.line}`,
      borderRadius: 8, textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, fontWeight: 900, color: tone, fontFamily: mono,
        letterSpacing: '-0.03em' }}>{v}</div>
      <div style={{ fontSize: 9, fontWeight: 900, color: Q.sub,
        letterSpacing: '0.14em', fontFamily: mono, marginTop: 4 }}>{l}</div>
      {sub && <div style={{ fontSize: 8, color: tone, opacity: 0.8, fontFamily: mono,
        marginTop: 2, letterSpacing: '0.06em' }}>{sub}</div>}
    </div>
  );
}
function QChip({ label }) {
  return (
    <span style={{
      padding: '5px 10px', background: Q.panel, border: `1px solid ${Q.line}`,
      borderRadius: 99, fontSize: 10, fontWeight: 800, color: Q.sub,
      letterSpacing: '0.08em', fontFamily: mono, cursor: 'pointer',
    }}>{label}</span>
  );
}

/* ═══════════════ 5. 휴식 보상 화면 (REST) ═══════════════ */
function QuestRest() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(ellipse at center, #1B2849, ${Q.bg} 70%)`,
      color: Q.text, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* 별빛 */}
      <div style={{ position: 'absolute', inset: 0,
        backgroundImage: `
          radial-gradient(1px 1px at 10% 20%, #fff8, transparent),
          radial-gradient(1px 1px at 80% 30%, #fff6, transparent),
          radial-gradient(2px 2px at 50% 60%, #A5B4FC6, transparent),
          radial-gradient(1px 1px at 25% 75%, #fff4, transparent),
          radial-gradient(1px 1px at 90% 85%, #fff4, transparent)
        `,
        backgroundSize: '180px 180px, 250px 250px, 320px 320px, 200px 200px, 280px 280px',
      }}/>

      {/* 상단 */}
      <div style={{ position: 'absolute', top: 24, left: 32, right: 32,
        display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 28, height: 28, background: Q.accent,
          display: 'grid', placeItems: 'center', borderRadius: 6,
          fontSize: 14, fontWeight: 900, color: '#000' }}>풀</span>
        <span style={{ fontSize: 10, fontFamily: mono, color: Q.sub,
          letterSpacing: '0.14em' }}>▸ RESTING · HP REGEN</span>
        <button style={{
          marginLeft: 'auto',
          padding: '6px 12px', background: 'transparent',
          border: `1px solid ${Q.line}`, borderRadius: 6,
          color: Q.sub, fontSize: 10, fontWeight: 900, fontFamily: mono,
          letterSpacing: '0.1em', cursor: 'pointer',
        }}>SKIP ▸</button>
      </div>

      {/* 타이머 */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: '#60A5FA',
          letterSpacing: '0.3em', fontFamily: mono, marginBottom: 14 }}>CAMPFIRE · 재충전</div>

        {/* 큰 원 */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 28 }}>
          <svg width="320" height="320" viewBox="0 0 320 320">
            <defs>
              <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#60A5FA"/>
                <stop offset="1" stopColor="#A78BFA"/>
              </linearGradient>
            </defs>
            <circle cx="160" cy="160" r="140" fill="none"
              stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
            <circle cx="160" cy="160" r="140" fill="none"
              stroke="url(#rg)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${0.64 * 880} 880`}
              transform="rotate(-90 160 160)"/>
            {/* Tick marks */}
            {Array.from({length: 12}).map((_, i) => {
              const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
              return <line key={i}
                x1={160 + Math.cos(a) * 126} y1={160 + Math.sin(a) * 126}
                x2={160 + Math.cos(a) * 134} y2={160 + Math.sin(a) * 134}
                stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>;
            })}
          </svg>
          <div style={{ position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 76, fontWeight: 300, fontFamily: mono,
              letterSpacing: '-0.05em', lineHeight: 1,
              background: `linear-gradient(180deg, #fff, #A5B4FC)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>06:24</div>
            <div style={{ fontSize: 10, color: '#A5B4FC', fontFamily: mono,
              letterSpacing: '0.2em', fontWeight: 800, marginTop: 6 }}>
              ❤️ HP 2 → 3 · +5 MP
            </div>
          </div>
        </div>

        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
          marginBottom: 6 }}>수고했다, Hero.</div>
        <p style={{ fontSize: 13, color: Q.sub, fontFamily: mono,
          letterSpacing: '0.04em', maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.7 }}>
          NEXT: <span style={{ color: Q.text }}>Q05 · 비문학 던전</span> · 40min · LV3
        </p>

        {/* 회복 행동 */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 26 }}>
          {[
            { i: '💧', l: 'HYDRATE', bonus: '+1 MP' },
            { i: '🪟', l: 'LOOK AWAY', bonus: '+2 MP' },
            { i: '🚶', l: 'WALK', bonus: '+3 MP' },
            { i: '🧘', l: 'BREATHE', bonus: '+5 MP' },
          ].map(a => (
            <div key={a.l} style={{
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, textAlign: 'center', cursor: 'pointer',
            }}>
              <div style={{ fontSize: 20 }}>{a.i}</div>
              <div style={{ fontSize: 10, fontWeight: 900, fontFamily: mono,
                letterSpacing: '0.1em', marginTop: 4, color: '#A5B4FC' }}>{a.l}</div>
              <div style={{ fontSize: 8, fontFamily: mono, color: '#60A5FA',
                marginTop: 2, letterSpacing: '0.08em' }}>{a.bonus}</div>
            </div>
          ))}
        </div>

        {/* 액션 */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button style={{
            height: 44, padding: '0 22px',
            background: 'rgba(255,255,255,0.06)', color: Q.text,
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
            fontSize: 12, fontWeight: 900, fontFamily: mono,
            letterSpacing: '0.1em', cursor: 'pointer',
          }}>+5m EXTEND</button>
          <button style={{
            height: 44, padding: '0 28px',
            background: Q.accent, color: '#000', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 900, fontFamily: mono,
            letterSpacing: '0.14em', cursor: 'pointer',
            boxShadow: `0 0 0 3px ${Q.accent}30`,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>▶ START Q05</button>
        </div>
      </div>

      {/* 하단 다음 퀘스트 */}
      <div style={{
        position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        padding: '12px 18px', background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, fontFamily: mono,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 8,
          background: Q.pink, display: 'grid', placeItems: 'center', fontSize: 18 }}>📘</div>
        <div>
          <div style={{ fontSize: 9, color: Q.sub, letterSpacing: '0.14em', fontWeight: 900 }}>
            NEXT · 16:20
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: Q.text, fontFamily: 'inherit',
            letterSpacing: '-0.01em', marginTop: 2 }}>
            Q05 · 비문학 던전 · 40min · +85 XP
          </div>
        </div>
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }}/>
        <div style={{ color: Q.sub }}>
          THEN · Q06 · 17:00 · 오답 정복전
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ 6. 원정 결과 (DAY END / EXPEDITION REPORT) ═══════════════ */
function QuestExpeditionEnd() {
  return (
    <div style={{ width: '100%', height: '100%', background: Q.bg, color: Q.text,
      overflow: 'auto' }}>
      <QTopBar/>
      <div style={{ padding: '28px 40px', maxWidth: 1160, margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: 24, position: 'relative' }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: Q.accent,
            letterSpacing: '0.4em', fontFamily: mono }}>EXPEDITION COMPLETE · ACT Ⅲ</div>
          <h1 style={{ fontSize: 46, fontWeight: 900, letterSpacing: '-0.05em',
            margin: '6px 0 4px',
            background: `linear-gradient(180deg, ${Q.text}, ${Q.accent})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>APR 23 · TUE</h1>
          <p style={{ fontSize: 12, color: Q.sub, fontFamily: mono,
            letterSpacing: '0.14em', margin: 0 }}>
            6 / 7 CLEARED · 4h 12m PLAYED · STREAK 8 🔥
          </p>
        </div>

        {/* Big stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          <HexStat icon="⚔" v="94" l="ENEMIES FELLED" sub="↑ +12 vs yest" tone={Q.accent}/>
          <HexStat icon="🎯" v="83%" l="ACCURACY" sub="↑ +4%" tone={Q.accent}/>
          <HexStat icon="⚡" v="+612" l="XP EARNED" sub="LV 12 · 89%" tone={Q.gold}/>
          <HexStat icon="💎" v="+84" l="GEMS" sub="124 total" tone="#60A5FA"/>
        </div>

        {/* 좌: 궤적 · 우: Insights */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 18 }}>
          <div style={{ background: Q.panel, border: `1px solid ${Q.line}`, borderRadius: 12, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: Q.accent,
                letterSpacing: '0.14em', fontFamily: mono }}>▸ BATTLE TRACE</div>
              <span style={{ fontSize: 10, color: Q.sub, fontFamily: mono }}>
                ACCURACY · FOCUS · FATIGUE / HOUR
              </span>
            </div>
            <DayChartDark/>
            <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 9, fontFamily: mono,
              color: Q.sub, letterSpacing: '0.08em' }}>
              <span><span style={{ display: 'inline-block', width: 8, height: 8,
                background: Q.accent, marginRight: 4 }}/>ACCURACY</span>
              <span><span style={{ display: 'inline-block', width: 8, height: 8,
                background: Q.purple, marginRight: 4 }}/>FOCUS</span>
              <span><span style={{ display: 'inline-block', width: 8, height: 8,
                background: Q.pink, marginRight: 4 }}/>FATIGUE</span>
            </div>
          </div>

          <div style={{ background: `linear-gradient(135deg, ${Q.purple}15, ${Q.panel})`,
            border: `1px solid ${Q.purple}40`, borderRadius: 12, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>🧙</span>
              <div style={{ fontSize: 10, fontWeight: 900, color: Q.purple,
                letterSpacing: '0.14em', fontFamily: mono }}>SCOUT · REPORT</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: Q.text, lineHeight: 1.5,
              marginBottom: 14 }}>
              "오후 전투에서 정확도가 치솟았다. 내일은 <span style={{ color: Q.accent }}>보스를 오후로 재배치</span>하라."
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, fontFamily: mono }}>
              <InsightDark icon="✓" text="TRIG.UNDERSTANDING 72 → 78 (+6)" color={Q.accent}/>
              <InsightDark icon="✓" text="INSCRIBED CIRCLE · MASTERED" color={Q.accent}/>
              <InsightDark icon="△" text="ANGLE CALC · 6 MISSES" color={Q.gold}/>
              <InsightDark icon="✗" text="Q03 BLANK DUNGEON · SKIPPED" color={Q.danger}/>
            </div>
          </div>
        </div>

        {/* 퀘스트 리캡 */}
        <div style={{ background: Q.panel, border: `1px solid ${Q.line}`, borderRadius: 12,
          padding: 22, marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: Q.accent,
            letterSpacing: '0.14em', fontFamily: mono, marginBottom: 14 }}>▸ QUEST LOG</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {[
              { q: 'Q01', n: 'WORDS', s: 100, icon: '📖', r: 'clear' },
              { q: 'Q02', n: 'TRIG.TUT', s: 78, icon: '📐', r: 'clear' },
              { q: 'Q03', n: 'BLANK', s: 0, icon: '💀', r: 'miss' },
              { q: 'Q04', n: 'SINE LAW', s: 84, icon: '⚔️', r: 'clear' },
              { q: 'Q05', n: 'READING', s: 75, icon: '📘', r: 'clear' },
              { q: 'Q06', n: 'REDEMP', s: 92, icon: '🗡️', r: 'perfect' },
              { q: 'Q07', n: 'LIVE RAID', s: 88, icon: '🏰', r: 'clear' },
            ].map((b, i) => (
              <div key={i} style={{
                padding: 12, borderRadius: 8,
                background: b.r === 'miss' ? `${Q.danger}15`
                          : b.r === 'perfect' ? `${Q.gold}15`
                          : Q.bg,
                border: `1px solid ${
                  b.r === 'miss' ? `${Q.danger}50`
                  : b.r === 'perfect' ? `${Q.gold}50`
                  : Q.line
                }`,
                textAlign: 'center', opacity: b.r === 'miss' ? 0.7 : 1,
              }}>
                <div style={{ fontSize: 9, fontWeight: 900, fontFamily: mono,
                  color: Q.sub, letterSpacing: '0.1em' }}>{b.q}</div>
                <div style={{ fontSize: 18, marginTop: 4 }}>{b.r === 'miss' ? '💀' : b.icon}</div>
                <div style={{ fontSize: 9, fontWeight: 800, fontFamily: mono,
                  letterSpacing: '0.08em', marginTop: 4, color: Q.text }}>{b.n}</div>
                {b.r === 'miss' ? (
                  <div style={{ fontSize: 11, fontWeight: 900, color: Q.danger,
                    fontFamily: mono, marginTop: 6 }}>MISSED</div>
                ) : (
                  <>
                    <div style={{ fontSize: 16, fontWeight: 900,
                      color: b.r === 'perfect' ? Q.gold : Q.accent, fontFamily: mono,
                      letterSpacing: '-0.03em', marginTop: 4 }}>{b.s}%</div>
                    {b.r === 'perfect' && <div style={{ fontSize: 8, fontWeight: 900,
                      color: Q.gold, fontFamily: mono, letterSpacing: '0.12em' }}>★ PERFECT</div>}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 내일 원정 + 미결 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div style={{ background: Q.panel, border: `1px solid ${Q.line}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 15 }}>🗺</span>
              <div style={{ fontSize: 10, fontWeight: 900, color: Q.accent,
                letterSpacing: '0.14em', fontFamily: mono }}>▸ TOMORROW · ACT Ⅳ</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <TomRow q="Q01" t="09:00" n="코사인법칙 튜토" tag="LINKED"/>
              <TomRow q="Q02" t="11:00" n="빈칸 던전 (재도전)" tag="REPLAY" warn/>
              <TomRow q="Q03" t="14:00" n="사인+코사인 레이드" tag="BOSS" boss/>
              <TomRow q="Q04" t="16:30" n="영어 어법" tag="WEAKSPOT"/>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <QBtn label="EDIT" flex/>
              <QBtn label="ACCEPT MISSION" primary flex/>
            </div>
          </div>

          <div style={{ background: Q.panel, border: `1px solid ${Q.line}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: Q.accent,
              letterSpacing: '0.14em', fontFamily: mono, marginBottom: 12 }}>▸ UNFINISHED BUSINESS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <LeftQuestRow
                title="Q03 · BLANK DUNGEON"
                sub="9 ROUNDS ABANDONED"
                actions={['TOMORROW', 'RIGHT NOW', 'ABANDON']}
              />
              <LeftQuestRow
                title="LOOT · ANGLE CALC ×6"
                sub="DROPPED FROM Q04"
                actions={['TOMORROW 17:00', '5 MIN NOW']}
              />
            </div>

            <div style={{ marginTop: 16, padding: 14,
              background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)',
              borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: '#60A5FA',
                letterSpacing: '0.14em', fontFamily: mono }}>🌙 CAMP FOR THE NIGHT</div>
              <div style={{ fontSize: 12, color: Q.text, marginTop: 4, lineHeight: 1.5 }}>
                영웅에게는 휴식이 필요하다. 내일 08:30에 다시 만나자.
              </div>
              <button style={{
                width: '100%', marginTop: 10, height: 40,
                background: Q.accent, color: '#000', border: 'none', borderRadius: 8,
                fontSize: 12, fontWeight: 900, fontFamily: mono,
                letterSpacing: '0.14em', cursor: 'pointer',
              }}>💤 END EXPEDITION</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HexStat({ icon, v, l, sub, tone }) {
  return (
    <div style={{
      padding: 18, background: Q.panel, border: `1px solid ${Q.line}`,
      borderRadius: 12, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 90,
        opacity: 0.07, transform: 'rotate(-15deg)' }}>{icon}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 9, fontWeight: 900, color: Q.sub,
          letterSpacing: '0.14em', fontFamily: mono }}>{l}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 900, color: tone, fontFamily: mono,
        letterSpacing: '-0.04em', lineHeight: 1 }}>{v}</div>
      <div style={{ fontSize: 9, fontFamily: mono, color: Q.accent,
        letterSpacing: '0.08em', marginTop: 6 }}>{sub}</div>
    </div>
  );
}

function DayChartDark() {
  const hours = ['08', '10', '12', '14', '16', '18', '20'];
  const accuracy = [78, 72, 0, 84, 82, 92, 88];
  const focus = [82, 78, 20, 90, 85, 88, 75];
  const fatigue = [15, 25, 50, 30, 45, 55, 70];

  const W = 560, H = 180, pad = 28;
  const toPath = (arr) => arr.map((v, i) => {
    const x = pad + (i / (arr.length - 1)) * (W - pad * 2);
    const y = H - pad - (v / 100) * (H - pad * 2);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 200 }}>
      {[0, 25, 50, 75, 100].map(p => {
        const y = H - pad - (p / 100) * (H - pad * 2);
        return <line key={p} x1={pad} x2={W - pad} y1={y} y2={y}
          stroke={Q.line} strokeWidth="1"/>;
      })}
      <path d={`${toPath(fatigue)} L ${W - pad} ${H - pad} L ${pad} ${H - pad} Z`}
        fill={`${Q.pink}15`}/>
      <path d={toPath(fatigue)} stroke={Q.pink} strokeWidth="2" fill="none" strokeDasharray="3 3"/>
      <path d={toPath(focus)} stroke={Q.purple} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d={toPath(accuracy)} stroke={Q.accent} strokeWidth="3" fill="none" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${Q.accent})` }}/>
      {accuracy.map((v, i) => {
        if (v === 0) return null;
        const x = pad + (i / (accuracy.length - 1)) * (W - pad * 2);
        const y = H - pad - (v / 100) * (H - pad * 2);
        return <circle key={i} cx={x} cy={y} r="3.5" fill={Q.bg}
          stroke={Q.accent} strokeWidth="2"/>;
      })}
      <text x={pad + (2 / 6) * (W - pad * 2)} y="30" fontSize="10" fill={Q.danger}
        textAnchor="middle" fontWeight="900" fontFamily={mono} letterSpacing="0.14em">
        ☠ LUNCH GAP
      </text>
      {hours.map((h, i) => {
        const x = pad + (i / (hours.length - 1)) * (W - pad * 2);
        return <text key={h} x={x} y={H - 8} fontSize="10" fill={Q.sub}
          textAnchor="middle" fontFamily={mono} letterSpacing="0.1em">{h}</text>;
      })}
    </svg>
  );
}
function InsightDark({ icon, text, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 16, height: 16, borderRadius: 3,
        background: `${color}20`, color,
        display: 'grid', placeItems: 'center',
        fontSize: 10, fontWeight: 900,
      }}>{icon}</span>
      <span style={{ color: Q.text, letterSpacing: '0.04em' }}>{text}</span>
    </div>
  );
}
function TomRow({ q, t, n, tag, warn, boss }) {
  const tagC = boss ? Q.gold : warn ? Q.danger : Q.accent;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
      background: Q.bg, border: `1px solid ${warn ? `${Q.danger}40` : Q.line}`,
      borderRadius: 8,
    }}>
      <span style={{ fontSize: 10, fontWeight: 900, color: Q.accent,
        fontFamily: mono, letterSpacing: '0.1em', minWidth: 28 }}>{q}</span>
      <span style={{ fontSize: 11, color: Q.sub, fontFamily: mono, minWidth: 44 }}>{t}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: Q.text }}>{n}</div>
      </div>
      <span style={{
        padding: '2px 6px', fontSize: 8, fontWeight: 900,
        color: tagC, border: `1px solid ${tagC}60`,
        borderRadius: 3, letterSpacing: '0.14em', fontFamily: mono,
      }}>{tag}</span>
    </div>
  );
}
function LeftQuestRow({ title, sub, actions }) {
  return (
    <div style={{ padding: 12, background: Q.bg,
      border: `1px solid ${Q.line}`, borderRadius: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: Q.text, fontFamily: mono,
        letterSpacing: '0.04em' }}>{title}</div>
      <div style={{ fontSize: 10, color: Q.sub, fontFamily: mono, marginTop: 2,
        letterSpacing: '0.08em' }}>{sub}</div>
      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
        {actions.map((a, i) => (
          <button key={a} style={{
            padding: '3px 8px', fontSize: 9, fontWeight: 900, fontFamily: mono,
            letterSpacing: '0.1em',
            background: i === 0 ? Q.accent : 'transparent',
            color: i === 0 ? '#000' : Q.sub,
            border: `1px solid ${i === 0 ? Q.accent : Q.line}`,
            borderRadius: 4, cursor: 'pointer',
          }}>{a}</button>
        ))}
      </div>
    </div>
  );
}
function QBtn({ label, primary, flex }) {
  return (
    <button style={{
      flex: flex ? 1 : 'initial',
      height: 40, padding: '0 16px',
      background: primary ? Q.accent : 'transparent',
      color: primary ? '#000' : Q.text,
      border: primary ? 'none' : `1px solid ${Q.line}`,
      borderRadius: 8, cursor: 'pointer',
      fontSize: 11, fontWeight: 900, fontFamily: mono,
      letterSpacing: '0.14em',
      boxShadow: primary ? `0 0 0 2px ${Q.accent}25` : 'none',
    }}>{label}</button>
  );
}

Object.assign(window, {
  QuestBriefing, QuestTodayMap, QuestBattle,
  QuestVictory, QuestRest, QuestExpeditionEnd,
});
})();
