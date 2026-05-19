'use client';

import { useEffect, useState } from 'react';

/**
 * 모바일 키보드 열림 감지 hook.
 *
 * 권위: [04 § 9.5](proc/spec/04-ux-flow.md) — Critical 회귀(키보드 열림 시 입력바 실종) 픽스.
 *
 * 반환값:
 * - `keyboardOffset`: 키보드 위로 띄울 픽셀 (입력바 `bottom`에 더하는 값)
 * - `keyboardOpen`: 키보드 열림 여부 (메타카드 자동 collapse 트리거용)
 *
 * `visualViewport` API 미지원 환경(구형 브라우저·SSR)에서는 0을 반환해
 * 정상 정적 레이아웃으로 fallback.
 *
 * 추가로 `document.documentElement`의 `--keyboard-offset` CSS 변수도 동기화하므로
 * 순수 CSS만으로도 sticky 입력바를 만들 수 있다(예: `bottom: var(--keyboard-offset)`).
 */
export function useVisualViewport(): { keyboardOffset: number; keyboardOpen: boolean } {
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;

    function update() {
      if (!vv) return;
      // 키보드가 열리면 vv.height < window.innerHeight, vv.offsetTop은 키보드 위 콘텐츠 시작점
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
      root.style.setProperty('--keyboard-offset', `${offset}px`);
    }

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      // 컴포넌트 언마운트 시 키보드 offset 초기화 (다른 화면 영향 X)
      root.style.setProperty('--keyboard-offset', '0px');
    };
  }, []);

  // 50px 이상이면 키보드 열림으로 간주 (iOS Safari 주소창 미세 변화 노이즈 제외)
  return { keyboardOffset, keyboardOpen: keyboardOffset > 50 };
}
