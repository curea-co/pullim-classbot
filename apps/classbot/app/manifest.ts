import type { MetadataRoute } from 'next';

/**
 * PWA manifest — 홈 화면 추가·앱 등록 시 사용.
 * spec plan § C.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '풀림 클래스봇',
    short_name: '클래스봇',
    description: '교사가 만드는 AI 학습 교실. 반 운영·과제 배포·실시간 피드백 자동화.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F0F6FB',
    theme_color: '#0362DA',
    lang: 'ko-KR',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/favicon.ico',
        sizes: '32x32 48x48',
        type: 'image/x-icon',
      },
    ],
  };
}
