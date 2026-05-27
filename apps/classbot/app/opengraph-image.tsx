import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = '풀림 클래스봇 — 교사가 만드는 AI 학습 교실';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * 동적 OG 이미지 — 임베드 시 vercel·카카오톡·트위터에 노출.
 * spec 13 § OG, plan 2026-05-11_brand-classbot-metadata § B.
 *
 * 디자인:
 * - 풀림 블루 그라디언트 배경 (#0362DA → #003a8c)
 * - 좌상단 "✏️ PULLIM" 로고 영역
 * - 중앙 거대 헤드라인 "풀림 클래스봇"
 * - 서브 "교사가 만드는 AI 학습 교실"
 * - 우하단 풀림 레몬 액센트 점
 */
export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background: 'linear-gradient(135deg, #0362DA 0%, #003a8c 100%)',
          color: 'white',
          fontFamily: 'system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
          position: 'relative',
        }}
      >
        {/* 우상단 글로우 */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: 999,
            background: 'radial-gradient(circle, rgba(230,255,76,0.25) 0%, transparent 70%)',
          }}
        />

        {/* 상단 로고 영역 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'rgba(255,255,255,0.12)',
              fontSize: 44,
            }}
          >
            🧑‍🏫
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 4,
                color: '#E6FF4C',
                textTransform: 'uppercase',
              }}
            >
              Pullim ClassBot
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
              by curea
            </div>
          </div>
        </div>

        {/* 중앙 헤드라인 */}
        <div style={{ display: 'flex', flexDirection: 'column', zIndex: 1 }}>
          <div
            style={{
              fontSize: 108,
              fontWeight: 900,
              letterSpacing: -3,
              lineHeight: 1.05,
              color: 'white',
            }}
          >
            풀림 클래스봇
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 44,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.92)',
              lineHeight: 1.3,
            }}
          >
            교사가 만드는 AI 학습 교실
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 26,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 1.5,
              maxWidth: 900,
            }}
          >
            수업·교안·목소리를 AI에 이식한 디지털 분신 수업 동반자
          </div>
        </div>

        {/* 하단 액센트 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: '#E6FF4C',
              }}
            />
            <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
              반 운영 · 과제 배포 · 실시간 피드백 자동화
            </div>
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 2,
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            pullim.app
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
