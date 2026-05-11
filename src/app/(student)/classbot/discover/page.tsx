import { Compass, Lock, GraduationCap, Award, Globe } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { FlywheelNote } from '@/components/shell/flywheel-note';

export default function ClassbotDiscoverPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={{ icon: Compass, text: '풀림 클래스봇' }}
        title="공식 봇 찾기"
        description="등록된 학원·학교 외에 풀림이 검수한 공식 클래스봇을 직접 추가할 수 있어요"
      />

      {/* Locked future state */}
      <section className="bg-pullim-slate-50 border-pullim-slate-200 rounded-2xl border-2 border-dashed p-8 text-center">
        <span className="bg-pullim-slate-200 text-pullim-slate-500 mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl">
          <Lock className="h-5 w-5" />
        </span>
        <h2 className="text-pullim-slate-900 text-base font-bold">v2에 만나요</h2>
        <p className="text-pullim-slate-500 mx-auto mt-2 max-w-sm text-sm leading-relaxed">
          현재 클래스봇은 선생님이 만들어 학생에게 배정하는 게 기본이에요. 학생이 직접 봇을 검색해서 등록하는 기능은 준비 중이에요.
        </p>
      </section>

      {/* 어떤 봇이 올 예정 */}
      <section className="bg-card rounded-2xl border p-5">
        <h3 className="text-pullim-slate-900 mb-3 text-sm font-bold">곧 만날 봇 종류</h3>
        <ul className="space-y-3">
          <Future
            Icon={Award}
            title="EBS·EDWITH 인강 공식 봇"
            description="인강 선생님의 디지털 분신 — 강의 후 복습·추가 질문에 응답"
          />
          <Future
            Icon={GraduationCap}
            title="대학·기관 공식 봇"
            description="서울대·KAIST·EPFL 등 검수된 학습 봇 — 자기주도 심화"
          />
          <Future
            Icon={Globe}
            title="공교육 공유 봇"
            description="시·도 교육청이 검수한 단원별 봇 — 무료 사용"
          />
        </ul>
      </section>

      <FlywheelNote>
        지금은 <strong>선생님이 배정한 봇</strong>만 사이드바에 등장해요. 봇 마켓이 열리면 학생이 직접 추가한 봇도 함께 표시될 예정이에요.
      </FlywheelNote>
    </div>
  );
}

function Future({
  Icon, title, description,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string; description: string;
}) {
  return (
    <li className="bg-pullim-slate-50/50 flex items-start gap-3 rounded-xl p-3">
      <span className="bg-pullim-blue-50 text-pullim-blue-600 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-pullim-slate-900 text-sm font-bold">{title}</div>
        <div className="text-pullim-slate-500 mt-0.5 text-[11px] leading-relaxed">{description}</div>
      </div>
    </li>
  );
}
