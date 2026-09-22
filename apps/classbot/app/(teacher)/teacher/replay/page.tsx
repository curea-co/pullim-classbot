import { History } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { SectionHeading } from '@/components/shell/section-heading';
import { EmptyState } from '@/components/classbot/empty-state';

/**
 * 수업 리플레이 — 2026-09-18 · **세지 않은 것을 0 으로 말하던 화면.**
 *
 * 이 화면의 씨앗(`lib/mock/classbot.ts` 의 `studentReplays`)은 출시 때 이미 빈 배열이 됐다. 그래서
 * 없는 수업을 지어내지는 않았는데, 대신 **머리가 「0개 수업 · 검수 대기 0건」이라고 적고** 상태 알약
 * 넷이 전부 `0` 을 달고 섰다. 서버에 리플레이를 세는 문이 없으니 그 0 은 「없다」가 아니라
 * 「센 적이 없다」다 — #369·#370 이 교사 홈·채점 허브에서 걷어낸 것과 같은 거짓이다.
 *
 * 나머지 하나는 **localStorage 다.** 목록이 세던 수는 씨앗 0 건 + `lib/store/replay.ts` 의 `created`
 * (라이브 종료가 이 브라우저에 만들어 둔 것)였고, 검수·발송 확정도 거기에만 남았다. 다른 기기로
 * 옮기면 방금 발송한 리플레이가 없었다. 「발송 완료」라고 적힌 채로.
 *
 * ── 왜 정본으로 갈아 끼우지 않았나 ──────────────────────────────────────────
 * **정본(pullim-api)에 리플레이를 읽고 쓰는 문이 아예 없다.** 라이브 세션·녹화·STT·핵심 메시지 어느
 * 것도 25개 라우트에 없다. 갈아 끼울 대상은 그 문이 열리는 날 생긴다. 라이브 수업 자체가 기획
 * 보류(SCR-C-19)라 **레일도 이 화면을 일부러 안 건다**
 * (`components/shell/nav-config.ts` 의 「기획 보류 — 수업 리플레이 진입점 비노출」).
 *
 * **라우트를 남긴 까닭** — 레일에는 없지만 아직 이리로 보내는 자리가 셋 있다:
 * `components/classbot/class-reach-roster.tsx`(명단 머리의 「대화 기록 전체」 · 줄 전체 링크) ·
 * `components/classbot/replay-review.tsx` · `components/classbot/live-broadcast-controls.tsx`.
 * 셋 다 지금 어느 화면에도 안 붙어 있지만 파일은 산다 — 그 공유 컴포넌트들을 걷는 것은 별건이고
 * (#370 이 `grading-row` 외 다섯을 같은 까닭으로 남겼다), 라우트를 먼저 지우면 그 셋이 Next 기본
 * 404 를 가리킨다. 나가는 길도 설명도 없는 화면이다.
 *
 * **나가는 길을 두지 않았다.** 리플레이가 하던 일을 대신 받아 줄 정본 화면이 없다 — 있지도 않은
 * 곳으로 보내느니 무엇이 준비 중인지만 말하고, 돌아가는 길은 머리의 「교사 홈」 하나로 둔다.
 */
export default function TeacherReplayListPage() {
  return (
    <TeacherPageShell
      backHref="/teacher"
      backLabel="교사 홈"
      header={{
        eyebrow: { icon: History, text: '수업 리플레이' },
        title: '지난 수업 다시 보기',
      }}
    >
      <section className="bg-card rounded-2xl border p-5">
        <SectionHeading title="지난 수업" />
        <EmptyState
          icon={History}
          title="수업 리플레이를 아직 읽어 올 수 없어요"
          description="라이브 수업을 녹화하고 핵심을 뽑아 학생에게 보내는 길이 서버에 아직 없어요. 라이브 수업 자체가 준비 중이에요."
        />
      </section>
    </TeacherPageShell>
  );
}
