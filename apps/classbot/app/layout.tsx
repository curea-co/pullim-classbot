import type { Metadata, Viewport } from 'next';
import { Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthProvider } from '@/lib/auth/auth-context';
import './globals.css';

// Pretendard — 한글 가변폰트, next/font/local 자체 호스팅 (CDN render-blocking 제거).
const pretendard = localFont({
  src: './fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  weight: '45 920',
  display: 'swap',
});

// 영문 모노스페이스는 next/font/google으로 자체 호스팅.
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
  themeColor: '#0362DA', // = pullim primary seed (#0362DA)
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-full font-sans">
        <QueryProvider>
          <AuthProvider>
            <TooltipProvider delay={120}>{children}</TooltipProvider>
          </AuthProvider>
        </QueryProvider>
        <Toaster position="top-center" closeButton richColors />
      </body>
    </html>
  );
}
