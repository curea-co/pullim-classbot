import { Button } from '@/components/ui/button';

/**
 * GATED: 소셜 로그인 / 이메일 인증 자리표시자.
 * BE 가 501(NotImplemented)로 게이트한 기능 — FE 는 비활성 버튼만 노출한다.
 * 메일러/카카오/네이버 연동 시 활성화한다.
 */
export function GatedSocialButtons() {
  return (
    <div className="grid gap-2" aria-label="소셜 로그인 (준비 중)">
      <div className="flex items-center gap-2">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">또는</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      {/* GATED: 카카오 OAuth 미연동 (BE social/* 501). */}
      <Button type="button" variant="outline" size="touch" disabled className="w-full">
        카카오로 계속하기 (준비 중)
      </Button>
      {/* GATED: 네이버 OAuth 미연동 (BE social/* 501). */}
      <Button type="button" variant="outline" size="touch" disabled className="w-full">
        네이버로 계속하기 (준비 중)
      </Button>
    </div>
  );
}
