'use client';

import { useState } from 'react';
import { AlertTriangle, Heart, MessageCircle, X, Calendar } from 'lucide-react';
import { type ClassroomStudent, emotionCheckIns, moodMeta } from '@/lib/mock';
import { cn } from '@/lib/utils';

/**
 * 위기 신호 / 즉시 개입 패널 — 학생 카드 클릭 시 상세 모달.
 * D4 의사결정: 상세 모달 + chat 진입 CTA. (v2 Wee센터는 placeholder)
 */
export function CrisisInterventionPanel({ students }: { students: ClassroomStudent[] }) {
  const [activeStudent, setActiveStudent] = useState<ClassroomStudent | null>(null);

  return (
    <>
      <section className="bg-pullim-slate-900 text-pullim-slate-200 rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-pullim-lemon flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
              <AlertTriangle className="h-3 w-3" />
              위기 신호
            </div>
            <h2 className="mt-0.5 text-base font-bold text-white">즉시 개입 대상</h2>
          </div>
          <span className="bg-pullim-lemon text-pullim-lemon-ink rounded-full px-2 py-0.5 text-[10px] font-bold">
            {students.length}명
          </span>
        </div>

        <ul className="space-y-2">
          {students.map(s => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setActiveStudent(s)}
                className="bg-white/5 hover:bg-white/10 w-full rounded-lg p-2.5 text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="bg-pullim-blue-600 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white">
                    {s.name[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white">{s.name}</div>
                    <div className="text-pullim-slate-400 text-[10px]">
                      {s.alert === 'burnout' && '번아웃 위험 — 웰빙 ' + s.wellbeing}
                      {s.alert === 'emotion' && '감정 체크인 "힘듦" 3일 연속'}
                      {s.alert === 'attendance' && `${s.lastActiveMin}분째 무응답`}
                    </div>
                  </div>
                  <Heart className="text-pullim-lemon h-3 w-3" />
                </div>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          disabled
          aria-disabled="true"
          title="준비 중 (v2 — Wee센터 연계)"
          className="bg-pullim-lemon text-pullim-lemon-ink mt-3 w-full rounded-lg py-2 text-xs font-bold opacity-60 cursor-not-allowed"
        >
          1:1 상담 시작 / Wee센터 연결 (v2)
        </button>
      </section>

      {activeStudent && (
        <CrisisDetailModal
          student={activeStudent}
          onClose={() => setActiveStudent(null)}
        />
      )}
    </>
  );
}

function CrisisDetailModal({ student, onClose }: { student: ClassroomStudent; onClose: () => void }) {
  const myCheckIns = emotionCheckIns
    .filter(e => e.studentId === student.id)
    .sort((a, b) => a.daysAgo - b.daysAgo);

  const alertCopy = {
    burnout: '번아웃 위험 — 학습량은 유지되지만 정답률·웰빙이 동반 하락.',
    emotion: '감정 체크인 3일 연속 "힘듦" — 자유 텍스트 키워드 모니터링 권장.',
    attendance: `${student.lastActiveMin}분째 무응답 — 출석 또는 봇 차단 점검.`,
  }[student.alert ?? 'burnout'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crisis-modal-title"
    >
      <div className="bg-card w-full max-w-md rounded-2xl border shadow-pullim-lg max-h-[90vh] overflow-y-auto">
        <header className="border-pullim-slate-100 sticky top-0 z-10 flex items-center justify-between border-b bg-card p-4">
          <div className="flex items-center gap-2">
            <span className="bg-pullim-blue-600 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white">
              {student.name[0]}
            </span>
            <div>
              <h2 id="crisis-modal-title" className="text-pullim-slate-900 text-sm font-bold">
                {student.name} 학생책
              </h2>
              <p className="text-pullim-slate-500 text-[11px]">즉시 개입 — 위기 신호 상세</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-pullim-slate-500 hover:text-pullim-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 p-4">
          {/* 위기 요약 */}
          <section className="bg-pullim-lemon/20 border-pullim-lemon text-pullim-slate-900 rounded-xl border p-3">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="text-pullim-lemon-ink h-3.5 w-3.5" />
              <strong className="text-xs">위기 신호</strong>
            </div>
            <p className="text-pullim-slate-700 mt-1 text-[12px] leading-relaxed">{alertCopy}</p>
          </section>

          {/* 지표 4칸 */}
          <section className="grid grid-cols-2 gap-2">
            <Metric label="웰빙" value={`${student.wellbeing}/100`} alert={student.wellbeing < 60} />
            <Metric label="정답률" value={`${student.accuracy}%`} alert={student.accuracy < 60} />
            <Metric label="봇 질문" value={`${student.botQuestions}회`} />
            <Metric label="최근 활동" value={student.lastActiveMin === 0 ? '활성' : `${student.lastActiveMin}분 전`} alert={student.lastActiveMin > 10} />
          </section>

          {/* 웰빙 7일 미니 차트 */}
          <section className="bg-card rounded-xl border p-3">
            <header className="mb-2 flex items-center gap-1.5">
              <Calendar className="text-pullim-blue-500 h-3 w-3" />
              <h3 className="text-pullim-slate-700 text-xs font-bold">감정 체크인 7일</h3>
            </header>
            {myCheckIns.length === 0 ? (
              <p className="text-pullim-slate-400 text-[11px]">기록 없음</p>
            ) : (
              <ul className="space-y-1">
                {myCheckIns.slice(0, 7).map(c => {
                  const m = moodMeta[c.mood];
                  return (
                    <li key={c.id} className="flex items-center gap-2 text-[11px]">
                      <span className="text-lg leading-none">{m.emoji}</span>
                      <span className="text-pullim-slate-700 w-12 font-bold">{c.daysAgo === 0 ? '오늘' : `${c.daysAgo}일 전`}</span>
                      <span className="text-pullim-slate-500">{m.label}</span>
                      {c.freeText && (
                        <span className="text-pullim-slate-400 ml-auto truncate text-[10px] italic">"{c.freeText}"</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* CTA */}
          <section className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                window.location.href = `/classbot/chat?student=${encodeURIComponent(student.id)}`;
              }}
              className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-white"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {student.name} 학생과 1:1 채팅 시작
            </button>
            <p className="text-pullim-slate-400 text-[10px] text-center">
              v2: Wee센터·학부모 알림 동시 발송 옵션 추가 예정
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={cn(
      'rounded-lg p-2.5',
      alert ? 'bg-pullim-lemon/20 border-pullim-lemon' : 'bg-pullim-slate-50',
    )}>
      <div className="text-pullim-slate-500 text-[10px]">{label}</div>
      <div className={cn('text-sm font-bold font-mono', alert ? 'text-pullim-danger' : 'text-pullim-slate-900')}>
        {value}
      </div>
    </div>
  );
}
