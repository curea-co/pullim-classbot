import Link from 'next/link';
import { Children, cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type KpiTone = 'default' | 'accent' | 'alert' | 'success';

/**
 * 칸 크기.
 *
 * `md` 가 기본이고 **지금까지 그려지던 그대로**다 — KpiStat 은 학생·학부모·교사
 * 12개 화면 64자리에서 쓰이므로 기본값을 건드리면 그 전부가 같이 움직인다.
 * `lg` 는 숫자가 그 화면의 주인공인 자리에서만 켠다(현재 `/teacher/classbot` 운영 요약 4칸).
 */
export type KpiSize = 'md' | 'lg';

/**
 * ─── KpiStat 과 KpiStatLink 가 **같은 문자열**을 쓰게 하는 자리 ───
 *
 * 두 부품은 같은 KpiStatBar 안에 **섞여** 놓인다(`/teacher/classbot` 4칸 중 둘이 링크다).
 * 그래서 패딩·간격·글자 크기가 2px 만 달라도 값의 밑선이 이웃 칸과 어긋난다.
 * 예전에는 두 파일이 각자 클래스 문자열을 들고 있었고 실제로 갈라졌다
 * (`px-3/py-2/mt-0.5` vs `px-3.5/py-2.5/mt-1`). 상수를 한 곳에 두면
 * 「한쪽만 고치면 어긋난다」가 구조적으로 불가능해진다.
 */
export const KPI_BOX = 'bg-pullim-slate-50/50 rounded-lg px-3.5 py-2.5';

/**
 * 라벨 줄.
 *
 * `uppercase` 는 `md` 에만 남긴다. 「라벨이 한글이라 uppercase 는 무효」는 **사실이 아니다** —
 * 라틴 라벨에는 실제로 걸린다(`assignment-overview-header` 의 `label="D-day"` 는
 * `D-DAY` 로 그려진다). 전역으로 빼면 아무도 요청하지 않은 학생 화면 표기가 바뀌므로,
 * 제거는 새로 켜는 `lg` 안에서만 한다.
 */
export const KPI_LABEL: Record<KpiSize, string> = {
  md: 'inline-flex items-center gap-1 text-2xs font-semibold tracking-wider uppercase',
  lg: 'inline-flex items-center gap-1 text-xs font-semibold tracking-wider',
};

/**
 * 값 줄.
 *
 * `lg` 는 `text-xl`(21px)까지만 올린다. `text-2xl` 을 쓰지 않는 이유가 둘이다.
 * ① 위계 — `PageHeader` 의 h1 은 이 앱에서 **25px** 로 그려진다(크롬 실측). 그래서
 *    유틸리티 `text-2xl`(역시 25px)을 값에 쓰면 **숫자가 페이지 제목과 같은 크기**가 된다.
 *    21px 이면 기본 16px 에서 확실히 커지면서도 제목 아래에 머문다.
 * ② 줄바꿈 — `body { word-break: keep-all; overflow-wrap: break-word }` 라 칸을 넘치면
 *    숫자 **중간**에서 끊긴다. 좁은 칸일수록 위험한데(375px `cols={3}` 은 값 폭 62px),
 *    한 칸만 2줄이 되면 그 바의 밑선 정렬이 통째로 다시 깨진다.
 */
export const KPI_VALUE: Record<KpiSize, string> = {
  md: 'mt-1 font-mono text-base font-bold',
  lg: 'mt-1 font-mono text-xl font-bold',
};

/** KpiStatBar 가 size 를 내려 줄 대상인지 표시한다. `withKpiSize` 참조. */
interface KpiSizeAware {
  kpiSizeAware?: true;
}

export interface KpiStatProps {
  label: string;
  value: string;
  tone?: KpiTone;
  icon?: LucideIcon;
  /** When true, renders labels and values with on-dark (navy) safe colours (AA-legible). */
  onDark?: boolean;
  /** 칸 크기. 보통은 감싸는 KpiStatBar 가 내려 준다. */
  size?: KpiSize;
  /**
   * 「그래서 뭘 하나」 — 숫자 하나에 다음 행동 하나를 붙인다.
   * 지표가 무엇이 일어났는지만 보여주고 무엇을 해야 할지는 안 알려준다는 교사 불만에 대한 답.
   */
  action?: { label: string; href: string };
}

export interface KpiStatBarProps {
  children: ReactNode;
  cols?: 2 | 3 | 4 | 6;
  className?: string;
  /** When true, forwards onDark to every KpiStat child automatically. */
  onDark?: boolean;
  /** 칸 크기. 자식 KpiStat/KpiStatLink 에 자동으로 내려간다(자식이 직접 준 size 가 이긴다). */
  size?: KpiSize;
}

const toneValueClass: Record<KpiTone, string> = {
  default: 'text-pullim-slate-900',
  accent:  'text-pullim-blue-600',
  alert:   'text-pullim-danger',
  success: 'text-pullim-blue-500',
};

/**
 * On-dark (navy) equivalents.
 * 반전 면 위에서는 값을 전부 흰 글씨로 둔다 — 레몬은 키 CTA 자리라 KPI 숫자에 쓰지 않는다([08 § 1.6]).
 * alert 여부는 `icon` 과 `label` 이 말한다.
 */
const toneValueClassDark: Record<KpiTone, string> = {
  default: 'text-white',
  accent:  'text-white',
  alert:   'text-white',
  success: 'text-white',
};

const colsClass: Record<2 | 3 | 4 | 6, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
};

/**
 * ⚠ 칸의 바깥은 **블록 컨테이너**여야 한다 — KpiStatLink 의 `<a>` 도 같다.
 *
 * 라벨 `div` 가 `inline-flex`(인라인 레벨)이라 블록 컨테이너 안에서는 익명 line box 가 생기고
 * 그 높이는 `body` 의 line-height(15/24, md↑ 16/26)가 만드는 strut 이 정한다. 한쪽만
 * `flex flex-col` 이면 자식이 blockify 되어 strut 이 사라지고, **클래스를 한 글자도 다르지 않게
 * 맞춰도** 값의 밑선이 4~6px 어긋난다. 정렬은 클래스가 아니라 포매팅 컨텍스트가 닫는다.
 */
export function KpiStat({
  label,
  value,
  tone = 'default',
  icon: Icon,
  onDark = false,
  size = 'md',
  action,
}: KpiStatProps) {
  return (
    <li className={KPI_BOX}>
      <div className={cn(
        KPI_LABEL[size],
        onDark ? 'text-white/70' : 'text-pullim-slate-500',
      )}>
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className={cn(
        KPI_VALUE[size],
        onDark ? toneValueClassDark[tone] : toneValueClass[tone],
      )}>
        {value}
      </div>
      {action && (
        <Link
          href={action.href}
          className={cn(
            'mt-1.5 inline-block text-2xs font-bold',
            onDark ? 'text-white/80 hover:text-white' : 'text-pullim-blue-600 hover:text-pullim-blue-700',
          )}
        >
          {action.label}
          <span className="sr-only"> — {label}</span>
        </Link>
      )}
    </li>
  );
}
KpiStat.kpiSizeAware = true as const;

/**
 * size 를 자식에게 내려 준다.
 *
 * context 를 쓰지 않는 이유: KpiStat 은 서버 컴포넌트이고 `icon`(LucideIcon) 을
 * 서버 렌더 화면(`teacher/page.tsx` 등)에서 직접 받는다. context 를 쓰려면 `'use client'`
 * 가 필요하고, 그러면 그 함수 prop 이 직렬화 경계를 넘지 못한다.
 */
function withKpiSize(children: ReactNode, size: KpiSize): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (!(child.type as unknown as KpiSizeAware).kpiSizeAware) return child;
    const typed = child as ReactElement<{ size?: KpiSize }>;
    // 자식이 직접 준 size 가 이긴다 — 바가 덮어쓰지 않는다.
    return typed.props.size ? typed : cloneElement(typed, { size });
  });
}

export function KpiStatBar({ children, cols = 6, className, size = 'md' }: KpiStatBarProps) {
  return (
    <section className={cn('bg-card rounded-2xl border p-4', className)}>
      <ul className={cn('grid gap-3', colsClass[cols])}>
        {withKpiSize(children, size)}
      </ul>
    </section>
  );
}
