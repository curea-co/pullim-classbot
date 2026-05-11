// 기본 UI 프리미티브
const { pullimTokens: T } = window;

function Logo({ size = 24, mono = false, color }) {
  const c = color || (mono ? T.slate[900] : T.blue[500]);
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <path d="M6 6 L6 26 M6 6 Q16 6 20 10 Q24 14 20 18 Q16 22 6 16"
          stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <circle cx="25" cy="22" r="2.5" fill={c}/>
      </svg>
      <span style={{
        fontSize: size * 0.72, fontWeight: 700, color: c,
        letterSpacing: '-0.03em', fontFamily: 'Pretendard, -apple-system, sans-serif'
      }}>풀림</span>
    </div>
  );
}

function Btn({ children, variant = 'primary', size = 'md', icon, full, onClick }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, fontWeight: 600, borderRadius: 10, border: 'none',
    cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em',
    width: full ? '100%' : 'auto', transition: 'all 0.15s',
  };
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 13, height: 32 },
    md: { padding: '10px 16px', fontSize: 14, height: 40 },
    lg: { padding: '14px 22px', fontSize: 16, height: 52 },
  };
  const variants = {
    primary: { background: T.blue[500], color: '#fff' },
    secondary: { background: T.slate[100], color: T.slate[800] },
    ghost: { background: 'transparent', color: T.slate[700] },
    outline: { background: '#fff', color: T.slate[800], boxShadow: `inset 0 0 0 1px ${T.slate[200]}` },
    danger: { background: T.danger, color: '#fff' },
  };
  return (
    <button style={{ ...base, ...sizes[size], ...variants[variant] }} onClick={onClick}>
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

function Card({ children, pad = 20, style = {}, tone = 'default' }) {
  const tones = {
    default: { background: '#fff', border: `1px solid ${T.slate[200]}` },
    raised:  { background: '#fff', boxShadow: window.shadow.md, border: `1px solid ${T.slate[100]}` },
    tint:    { background: T.blue[50], border: `1px solid ${T.blue[100]}` },
    muted:   { background: T.slate[50], border: `1px solid ${T.slate[100]}` },
  };
  return (
    <div style={{ borderRadius: 14, padding: pad, ...tones[tone], ...style }}>{children}</div>
  );
}

function Chip({ children, tone = 'neutral', size = 'md' }) {
  const tones = {
    neutral: { bg: T.slate[100], fg: T.slate[700] },
    blue:    { bg: T.blue[50],  fg: T.blue[700] },
    success: { bg: T.successBg, fg: T.success },
    warn:    { bg: T.warnBg,    fg: T.warn },
    danger:  { bg: T.dangerBg,  fg: T.danger },
    solid:   { bg: T.slate[900], fg: '#fff' },
  };
  const t = tones[tone];
  const s = size === 'sm' ? { fontSize: 11, padding: '3px 8px' } : { fontSize: 12, padding: '4px 10px' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: t.bg, color: t.fg, borderRadius: 999,
      fontWeight: 600, letterSpacing: '-0.01em', ...s,
    }}>{children}</span>
  );
}

function Avatar({ name, size = 36, color }) {
  const bg = color || T.blue[500];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, letterSpacing: '-0.02em',
      flexShrink: 0,
    }}>{name?.[0] || '?'}</div>
  );
}

function Progress({ value, max = 100, tone = 'blue', height = 8, label }) {
  const colors = {
    blue: T.blue[500],
    success: T.success,
    warn: T.warn,
    danger: T.danger,
  };
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4,
          fontSize: 12, color: T.slate[600] }}>
          <span>{label}</span><span>{Math.round(pct)}%</span>
        </div>
      )}
      <div style={{ background: T.slate[100], height, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ background: colors[tone], width: `${pct}%`, height: '100%',
          borderRadius: 999, transition: 'width 0.3s' }}/>
      </div>
    </div>
  );
}

function Divider({ vertical, length }) {
  return vertical ? (
    <div style={{ width: 1, height: length || '100%', background: T.slate[200] }}/>
  ) : (
    <div style={{ height: 1, width: length || '100%', background: T.slate[200] }}/>
  );
}

// Icons — simple line icons
const Icon = {
  search: (s=16) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8"/><path d="m14 14 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  home: (s=18) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M3 9 10 3l7 6v8a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1V9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  brain: (s=18) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M7 3a3 3 0 0 0-3 3v1a3 3 0 0 0-1 5 3 3 0 0 0 2 5 3 3 0 0 0 5 1 3 3 0 0 0 5-1 3 3 0 0 0 2-5 3 3 0 0 0-1-5V6a3 3 0 0 0-3-3 3 3 0 0 0-3 1 3 3 0 0 0-3-1Z" stroke="currentColor" strokeWidth="1.5"/></svg>,
  book: (s=18) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M4 4h5a3 3 0 0 1 1 2 3 3 0 0 1 1-2h5v12h-5a3 3 0 0 0-1 2 3 3 0 0 0-1-2H4V4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  target: (s=18) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6"/><circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.6"/><circle cx="10" cy="10" r="1.2" fill="currentColor"/></svg>,
  chat: (s=18) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3v-3a2 2 0 0 1-2-2V5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  calendar: (s=18) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><rect x="3" y="5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  sparkle: (s=16) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M10 2 11.5 7 16 8.5 11.5 10 10 15 8.5 10 4 8.5 8.5 7 10 2Z" fill="currentColor"/><path d="M16 13 16.7 15 18.5 15.7 16.7 16.3 16 18 15.3 16.3 13.5 15.7 15.3 15 16 13Z" fill="currentColor" opacity="0.6"/></svg>,
  check: (s=14) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  arrowRight: (s=16) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M5 10h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  bell: (s=18) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M5 9a5 5 0 0 1 10 0c0 4 2 5 2 5H3s2-1 2-5Zm3 8a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  play: (s=14) => <svg width={s} height={s} viewBox="0 0 20 20" fill="currentColor"><path d="M6 4v12l10-6L6 4Z"/></svg>,
  pause: (s=14) => <svg width={s} height={s} viewBox="0 0 20 20" fill="currentColor"><rect x="5" y="4" width="3.5" height="12" rx="1"/><rect x="11.5" y="4" width="3.5" height="12" rx="1"/></svg>,
  close: (s=16) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  menu: (s=18) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  plus: (s=16) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  users: (s=18) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M2 17c0-3 2-5 5-5s5 2 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M13 4a3 3 0 0 1 0 6M14 12c2 0 4 2 4 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  flame: (s=16) => <svg width={s} height={s} viewBox="0 0 20 20" fill="currentColor"><path d="M10 2s4 4 4 8a4 4 0 0 1-8 0c0-1 0-2 1-3-1 3 1 4 2 4-1-3 1-5 1-9Z"/></svg>,
  trend: (s=16) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M3 13l4-4 3 3 6-7m0 0h-4m4 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  lock: (s=14) => <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><rect x="4" y="9" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><path d="M7 9V6a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.6"/></svg>,
  dot: (s=8, color) => <span style={{ width: s, height: s, borderRadius: '50%', background: color, display: 'inline-block' }}/>,
};

Object.assign(window, { Logo, Btn, Card, Chip, Avatar, Progress, Divider, Icon });
