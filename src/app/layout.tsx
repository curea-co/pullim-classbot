import type { Metadata, Viewport } from 'next';
import { Geist_Mono } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

// Pretendard는 globals.css의 CDN @import로 로드 (한글 가변폰트).
// 영문 모노스페이스는 next/font로 자체 호스팅.
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const BRAND = '풀림 클래스봇';
const TAGLINE = '교사가 만드는 AI 학습 교실';
const DESCRIPTION =
  '교사가 자신의 수업·교안·목소리를 AI에 이식해 만드는 디지털 분신 수업 동반자. 반 운영·과제 배포·실시간 피드백을 자동화하는 풀림 클래스봇.';

// Vercel은 빌드 시 VERCEL_GIT_COMMIT_SHA를, GitHub Actions는 GITHUB_SHA를 자동 주입.
// 둘 다 없으면 'dev'. prod-verify workflow가 이 meta로 신선도 검증.
const BUILD_SHA =
  process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'dev';

export const metadata: Metadata = {
  title: {
    default: `${BRAND} — ${TAGLINE}`,
    template: `%s | ${BRAND}`,
  },
  description: DESCRIPTION,
  applicationName: BRAND,
  keywords: ['풀림 클래스봇', 'AI 학습 교실', '교사 AI', '수업 동반자', '클래스봇', 'ClassBot', '풀림'],
  authors: [{ name: 'curea' }],
  creator: 'curea',
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: BRAND,
    title: `${BRAND} — ${TAGLINE}`,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND} — ${TAGLINE}`,
    description: DESCRIPTION,
  },
  other: {
    'x-build-sha': BUILD_SHA,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0362DA',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={`${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-full font-sans">
        <TooltipProvider delay={120}>{children}</TooltipProvider>
        <Toaster position="top-center" closeButton richColors />
      </body>
    </html>
  );
}
