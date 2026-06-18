import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * AuthCard 와 동일한 셸·폭을 가진 Suspense 스켈레톤 플레이스홀더.
 * 텍스트·props 없음 — 순수 시각 자리 표시자.
 */
export function AuthCardSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center gap-3 text-center">
        {/* 로고 원형 */}
        <Skeleton className="h-7 w-7 rounded-full" />
        {/* 제목 바 */}
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* 필드 그룹 1 */}
        <div className="grid gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        {/* 필드 그룹 2 */}
        <div className="grid gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        {/* 버튼 바 */}
        <Skeleton className="h-11 w-full" />
      </CardContent>
    </Card>
  );
}
