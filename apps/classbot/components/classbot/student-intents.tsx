import Link from 'next/link';
import {
  ArrowRight, BookOpen, HelpCircle, Target, CheckCircle, MessageCircle, Lock,
  type LucideIcon,
} from 'lucide-react';
import { studentIntents, scopeMeta, myClassBot } from '@/lib/mock';
import { cn } from '@/lib/utils';

const intentIconMap: Record<typeof studentIntents[number]['id'], LucideIcon> = {
  review:   BookOpen,
  concept:  HelpCircle,
  problem:  Target,
  homework: CheckCircle,
  message:  MessageCircle,
};

/**
 * 학생 — 봇과 대화 시작 의도 카드.
 * 각 의도가 요구하는 Scope Level을 표시 (현재 봇 권한과 비교).
 * 허용된 의도는 봇 채팅(/chat)으로 이동.
 */
export function StudentIntents() {
  const currentScope = myClassBot.scope;

  return (
    <section>
      <h2 className="text-pullim-slate-900 mb-2 text-sm font-bold">
        무엇을 도와드릴까요?
      </h2>
      <ul className="space-y-2">
        {studentIntents.map(intent => {
          const allowed = intent.scopeRequired <= currentScope;
          const required = scopeMeta[intent.scopeRequired];
          const IntentIcon = intentIconMap[intent.id];

          const inner = (
            <>
              <span
                aria-hidden
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  allowed
                    ? 'bg-pullim-blue-50 text-pullim-blue-700'
                    : 'bg-pullim-slate-100 text-pullim-slate-400 opacity-50',
                )}
              >
                <IntentIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className={cn(
                  'text-sm font-bold',
                  allowed ? 'text-pullim-slate-900' : 'text-pullim-slate-500',
                )}>
                  {intent.label}
                </div>
                <div className="text-pullim-slate-500 truncate text-xs">
                  {intent.description}
                </div>
                {!allowed && (
                  <div className="text-pullim-slate-500 mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold">
                    <Lock className="h-2.5 w-2.5" />
                    선생님이 권한을 {required.short}({required.label})로 올려야 사용 가능
                  </div>
                )}
              </div>
              {allowed && (
                <ArrowRight className="text-pullim-slate-300 group-hover:text-pullim-blue-500 h-4 w-4 transition-colors" />
              )}
            </>
          );

          const baseClass = cn(
            'group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all',
            allowed
              ? 'bg-card hover:border-pullim-blue-300 hover:shadow-pullim-md'
              : 'bg-pullim-slate-50 border-dashed cursor-not-allowed',
          );

          return (
            <li key={intent.label}>
              {allowed ? (
                <Link href="/classbot/chat" className={baseClass}>{inner}</Link>
              ) : (
                <div aria-disabled className={baseClass}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
