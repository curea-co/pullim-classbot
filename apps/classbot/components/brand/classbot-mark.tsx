import { cn } from '@/lib/utils';

/**
 * 풀림 클래스봇 심볼 — pullim.ai/symbols/04_classbot.svg 의 픽셀 로봇 페이스.
 * 파비콘/앱 아이콘과 동일한 마크. 토큰 색(fill-*)으로 — components/** hex 금지 게이트 준수.
 */
export function ClassbotMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="풀림 클래스봇"
      className={cn('shrink-0', className)}
    >
      <rect x="4" y="4" width="92" height="92" rx="18" className="fill-pullim-blue-600" />
      {/* 로봇 얼굴 — 머리 외곽 + 눈 + 입 */}
      <g className="fill-white">
        <rect x="30" y="30" width="40" height="8" />
        <rect x="30" y="62" width="40" height="8" />
        <rect x="30" y="38" width="8" height="24" />
        <rect x="62" y="38" width="8" height="24" />
        <rect x="38" y="46" width="8" height="8" />
        <rect x="54" y="46" width="8" height="8" />
        <rect x="46" y="54" width="8" height="8" />
      </g>
      {/* 안테나 — 레몬 */}
      <rect x="46" y="22" width="8" height="8" className="fill-pullim-lemon" />
    </svg>
  );
}
