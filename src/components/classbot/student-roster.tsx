import { AlertTriangle, Heart, MessageCircle } from 'lucide-react';
import { classRoster, type ClassroomStudent } from '@/lib/mock';
import { cn } from '@/lib/utils';

const heatColors = [
  'var(--color-pullim-heat-0)',
  'var(--color-pullim-heat-1)',
  'var(--color-pullim-heat-2)',
  'var(--color-pullim-heat-3)',
  'var(--color-pullim-heat-4)',
  'var(--color-pullim-heat-5)',
];

const statusMeta = {
  active:   { label: '활성',   dot: 'bg-pullim-success' },
  quiet:    { label: '저활성', dot: 'bg-pullim-warn' },
  inactive: { label: '무응답', dot: 'bg-pullim-danger' },
  away:     { label: '미참여', dot: 'bg-pullim-slate-300' },
} as const;

const alertMeta = {
  burnout:    { label: '번아웃 위험', icon: AlertTriangle, color: 'text-pullim-danger' },
  emotion:    { label: '감정 주의',   icon: Heart,         color: 'text-pullim-warn' },
  attendance: { label: '결석',       icon: AlertTriangle, color: 'text-pullim-slate-500' },
} as const;

/**
 * 교사 뷰 — 학생 명단 + 5분 단위 활동 히트맵 (지난 30분).
 * 핸드오프 4.4 (실시간 수업 좌측 패널) + 7.3 (웰빙 지수).
 */
export function StudentRoster() {
  return (
    <section className="bg-card flex h-full flex-col overflow-hidden rounded-2xl border">
      <header className="border-pullim-slate-200 flex items-center justify-between border-b p-4">
        <div>
          <h2 className="text-pullim-slate-900 text-sm font-bold">학생 명단</h2>
          <p className="text-pullim-slate-500 text-[11px]">
            14/18명 참여 · 활동 히트맵: 지난 30분
          </p>
        </div>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="준비 중 (v2)"
          className="text-pullim-blue-600 text-xs font-semibold opacity-60 cursor-not-allowed"
        >
          전체 메시지
        </button>
      </header>
      <ul className="divide-pullim-slate-100 flex-1 divide-y overflow-y-auto">
        {classRoster.map(s => (
          <RosterRow key={s.id} student={s} />
        ))}
      </ul>
    </section>
  );
}

function RosterRow({ student: s }: { student: ClassroomStudent }) {
  const status = statusMeta[s.status];
  const alert = s.alert ? alertMeta[s.alert] : null;
  const AlertIcon = alert?.icon;

  return (
    <li className="hover:bg-pullim-slate-50 flex items-center gap-3 px-4 py-2.5 transition-colors">
      {/* 아바타 + 상태 점 */}
      <div className="relative">
        <div className="bg-pullim-blue-100 text-pullim-blue-700 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold">
          {s.name[0]}
        </div>
        <span
          className={cn('absolute -right-0.5 -bottom-0.5 inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white', status.dot)}
          aria-label={`상태: ${status.label}`}
          role="img"
        />
      </div>

      {/* 이름 + 알림 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-pullim-slate-900 truncate text-sm font-semibold">
            {s.name}
          </span>
          {alert && AlertIcon && (
            <span title={alert.label} className={cn('inline-flex', alert.color)}>
              <AlertIcon className="h-3 w-3" />
            </span>
          )}
        </div>
        <div className="text-pullim-slate-400 flex items-center gap-1.5 text-[10px]">
          <MessageCircle className="h-2.5 w-2.5" />
          <span>{s.botQuestions}질문</span>
          <span>·</span>
          <span>정답률 {s.accuracy}%</span>
          {s.lastActiveMin > 0 && (
            <>
              <span>·</span>
              <span>{s.lastActiveMin}분 전</span>
            </>
          )}
        </div>
      </div>

      {/* 히트맵 6칸 */}
      <div className="hidden gap-0.5 sm:flex" aria-label="활동 히트맵">
        {s.activityHeat.map((h, i) => (
          <span
            key={i}
            className="h-5 w-2.5 rounded-sm"
            style={{ background: heatColors[h] }}
            title={`${i * 5}~${(i + 1) * 5}분 전`}
          />
        ))}
      </div>
    </li>
  );
}
