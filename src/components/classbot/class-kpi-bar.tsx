import { Users, MessageSquare, Target, AlertTriangle, Heart, Activity } from 'lucide-react';
import { classKpis } from '@/lib/mock';

/**
 * 교사 뷰 상단 — 6개 클래스 KPI.
 * 핸드오프 4.7 (리포트 8개 KPI에서 라이브 6개 추림).
 */
export function ClassKpiBar() {
  const k = classKpis;
  return (
    <section className="bg-card rounded-2xl border p-3">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi Icon={Users}          label="참여 학생"      value={`${k.liveStudents}/${k.totalStudents}`} />
        <Kpi Icon={MessageSquare}  label="질문 (1H)"      value={`${k.questionsLastHour}`} />
        <Kpi Icon={Target}         label="평균 정답률"    value={`${k.avgAccuracy}%`} accent />
        <Kpi Icon={Heart}          label="평균 웰빙"      value={`${k.avgWellbeing}/100`} />
        <Kpi Icon={AlertTriangle}  label="번아웃 위험"    value={`${k.burnoutAlerts}명`} alert={k.burnoutAlerts > 0} />
        <Kpi Icon={Activity}       label="실시간 활동"    value="활발" success />
      </ul>
    </section>
  );
}

function Kpi({
  Icon, label, value, accent, alert, success,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string; value: string;
  accent?: boolean; alert?: boolean; success?: boolean;
}) {
  const valueClass =
    accent ? 'text-pullim-blue-600'
    : alert ? 'text-pullim-danger'
    : success ? 'text-pullim-blue-500'
    : 'text-pullim-slate-900';
  return (
    <li className="bg-pullim-slate-50/50 rounded-lg px-3 py-2">
      <div className="text-pullim-slate-500 inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={`mt-0.5 font-mono text-base font-bold ${valueClass}`}>{value}</div>
    </li>
  );
}
