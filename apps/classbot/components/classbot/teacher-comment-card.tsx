'use client';

import { MessageCircle } from 'lucide-react';
import { useMyInterventions } from '@/hooks/api/intervention';
import { latestCommentFor } from '@/lib/interventions';

/**
 * 결과 화면 「선생님 한마디」 — 교사 `comment` 개입의 학생 쪽 표면.
 *
 * 벨 인박스와 **같은 문**(`GET /classbot/interventions?audience=student`)을 읽는 파생 뷰다 — 같은 캐시라
 * 이 화면을 열어도 요청이 한 번 더 나가지 않고, 벨에서 읽음으로 바꾼 것이 여기에도 그대로 선다.
 * 서버가 `student_id==sub` 로 고르므로 **학생 id 를 넘기지 않는다**(종전의 roster 브리지 키는 로컬 스토어와 함께 걷혔다).
 *
 * `poll` 은 켜지 않는다 — 60초 타이머는 헤더 벨 하나만 건다(`useMyInterventions` 의 `poll`). 여기는 그 캐시를
 * 구독만 하므로 벨이 되읽으면 이 카드도 함께 바뀐다.
 *
 * comment 가 없으면 아무것도 그리지 않는다 — 기다리는 동안에도(빈 자리를 흔들지 않는다).
 */
export function TeacherCommentCard({ assignmentId }: { assignmentId: string }) {
  const inbox = useMyInterventions();
  const comment = latestCommentFor(inbox.items, assignmentId);

  if (!comment) return null;

  return (
    <section className="border-pullim-blue-100 bg-pullim-blue-50 rounded-2xl border p-4">
      <div className="flex items-start gap-2.5">
        <span className="bg-pullim-blue-600 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white">
          <MessageCircle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-pullim-blue-600 text-2xs font-bold tracking-wider uppercase">
            선생님 한마디
          </p>
          <p className="text-pullim-slate-900 mt-0.5 text-sm leading-relaxed">{comment.message}</p>
        </div>
      </div>
    </section>
  );
}
