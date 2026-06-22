import { Compass, Lock, GraduationCap, Award, Globe } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import BackLink from '@/components/classbot/back-link';
import { EmptyState } from '@/components/classbot/empty-state';
import { SectionHeading } from '@/components/shell/section-heading';

export default function ClassbotDiscoverPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <BackLink href="/classbot">홈으로</BackLink>
      <PageHeader
        eyebrow={{ icon: Compass, text: '풀림 클래스봇' }}
        title="공식 봇 찾기"
        description="등록된 학원·학교 외에 풀림이 검수한 공식 클래스봇을 직접 추가할 수 있어요"
      />

      <EmptyState icon={Lock} title="v2에 만나요" description="현재 클래스봇은 선생님이 만들어 배정하는 게 기본이에요. 학생이 직접 검색해 등록하는 기능은 준비 중이에요." size="lg" action={{ href: '/classbot', label: '선생님이 배정한 봇 보러 가기' }} />

      {/* 어떤 봇이 올 예정 */}
      <section className="bg-card rounded-2xl border p-5">
        <SectionHeading title="곧 만날 봇 종류" />
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
        <div className="text-pullim-slate-500 mt-0.5 text-xs leading-relaxed">{description}</div>
      </div>
    </li>
  );
}
