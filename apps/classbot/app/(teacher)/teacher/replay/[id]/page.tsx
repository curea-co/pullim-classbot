import { History } from 'lucide-react';
import { TeacherPageShell } from '@/components/classbot/teacher-page-shell';
import { EmptyState } from '@/components/classbot/empty-state';

/**
 * 수업 리플레이 한 건 — 2026-09-18 · **읽어 올 문이 없다.**
 *
 * 여기에는 상태 띠(처리 중 · 검수 대기 · 발송 완료) · 세그먼트 목록 · 「이 수업 핵심 3개」 편집 ·
 * 「학생에게 발송」 버튼이 서 있었다. 그 전부의 원천은 `lib/mock/classbot.ts` 의 `getReplayById()` 와
 * **이 브라우저의 localStorage**(`lib/store/replay.ts` 의 `created`·`overrides`)였다.
 *
 * 씨앗(`studentReplays`)은 출시 때 이미 빈 배열이 됐다. 그래서 **정상 경로로 들어온 어떤 id 도
 * 씨앗에 없었고**, 화면은 언제나 「리플레이를 찾을 수 없어요. 라이브 종료 직후라면 잠시 후 다시
 * 시도해주세요」로 떨어졌다 — 「없다」도 「잠시 후 되겠다」도 참이 아니다. 발송을 눌러도 그 확정은
 * 이 브라우저 밖으로 나가지 않았다.
 *
 * **id 를 보지 않는다.** 어떤 id 로 들어와도 답이 같기 때문이다 — 리플레이 한 건을 읽는 문이
 * 정본(pullim-api)에 없으므로 「그 건이 없다(404)」가 아니라 **「읽어 올 길이 없다」**가 참이다.
 * 없는 것을 「못 찾았다」로 말하면 교사가 id 를, 그리고 방금 끝낸 수업을 의심한다.
 *
 * **라우트를 남긴 까닭** — `components/classbot/live-broadcast-controls.tsx` 가 라이브 종료 알림의
 * 「검수」에서 이 주소로 보낸다. 그 컴포넌트는 지금 어느 화면에도 안 붙어 있지만 파일은 산다
 * (`../page.tsx` 머리주석에 나머지 둘과 함께 적어 뒀다). 지우면 그 자리가 Next 기본 404 로 떨어진다.
 */
export default function TeacherReplayDetailPage() {
  return (
    <TeacherPageShell
      backHref="/teacher/replay"
      backLabel="수업 리플레이"
      header={{
        eyebrow: { icon: History, text: '수업 리플레이' },
        title: '수업 한 건',
      }}
    >
      <section className="bg-card rounded-2xl border p-5">
        <EmptyState
          icon={History}
          title="이 수업 리플레이를 읽어 올 수 없어요"
          description="녹화한 수업과 그 핵심을 읽고 발송하는 길이 서버에 아직 없어요. 라이브 수업 자체가 준비 중이에요."
        />
      </section>
    </TeacherPageShell>
  );
}
