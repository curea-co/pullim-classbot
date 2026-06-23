import { Heart, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 위기 게이트 — 응답 빈약·감정 키워드 발견 시 점수 표시 전 부드러운 알림.
 * spec 11 § 5.4.
 */
export function CrisisGate({ studentName }: { studentName: string }) {
  return (
    <section className="border-pullim-danger/30 bg-pullim-danger-bg rounded-2xl border p-4">
      <header className="mb-2 flex items-center gap-2">
        <Heart className="text-pullim-danger h-4 w-4" />
        <h3 className="text-pullim-danger text-sm font-bold">신경 쓸 신호가 있어요</h3>
      </header>
      <p className="text-pullim-slate-700 text-xs leading-relaxed">
        {studentName} 학생의 응답에 학습 부담·감정 시그널이 보여요. 점수를 정하기 전에 한 번 더 봐주세요.
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled
          aria-disabled="true"
          title="준비 중 (v2 — 1:1 면담 메모)"
          className="bg-pullim-slate-900 hover:bg-pullim-slate-800 text-white opacity-60 cursor-not-allowed"
        >
          <MessageCircle />
          1:1 면담 메모 (v2)
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          aria-disabled="true"
          title="준비 중 (v2 — 리포트 첨부)"
          className="opacity-60 cursor-not-allowed"
        >
          리포트 첨부로 진행 (v2)
        </Button>
      </div>
    </section>
  );
}
