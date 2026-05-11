// 플래너 실행 플로우 · 변형 C (Focus · 차분) — 실행/완료/쉬기/하루종료
(() => {
const { pullimTokens: T, Btn, Card, Chip, Avatar, Progress, Icon, AppShell } = window;

/* ═══════════════ 3. 무한풀기 실행 — 블록 HUD ═══════════════ */
function FocusRun() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: `linear-gradient(180deg, #FAFBFF 0%, #fff 100%)`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* HUD — 상단 */}
      <div style={{
        padding: '14px 32px',
        background: '#fff',
        borderBottom: `1px solid ${T.slate[100]}`,
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{
            width: 32, height: 32, borderRadius: 8,
            background: T.slate[100], border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.slate[600],
          }}>✕</button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Chip tone="blue" size="sm">집중 모드</Chip>
              <span style={{ fontSize: 11, color: T.slate[500] }}>14:00 블록 · 사인법칙 응용</span>
            </div>
          </div>
        </div>

        {/* 중앙 진행 */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, maxWidth: 640, margin: '0 auto' }}>
          <HUDStat icon="📝" label="문항" value="8" total="/ 20" tone={T.blue[500]}/>
          <HUDProgress current={8} total={20}/>
          <HUDStat icon="⏱" label="남은 시간" value="22:14" tone={T.slate[700]} mono/>
        </div>

        {/* 우측 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: T.slate[500], fontWeight: 600 }}>현재 정답률</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.success, fontFamily: 'ui-monospace, monospace' }}>87%</div>
          </div>
          <div style={{ width: 1, height: 28, background: T.slate[200] }}/>
          <button style={{
            width: 36, height: 36, borderRadius: 8,
            background: T.slate[50], border: `1px solid ${T.slate[200]}`,
            cursor: 'pointer', fontSize: 14,
          }} title="잠깐 쉬기 / 일시정지">⏸</button>
        </div>
      </div>

      {/* 문제 영역 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, padding: '32px 48px', overflow: 'auto' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Chip tone="neutral" size="sm">수학Ⅰ · 삼각함수</Chip>
              <Chip tone="warn" size="sm">난이도 ★★★☆☆</Chip>
              <span style={{ fontSize: 11, color: T.slate[500], marginLeft: 'auto' }}>
                기출 유형 · 전국 정답률 64%
              </span>
            </div>

            <div style={{ fontSize: 13, fontWeight: 800, color: T.blue[600], letterSpacing: '0.02em', marginBottom: 8 }}>
              문제 9
            </div>
            <div style={{ fontSize: 18, lineHeight: 1.75, color: T.slate[900] }}>
              삼각형 ABC에서 <span style={{ fontFamily: 'Times, serif', fontStyle: 'italic' }}>a = 6</span>,{' '}
              <span style={{ fontFamily: 'Times, serif', fontStyle: 'italic' }}>∠B = 45°</span>,{' '}
              <span style={{ fontFamily: 'Times, serif', fontStyle: 'italic' }}>∠C = 75°</span>일 때,
              이 삼각형의 외접원의 반지름의 길이는?
            </div>

            {/* 보기 */}
            <div style={{ marginTop: 32, display: 'grid', gap: 10 }}>
              {[
                { k: '①', v: '2√2', sel: false },
                { k: '②', v: '3√2', sel: true },
                { k: '③', v: '4√2', sel: false },
                { k: '④', v: '3√3', sel: false },
                { k: '⑤', v: '4√3', sel: false },
              ].map(c => (
                <label key={c.k} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px', borderRadius: 10, cursor: 'pointer',
                  background: c.sel ? T.blue[50] : '#fff',
                  border: `1.5px solid ${c.sel ? T.blue[400] : T.slate[200]}`,
                  boxShadow: c.sel ? `0 0 0 4px ${T.blue[100]}` : 'none',
                }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: c.sel ? T.blue[500] : '#fff',
                    border: c.sel ? 'none' : `1.5px solid ${T.slate[300]}`,
                    color: c.sel ? '#fff' : T.slate[600],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800,
                  }}>{c.k}</span>
                  <span style={{ fontSize: 16, fontFamily: 'Times, serif',
                    fontWeight: c.sel ? 700 : 500, color: T.slate[900] }}>{c.v}</span>
                </label>
              ))}
            </div>

            {/* 액션 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 28 }}>
              <Btn variant="ghost" size="md" icon="💡">힌트 (1/5)</Btn>
              <Btn variant="ghost" size="md" icon="⏭">모르겠어요</Btn>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: T.slate[500] }}>
                풀이 시간 <b style={{ color: T.slate[800], fontFamily: 'ui-monospace, monospace' }}>01:24</b>
              </span>
              <Btn size="lg">제출</Btn>
            </div>
          </div>
        </div>

        {/* 우측 — 블록 범위 사이드 */}
        <div style={{
          width: 260, borderLeft: `1px solid ${T.slate[100]}`,
          background: T.slate[25], padding: 20, overflow: 'auto',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.slate[500], letterSpacing: '0.06em', marginBottom: 10 }}>
            이 블록 범위
          </div>
          <RangeRow n="사인법칙 · 외접원" done={3} total={6} cur/>
          <RangeRow n="변의 길이" done={3} total={7}/>
          <RangeRow n="각도 구하기" done={2} total={5}/>
          <RangeRow n="혼합 응용" done={0} total={2}/>

          <div style={{ marginTop: 20, fontSize: 11, fontWeight: 800,
            color: T.slate[500], letterSpacing: '0.06em', marginBottom: 10 }}>
            푼 문항
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
            {Array.from({ length: 20 }).map((_, i) => {
              const state = i < 7 ? (i === 2 ? 'wrong' : 'right') : i === 7 ? 'cur' : 'pending';
              return <div key={i} style={{
                aspectRatio: '1', borderRadius: 5,
                background: state === 'right' ? T.success
                          : state === 'wrong' ? T.danger
                          : state === 'cur' ? T.blue[500]
                          : '#fff',
                border: state === 'pending' ? `1px solid ${T.slate[200]}` : 'none',
                color: state === 'pending' ? T.slate[400] : '#fff',
                fontSize: 9, fontWeight: 700, fontFamily: 'ui-monospace, monospace',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: state === 'cur' ? `0 0 0 2px ${T.blue[200]}` : 'none',
              }}>{i + 1}</div>;
            })}
          </div>

          <div style={{ marginTop: 20, padding: 12, background: '#fff',
            border: `1px solid ${T.slate[200]}`, borderRadius: 10 }}>
            <div style={{ fontSize: 10, color: T.slate[500], fontWeight: 600, marginBottom: 4 }}>완료 조건</div>
            <div style={{ fontSize: 11, lineHeight: 1.6, color: T.slate[700] }}>
              <div>📝 <b>문항 20개</b> (주)</div>
              <div>⏱ 30분 상한</div>
              <div>🎯 정답률 75%+</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HUDStat({ icon, label, value, total, tone, mono }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 9, color: T.slate[500], fontWeight: 700, letterSpacing: '0.04em' }}>
          {label.toUpperCase()}
        </div>
        <div style={{
          fontSize: 16, fontWeight: 800, color: tone, letterSpacing: '-0.02em',
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, monospace' : 'inherit',
        }}>
          {value}
          {total && <span style={{ fontSize: 11, color: T.slate[400], fontWeight: 600 }}> {total}</span>}
        </div>
      </div>
    </div>
  );
}

function HUDProgress({ current, total }) {
  const pct = (current / total) * 100;
  return (
    <div style={{ flex: 1, position: 'relative', height: 26, display: 'flex', alignItems: 'center' }}>
      <div style={{
        width: '100%', height: 6, background: T.slate[100], borderRadius: 3,
        position: 'relative', overflow: 'visible',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 3,
          background: `linear-gradient(90deg, ${T.blue[400]}, ${T.blue[500]})`,
        }}/>
        {/* Tick marks */}
        {Array.from({ length: total - 1 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute', left: `${((i + 1) / total) * 100}%`,
            top: -2, width: 1, height: 10, background: '#fff',
            transform: 'translateX(-50%)',
          }}/>
        ))}
        {/* Pointer */}
        <div style={{
          position: 'absolute', left: `${pct}%`, top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff', border: `3px solid ${T.blue[500]}`,
          boxShadow: `0 2px 6px rgba(0, 82, 204, 0.3)`,
        }}/>
      </div>
    </div>
  );
}

function RangeRow({ n, done, total, cur }) {
  const pct = (done / total) * 100;
  return (
    <div style={{ marginBottom: 10,
      padding: cur ? 10 : 8, borderRadius: 8,
      background: cur ? '#fff' : 'transparent',
      border: cur ? `1.5px solid ${T.blue[300]}` : '1px solid transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        {cur && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.blue[500] }}/>}
        <span style={{ fontSize: 11.5, fontWeight: 700, color: T.slate[800] }}>{n}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'ui-monospace, monospace',
          fontWeight: 700, color: T.slate[600] }}>{done}/{total}</span>
      </div>
      <div style={{ height: 3, background: T.slate[100], borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`,
          background: cur ? T.blue[500] : T.slate[400], borderRadius: 2 }}/>
      </div>
    </div>
  );
}

/* ═══════════════ 4. 블록 완료 축하 ═══════════════ */
function FocusBlockDone() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(ellipse at top, ${T.blue[50]}, #fff 60%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 40, position: 'relative', overflow: 'hidden',
    }}>
      {/* 은은한 배경 패턴 */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.25,
        backgroundImage: `radial-gradient(circle, ${T.blue[200]} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
      }}/>

      <div style={{
        width: 620, position: 'relative',
        background: '#fff', borderRadius: 24,
        padding: '40px 44px',
        boxShadow: '0 24px 60px rgba(0, 82, 204, 0.15)',
        border: `1px solid ${T.blue[100]}`,
      }}>
        {/* 체크 뱃지 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.success}, #10B981)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 12px 28px ${T.success}50`,
          }}>
            <span style={{ color: '#fff', fontSize: 34, fontWeight: 800 }}>✓</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.success, letterSpacing: '0.1em' }}>
            BLOCK COMPLETE
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', margin: '4px 0 6px' }}>
            블록 완료!
          </h1>
          <p style={{ fontSize: 14, color: T.slate[600], margin: 0 }}>
            사인법칙 응용 · 20문항 · <b style={{ color: T.success }}>84% 정답률</b>
          </p>
        </div>

        {/* 통계 */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16,
          padding: 16, background: T.slate[25], borderRadius: 14,
          border: `1px solid ${T.slate[100]}`,
        }}>
          <DoneStat v="20" l="문항" sub="/20"/>
          <DoneStat v="24:38" l="소요 시간" sub="30분 목표" mono/>
          <DoneStat v="84%" l="정답률" sub="목표 75% ✓" tone={T.success}/>
          <DoneStat v="+18" l="XP" sub="보너스 +3" tone={T.warn}/>
        </div>

        {/* 하이라이트 */}
        <div style={{
          padding: 14, background: T.blue[50], borderRadius: 12,
          display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 10,
            background: `linear-gradient(135deg, ${T.blue[400]}, ${T.blue[600]})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0 }}>
            {Icon.sparkle(16)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.blue[700], letterSpacing: '0.04em' }}>
              이번 블록 발견
            </div>
            <div style={{ fontSize: 13, color: T.slate[800], lineHeight: 1.6, marginTop: 3 }}>
              외접원 응용에서 <b>3문항 연속 정답</b>! 어제보다 확실히 좋아졌어요.
              다만 <b>각도 계산 실수</b>가 2번 나왔어요 — 쉬기 후 복습 추천해요.
            </div>
          </div>
        </div>

        {/* 다음 액션 */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.slate[500], letterSpacing: '0.04em',
            marginBottom: 10, textAlign: 'center' }}>
            다음 블록까지 · 10분 쉬기
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="outline" size="lg" style={{ flex: 1 }}>10분 쉬기</Btn>
            <Btn size="lg" style={{ flex: 2 }}>바로 다음 블록 시작</Btn>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <MiniAction label="10문항 더 풀기" hint="컨디션 좋아요?"/>
            <MiniAction label="오답만 복습"/>
            <MiniAction label="오늘은 여기까지"/>
          </div>
        </div>
      </div>
    </div>
  );
}

function DoneStat({ v, l, sub, tone, mono }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em',
        color: tone || T.slate[900],
        fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
      }}>{v}</div>
      <div style={{ fontSize: 10, color: T.slate[600], fontWeight: 700 }}>{l}</div>
      <div style={{ fontSize: 9, color: T.slate[400], marginTop: 1 }}>{sub}</div>
    </div>
  );
}
function MiniAction({ label, hint }) {
  return (
    <button style={{
      padding: '6px 12px', background: '#fff',
      border: `1px solid ${T.slate[200]}`, borderRadius: 99,
      fontSize: 11, fontWeight: 600, color: T.slate[600],
      cursor: 'pointer', fontFamily: 'inherit',
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {label}
      {hint && <span style={{ color: T.slate[400], fontSize: 9 }}>· {hint}</span>}
    </button>
  );
}

/* ═══════════════ 4b. 블록 미완료 (시간 초과 / 중단) — 참고용 변형 ═══════════════ */
function FocusBlockPaused() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: T.slate[50],
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
    }}>
      <div style={{
        width: 560, background: '#fff', borderRadius: 20,
        padding: '32px 36px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.08)',
        border: `1px solid ${T.slate[200]}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: T.warnBg, color: T.warn, fontSize: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>⏱</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.warn, letterSpacing: '0.06em' }}>BLOCK PAUSED</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '2px 0 0', letterSpacing: '-0.02em' }}>
              어떻게 할까요?
            </h2>
          </div>
        </div>

        <div style={{
          padding: 14, background: T.slate[25], borderRadius: 10,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 18, border: `1px solid ${T.slate[100]}`,
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>사인법칙 응용</div>
            <div style={{ fontSize: 10, color: T.slate[500], marginTop: 2 }}>
              14:00 시작 · 11/20 문항 · 75% 정답률
            </div>
          </div>
          <Progress value={11} max={20} tone="blue" height={5} style={{ width: 160 }}/>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ChoiceRow
            icon="▶"
            title="이어서 계속"
            desc="지금 흐름을 유지해요. +9문항 남음"
            primary
          />
          <ChoiceRow
            icon="📉"
            title="범위 축소 · 5문항만 더"
            desc="AI가 중요 5문항만 골라서 마무리"
          />
          <ChoiceRow
            icon="⏰"
            title="나중으로 미루기"
            desc="오늘 17:30 블록으로 이동"
          />
          <ChoiceRow
            icon="🏳"
            title="이번 블록 포기"
            desc="진행 내용은 저장돼요"
            danger
          />
        </div>
      </div>
    </div>
  );
}
function ChoiceRow({ icon, title, desc, primary, danger }) {
  return (
    <button style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
      background: primary ? T.blue[50] : '#fff',
      border: `1.5px solid ${primary ? T.blue[300] : danger ? `${T.danger}30` : T.slate[200]}`,
      borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
      textAlign: 'left', width: '100%',
    }}>
      <span style={{
        width: 36, height: 36, borderRadius: 10,
        background: primary ? T.blue[500] : danger ? `${T.danger}15` : T.slate[100],
        color: primary ? '#fff' : danger ? T.danger : T.slate[600],
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700,
      }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700,
          color: primary ? T.blue[800] : danger ? T.danger : T.slate[800] }}>{title}</div>
        <div style={{ fontSize: 11, color: T.slate[500], marginTop: 2 }}>{desc}</div>
      </div>
      <span style={{ color: T.slate[400] }}>→</span>
    </button>
  );
}

/* ═══════════════ 5. 쉬기 전환 화면 ═══════════════ */
function FocusBreak() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: `linear-gradient(180deg, #0C1838 0%, #1A2555 60%, #243472 100%)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 40, position: 'relative', overflow: 'hidden',
      color: '#fff',
    }}>
      {/* 배경 — 은은한 별빛 */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.6), transparent),
          radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,0.4), transparent),
          radial-gradient(1px 1px at 80% 20%, rgba(255,255,255,0.5), transparent),
          radial-gradient(2px 2px at 40% 80%, rgba(255,255,255,0.4), transparent),
          radial-gradient(1px 1px at 90% 50%, rgba(255,255,255,0.3), transparent)
        `,
        backgroundSize: '200px 200px, 300px 300px, 250px 250px, 400px 400px, 180px 180px',
      }}/>

      {/* 상단 */}
      <div style={{ position: 'absolute', top: 24, left: 32, right: 32,
        display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800,
        }}>풀</div>
        <span style={{ fontSize: 12, opacity: 0.7 }}>쉬기 중 · 화면을 잠깐 꺼도 좋아요</span>
        <button style={{
          marginLeft: 'auto',
          padding: '6px 12px', background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6,
          color: '#fff', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
        }}>건너뛰기 →</button>
      </div>

      {/* 중앙 타이머 */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em',
          color: '#A5B4FC', marginBottom: 12 }}>BREAK · 쉬기</div>

        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
          <svg width="280" height="280" viewBox="0 0 280 280">
            <circle cx="140" cy="140" r="120" fill="none"
              stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
            <circle cx="140" cy="140" r="120" fill="none"
              stroke="#A5B4FC" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${0.6 * 754} 754`}
              transform="rotate(-90 140 140)"/>
          </svg>
          <div style={{ position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              fontSize: 72, fontWeight: 300, letterSpacing: '-0.04em',
              fontFamily: 'ui-monospace, monospace',
            }}>06:24</div>
            <div style={{ fontSize: 11, color: '#A5B4FC', fontWeight: 700, letterSpacing: '0.1em' }}>
              10분 중 6분 24초 남음
            </div>
          </div>
        </div>

        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
          수고했어요 🌙
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.7, maxWidth: 420, margin: '0 auto 28px' }}>
          다음 블록은 <b style={{ color: '#fff', opacity: 1 }}>비문학 독해</b>예요.
          물 한 잔 마시고, 눈 감고 깊게 숨 쉬어 보세요.
        </p>

        {/* 쉬기 제안 */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
          {['💧 물 마시기', '🪟 먼 곳 보기', '🚶 잠깐 걷기', '🧘 깊은 숨'].map(s => (
            <span key={s} style={{
              padding: '8px 14px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 99, fontSize: 12, fontWeight: 600,
            }}>{s}</span>
          ))}
        </div>

        {/* 액션 */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button style={{
            height: 44, padding: '0 22px',
            background: 'rgba(255,255,255,0.1)', color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10,
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
          }}>+5분 더</button>
          <button style={{
            height: 44, padding: '0 22px',
            background: '#fff', color: T.blue[700],
            border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>{Icon.play(12)} 다음 블록 시작</button>
        </div>
      </div>

      {/* 다음 블록 프리뷰 */}
      <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px', background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 8,
          background: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18 }}>📖</div>
        <div>
          <div style={{ fontSize: 10, opacity: 0.6, fontWeight: 700, letterSpacing: '0.06em' }}>NEXT · 16:20</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>비문학 독해 세트 · 40분</div>
        </div>
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }}/>
        <div style={{ fontSize: 11, opacity: 0.7 }}>
          그 다음 · 17:00 · 오답 정복
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ 6. 하루 종료 요약 ═══════════════ */
function FocusDayEnd() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: `linear-gradient(180deg, #FAFBFF 0%, #fff 40%, #FAFBFF 100%)`,
      overflow: 'auto', padding: '36px 48px',
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.blue[600],
            letterSpacing: '0.16em', marginBottom: 8 }}>DAY COMPLETE · 4월 23일 화요일</div>
          <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', margin: '0 0 8px' }}>
            오늘 고생했어요 💪
          </h1>
          <p style={{ fontSize: 15, color: T.slate[600], margin: 0 }}>
            <b style={{ color: T.slate[900] }}>6 / 7 블록</b> 완료 · 총 <b style={{ color: T.slate[900] }}>4시간 12분</b> 집중 ·
            <b style={{ color: T.success }}> 연속 8일째 🔥</b>
          </p>
        </div>

        {/* Big Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20,
        }}>
          <BigStat icon="📝" v="94" l="푼 문항" d="+12 vs 어제" up/>
          <BigStat icon="🎯" v="83%" l="평균 정답률" d="+4% vs 어제" up/>
          <BigStat icon="⏱" v="4h 12m" l="집중 시간" d="-18m" down/>
          <BigStat icon="⚡" v="+62" l="획득 XP" d="Lv 12 · 38까지" />
        </div>

        {/* Timeline + Insights */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 20 }}>
          <Card pad={24}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>오늘의 궤적</div>
              <span style={{ fontSize: 11, color: T.slate[500] }}>시간대별 집중·정답률</span>
            </div>
            <DayChart/>
            <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 10, color: T.slate[500] }}>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2,
                background: T.blue[500], marginRight: 4 }}/>정답률</span>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2,
                background: T.success, marginRight: 4 }}/>집중도</span>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2,
                background: T.warn, marginRight: 4 }}/>피로도</span>
            </div>
          </Card>

          <Card pad={24} tone="tint">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ color: T.blue[500] }}>{Icon.sparkle(14)}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: T.blue[700], letterSpacing: '0.04em' }}>
                오늘의 인사이트
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.blue[900], lineHeight: 1.5,
              marginBottom: 14 }}>
              "오후 블록에서 정답률이 급상승했어요. 내일은 중요한 블록을 <u>오후로 배치</u>해볼까요?"
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: T.slate[700] }}>
              <InsightLine icon="✓" text="삼각함수 이해도 72% → 78% (+6%)"/>
              <InsightLine icon="✓" text="외접원 응용 약점 해결됨"/>
              <InsightLine icon="△" text="각도 계산 실수 6회 — 복습 추천"/>
              <InsightLine icon="×" text="빈칸 추론 블록 미수행 (45분)"/>
            </div>
          </Card>
        </div>

        {/* Blocks recap */}
        <Card pad={24} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>블록별 결과</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {[
              { t: '08:30', n: '영단어', s: 100, c: T.warn, d: 'done' },
              { t: '09:00', n: '삼각 개념', s: 78, c: T.blue[500], d: 'done' },
              { t: '11:00', n: '빈칸 추론', s: 55, c: '#8B5CF6', d: 'miss' },
              { t: '14:00', n: '사인 응용', s: 84, c: T.blue[500], d: 'done' },
              { t: '16:20', n: '비문학', s: 75, c: '#EC4899', d: 'done' },
              { t: '17:00', n: '오답 정복', s: 92, c: T.warn, d: 'done' },
              { t: '19:00', n: '라이브', s: 88, c: T.blue[500], d: 'done' },
            ].map((b, i) => (
              <div key={i} style={{
                padding: 12, borderRadius: 10,
                background: b.d === 'miss' ? `${T.warn}10` : T.slate[25],
                border: `1px solid ${b.d === 'miss' ? `${T.warn}40` : T.slate[100]}`,
                textAlign: 'center', position: 'relative',
                opacity: b.d === 'miss' ? 0.75 : 1,
              }}>
                <div style={{ fontSize: 9, color: T.slate[500], fontFamily: 'ui-monospace, monospace' }}>
                  {b.t}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: T.slate[800] }}>{b.n}</div>
                {b.d === 'done' ? (
                  <>
                    <div style={{ fontSize: 18, fontWeight: 800, color: b.c, marginTop: 6,
                      fontFamily: 'ui-monospace, monospace', letterSpacing: '-0.02em' }}>
                      {b.s}%
                    </div>
                    <div style={{ height: 4, background: T.slate[100], borderRadius: 2, marginTop: 6 }}>
                      <div style={{ width: `${b.s}%`, height: '100%', background: b.c, borderRadius: 2 }}/>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 800, color: T.warn, marginTop: 8 }}>미수행</div>
                    <div style={{ fontSize: 9, color: T.slate[500], marginTop: 2 }}>11/20 중단</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* 내일 제안 + 액션 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card pad={24}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 14 }}>🌤</span>
              <div style={{ fontSize: 14, fontWeight: 800 }}>내일 (4월 24일) AI 제안</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <TomorrowBlock t="09:00" d="수학 · 코사인법칙 개념" meta="연결 학습"/>
              <TomorrowBlock t="11:00" d="빈칸 추론 (재시도)" meta="오늘 밀린 블록 재배치" warn/>
              <TomorrowBlock t="14:00" d="사인+코사인 혼합 실전" meta="어제 실수 보강"/>
              <TomorrowBlock t="16:30" d="영어 어법" meta="약점 정복"/>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Btn variant="outline" size="md" style={{ flex: 1 }}>편집하기</Btn>
              <Btn size="md" style={{ flex: 1 }}>이대로 저장</Btn>
            </div>
          </Card>

          <Card pad={24}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>남은 할 일</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <LeftoverItem
                title="빈칸 추론 9문항"
                sub="오늘 중단됐어요"
                actions={['내일로', '지금 마저', '버리기']}
              />
              <LeftoverItem
                title="오답 노트 · 각도 계산 6문항"
                sub="AI가 모아둔 오답"
                actions={['내일 17:00로', '지금 5분']}
              />
            </div>

            <div style={{ marginTop: 20, padding: 14, background: T.blue[50],
              borderRadius: 10, border: `1px solid ${T.blue[100]}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.blue[700], marginBottom: 4 }}>
                🌙 오늘은 여기까지
              </div>
              <div style={{ fontSize: 12, color: T.slate[700], lineHeight: 1.5 }}>
                수면이 중요해요. 내일 아침 08:30 첫 블록에서 다시 만나요.
              </div>
              <Btn size="md" style={{ marginTop: 10, width: '100%' }}>하루 마무리</Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BigStat({ icon, v, l, d, up, down }) {
  return (
    <Card pad={18}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 10, color: T.slate[500], fontWeight: 700, letterSpacing: '0.06em' }}>
          {l.toUpperCase()}
        </span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em',
        fontFamily: 'ui-monospace, monospace', color: T.slate[900] }}>{v}</div>
      <div style={{ fontSize: 10, marginTop: 4,
        color: up ? T.success : down ? T.warn : T.slate[500], fontWeight: 600 }}>
        {up && '↑ '}{down && '↓ '}{d}
      </div>
    </Card>
  );
}

function DayChart() {
  const hours = ['08', '10', '12', '14', '16', '18', '20'];
  // 3 lines
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
      {/* grid */}
      {[0, 25, 50, 75, 100].map(p => {
        const y = H - pad - (p / 100) * (H - pad * 2);
        return <line key={p} x1={pad} x2={W - pad} y1={y} y2={y}
          stroke={T.slate[100]} strokeWidth="1"/>;
      })}
      {/* fatigue area */}
      <path d={`${toPath(fatigue)} L ${W - pad} ${H - pad} L ${pad} ${H - pad} Z`}
        fill={`${T.warn}15`}/>
      <path d={toPath(fatigue)} stroke={T.warn} strokeWidth="2" fill="none" strokeDasharray="3 3"/>
      {/* focus */}
      <path d={toPath(focus)} stroke={T.success} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* accuracy */}
      <path d={toPath(accuracy)} stroke={T.blue[500]} strokeWidth="3" fill="none" strokeLinecap="round"/>
      {/* dots on accuracy */}
      {accuracy.map((v, i) => {
        if (v === 0) return null;
        const x = pad + (i / (accuracy.length - 1)) * (W - pad * 2);
        const y = H - pad - (v / 100) * (H - pad * 2);
        return <circle key={i} cx={x} cy={y} r="3.5" fill="#fff"
          stroke={T.blue[500]} strokeWidth="2"/>;
      })}
      {/* gap marker at 12 */}
      <text x={pad + (2 / 6) * (W - pad * 2)} y="30" fontSize="10" fill={T.warn}
        textAnchor="middle" fontWeight="700">공강 · 점심</text>

      {/* hour labels */}
      {hours.map((h, i) => {
        const x = pad + (i / (hours.length - 1)) * (W - pad * 2);
        return <text key={h} x={x} y={H - 8} fontSize="10" fill={T.slate[500]}
          textAnchor="middle" fontFamily="ui-monospace, monospace">{h}</text>;
      })}
    </svg>
  );
}

function InsightLine({ icon, text }) {
  const tone = icon === '✓' ? T.success : icon === '△' ? T.warn : icon === '×' ? T.danger : T.slate[500];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        width: 16, height: 16, borderRadius: 4,
        background: `${tone}15`, color: tone,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 800,
      }}>{icon}</span>
      <span style={{ fontSize: 12 }}>{text}</span>
    </div>
  );
}

function TomorrowBlock({ t, d, meta, warn }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', background: warn ? `${T.warn}10` : T.slate[25],
      borderRadius: 8, border: `1px solid ${warn ? `${T.warn}30` : T.slate[100]}`,
    }}>
      <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace',
        fontWeight: 700, color: T.slate[700], minWidth: 44 }}>{t}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.slate[800] }}>{d}</div>
        <div style={{ fontSize: 10, color: warn ? T.warn : T.slate[500], marginTop: 1 }}>
          {warn && '⚠ '}{meta}
        </div>
      </div>
      <span style={{ color: T.slate[400], fontSize: 11, cursor: 'pointer' }}>✎</span>
    </div>
  );
}

function LeftoverItem({ title, sub, actions }) {
  return (
    <div style={{
      padding: 12, background: T.slate[25], borderRadius: 10,
      border: `1px solid ${T.slate[100]}`,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.slate[800] }}>{title}</div>
      <div style={{ fontSize: 10, color: T.slate[500], marginTop: 2 }}>{sub}</div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        {actions.map((a, i) => (
          <button key={a} style={{
            padding: '4px 10px', background: i === 0 ? T.blue[500] : '#fff',
            border: i === 0 ? 'none' : `1px solid ${T.slate[200]}`,
            borderRadius: 5, fontSize: 10.5, fontWeight: 700,
            color: i === 0 ? '#fff' : T.slate[700],
            cursor: 'pointer', fontFamily: 'inherit',
          }}>{a}</button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  FocusRun, FocusBlockDone, FocusBlockPaused, FocusBreak, FocusDayEnd,
});
})();
