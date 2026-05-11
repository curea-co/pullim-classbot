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

export const metadata: Metadata = {
  title: '풀림 스터디 — AI 학습 파트너',
  description:
    '내 실력에 딱 맞는 문제, 사고를 이끌어주는 AI 튜터, 시간 단위 맞춤 학습 계획. 풀림 스터디는 고등학생을 위한 AI 학습 플랫폼입니다.',
  applicationName: '풀림 스터디',
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#3B6FF6',
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
