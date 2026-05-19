# Pullim 통합 디자인 시스템 (v0.1)

세 모듈 — **Planner / Q / Classbot** — 을 Playwright로 직접 탐방한 후 합성한 산출물입니다.

## 디렉토리

```
/tmp/pullim-audit/
├── design-system/                # ★ 통합 산출물
│   ├── README.md                 # (이 파일)
│   ├── DESIGN_SYSTEM.md          # 통합 디자인 시스템 문서
│   ├── IMPROVEMENTS.md           # 공통/개별 개선 백로그
│   ├── tokens.json               # 단일 정규 디자인 토큰
│   ├── tokens.css                # CSS custom properties
│   ├── private-planner.md        # ★ Planner 사적 디자인 심화 (8영역 + 모션 8개)
│   ├── private-q.md              # ★ Q 사적 디자인 심화 (9영역 + 모션 10개)
│   └── private-classbot.md       # ★ Classbot 사적 디자인 심화 (10영역 + 모션 9+5개)
│
├── planner/                      # Pullim Planner 감사 산출물
│   ├── REPORT.md                 # 상세 보고서
│   ├── tokens.json               # 추출된 토큰
│   ├── desktop-*.png, mobile-*.png  # 스크린샷
│   └── *.json                    # 원시 메타데이터
│
├── q/
│   ├── tokens.json, raw-metrics.json
│   ├── desktop-*.png, mobile-*.png  # 22장 (1차)
│   ├── audit.mjs
│   └── private/                  # ★ 사적 캡처 53장 + private-metrics.json
│
└── classbot/
    ├── tokens.json, raw.json
    ├── desktop-*.png, mobile-*.png  # 17장 (1차)
    ├── audit.mjs, chat-audit.mjs, scroll-cap.mjs
    └── private/                  # ★ 사적 캡처 19장 + M-keyboard-open 증거
```

## 사적(Private) 디자인 한눈에

| 앱 | 핵심 차별화 자산 | P0/Critical |
|---|---|---|
| **Planner** | 시간표 그리드 · D-day Tier · 컨디션/번아웃 · 주간 리포트 회고 | 블록 5단 상태 색문법, D-3 이내 헤더 4px warning 띠, "위협→권유" 카피 톤 |
| **Q** | Solve 캔버스 · 해설 12-섹션 · 7-섹션 종형 홈 · Talk 컨텍스트 | Solve 실제 UI 부재, 12-섹션 → 3페이즈 묶음, 복습 3-bucket, 정답/오답 reveal 모션 |
| **Classbot** | 봇 페르소나 5인 · LIVE/리플레이 · 빠른 칩 · 웰빙 코멘트 | **모바일 키보드 열림 시 입력창 실종**, 봇 메타 카드 388px 점유, jargon 노출, 봇별 시각 차별화 0 |

## 한 줄 요약

세 앱은 이미 **Pretendard + Primary blue #2854D8 + Lime accent + 슬레이트 중성 + Borderline-flat** 으로 70% 수렴해 있습니다. 남은 30%(타입 스케일·radius·작은 글자 컬러·터치 타깃·모션)를 통일하면 사실상 하나의 시스템이 됩니다. 자세한 내용은 [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) 참고.

## 빠른 적용

```bash
# 토큰만 임포트
import "/tmp/pullim-audit/design-system/tokens.css";
```

또는 `tokens.json` 을 Style Dictionary / Tailwind preset 빌더에 넣어 사용.

## 우선순위 Top 5 (즉시 처리 권장)

1. **Planner 모바일 헤더↓ 250px 공백 픽스** — 가장 시급 (첫 화면 가치 0)
2. **본문 메타 `#97A0B4` → `#6B7489` 일괄 치환** — a11y AA 즉시 통과 (세 앱 공통)
3. **앰버 CTA `#F59E0B` → `#D97706`** — 흰 글자 대비 AA 통과 (주로 Q)
4. **Classbot 타이핑 인디케이터 + 메시지 fade-in 추가** — 챗봇 신뢰감 핵심 결손
5. **버튼 hit-area 44px 가드** — 모바일 UX (세 앱 공통)

전체 백로그는 [IMPROVEMENTS.md](./IMPROVEMENTS.md) 참고.
