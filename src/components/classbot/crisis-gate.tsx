import { Heart, MessageCircle } from 'lucide-react';

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
      <p className="text-pullim-slate-700 text-[12px] leading-relaxed">
        {studentName} 학생의 응답에 학습 부담·감정 시그널이 보여요. 점수를 정하기 전에 한 번 더 봐주세요.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="bg-pullim-slate-900 hover:bg-pullim-slate-800 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white"
        >
          <MessageCircle className="h-3 w-3" />
          1:1 면담 메모
        </button>
        <button
          type="button"
          className="bg-white text-pullim-slate-700 hover:bg-pullim-slate-50 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold"
        >
          리포트 첨부로 진행
        </button>
      </div>
    </section>
  );
}
