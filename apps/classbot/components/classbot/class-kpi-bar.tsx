import { Users, MessageSquare, Target, AlertTriangle, Heart, Activity } from 'lucide-react';
import { classKpis } from '@/lib/mock';
import { KpiStat, KpiStatBar } from '@/components/classbot/kpi-stat';

/**
 * 교사 뷰 상단 — 6개 클래스 KPI.
 * 핸드오프 4.7 (리포트 8개 KPI에서 라이브 6개 추림).
 */
export function ClassKpiBar() {
  const k = classKpis;
  return (
    <KpiStatBar cols={6}>
      <KpiStat icon={Users}         label="참여 학생"   value={`${k.liveStudents}/${k.totalStudents}`} />
      <KpiStat icon={MessageSquare} label="질문 (1H)"   value={`${k.questionsLastHour}`} />
      <KpiStat icon={Target}        label="평균 정답률" value={`${k.avgAccuracy}%`} tone="accent" />
      <KpiStat icon={Heart}         label="평균 웰빙"   value={`${k.avgWellbeing}/100`} />
      <KpiStat icon={AlertTriangle} label="번아웃 위험" value={`${k.burnoutAlerts}명`} tone={k.burnoutAlerts > 0 ? 'alert' : 'default'} />
      <KpiStat icon={Activity}      label="실시간 활동" value="활발" tone="success" />
    </KpiStatBar>
  );
}
