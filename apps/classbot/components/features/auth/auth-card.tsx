import type { ReactNode } from 'react';
import { ClassbotMark } from '@/components/brand/classbot-mark';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  /** 카드 하단 보조 영역 (가입/로그인 전환 링크 등). */
  footer?: ReactNode;
  className?: string;
}

/**
 * 인증 화면 공통 카드 셸 — 로고 + 제목 + 본문 + 푸터.
 * 본체 pullim AuthCard 패턴을 classbot shadcn(Card)로 재작성.
 */
export function AuthCard({ title, description, children, footer, className }: AuthCardProps) {
  return (
    <Card className={cn('w-full max-w-md', className)}>
      <CardHeader className="items-center gap-3 text-center">
        <ClassbotMark size={32} />
        <div className="grid gap-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
      {footer ? (
        <div className="px-4 pb-1 text-center text-sm text-muted-foreground">{footer}</div>
      ) : null}
    </Card>
  );
}
