'use client';

import { useState } from 'react';
import {
  Bot, ChevronDown, ChevronUp, KeyRound, Plus, School, Users, X,
} from 'lucide-react';
import { AlertCard } from '@/components/classbot/alert-card';
import { EmptyState } from '@/components/classbot/empty-state';
import { SectionHeading } from '@/components/shell/section-heading';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeacherClassrooms } from '@/hooks/api/classroom';
import type { TeacherClassroomItem } from '@/hooks/api/types';
import { ClassroomRoster } from './classroom-roster';
import { CreateClassroomForm, type CreatedClassroom } from './create-classroom-form';
import { JoinCodeBlock } from './join-code-block';
import { PublishBotBlock } from './publish-bot-block';

/**
 * 내 수업방 — 반을 열고, 참여 코드를 건네고, 들어온 학생을 본다.
 *
 * 이 화면이 하는 일은 **참여 코드를 손에 쥐여 주는 것** 하나다. 반 목록·학생 명단도
 * 그 코드가 통했는지를 보여 주려고 있다 — 그래서 카드마다 가장 큰 글자가 코드다.
 *
 * 데이터는 전부 DB 다(`/api/teacher/classrooms`). mock 카탈로그를 섞지 않는다 —
 * 참여 코드는 진짜 반에만 붙고, 가짜 반에 붙은 코드는 학생이 넣어도 안 열린다.
 */
export function ClassroomWorkspace() {
  const query = useTeacherClassrooms();
  const [formOpen, setFormOpen] = useState(false);
  const [created, setCreated] = useState<CreatedClassroom | null>(null);

  if (query.isError) {
    return (
      <AlertCard tone="danger" icon={KeyRound} title="수업방을 불러오지 못했어요">
        <p className="text-pullim-slate-700 text-sm" data-testid="classroom-error">
          {query.error.message}
        </p>
      </AlertCard>
    );
  }

  const rooms = query.data?.classrooms ?? [];
  // 방이 하나도 없으면 폼이 곧 이 화면의 본문이다 — 접어 두면 여기서 할 수 있는 일이 없다.
  const showForm = formOpen || (!query.isPending && rooms.length === 0);

  return (
    <>
      {/*
        갓 만든 수업방 — 코드가 나온 그 순간이 교사가 코드를 건네는 순간이다.
        아래 목록에도 같은 코드가 있지만, 방이 여럿이면 새로 난 코드가 어느 카드인지 찾아야 한다.
      */}
      {created && (
        <AlertCard tone="info" icon={KeyRound} title={`${created.label} — 수업방을 열었어요`}>
          <p className="text-pullim-slate-700 text-sm">
            이 코드를 학생에게 알려주세요. 학생이 코드를 넣으면 바로 이 반에 들어와요.
          </p>
          <div className="mt-3">
            <JoinCodeBlock classroomId={created.classroomId} code={created.joinCode} size="lg" />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCreated(null)}
            className="text-pullim-slate-600 hover:text-pullim-slate-900 mt-3"
          >
            <X />
            닫기
          </Button>
        </AlertCard>
      )}

      <section>
        <SectionHeading
          title={query.isPending ? '내 수업방' : `내 수업방 ${rooms.length}개`}
          description="참여 코드를 알려주면 학생이 그 반으로 들어와요."
          action={
            rooms.length > 0 ? (
              <Button
                type="button"
                variant={formOpen ? 'ghost' : 'pullim'}
                onClick={() => setFormOpen((open) => !open)}
                aria-expanded={formOpen}
                data-testid="classroom-create-toggle"
              >
                {formOpen ? <X /> : <Plus />}
                {formOpen ? '그만두기' : '수업방 만들기'}
              </Button>
            ) : undefined
          }
        />

        {query.isPending ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-hidden>
            <Skeleton className="h-56 w-full rounded-2xl" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState
            icon={School}
            title="아직 연 수업방이 없어요"
            description="아래에서 반을 열면 참여 코드가 함께 나와요. 그 코드를 학생에게 알려주면 돼요."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2" data-testid="classroom-list">
            {rooms.map((room) => (
              <RoomCard key={room.classroomId} room={room} />
            ))}
          </ul>
        )}
      </section>

      {showForm && <CreateClassroomForm onCreated={(next) => { setCreated(next); setFormOpen(false); }} />}
    </>
  );
}

/**
 * 수업방 한 칸 — 무엇을 담나: 반 정체(이름·소속·과목·학년·봇) · 참여 코드 · 봇 마켓 공유 · 참여 학생.
 * 코드는 카드 안에서 제 상자를 갖는다. 다른 값과 같은 줄에 두면 그냥 또 하나의 값이 된다.
 *
 * 카드 안 순서는 **이 반이 밖으로 열리는 정도**를 따른다: 참여 코드(내가 부른 학생만) →
 * 봇 마켓(누구나 둘러봄) → 학생 명단(이미 들어온 사람). 공유 칸이 코드 바로 아래인 이유가 그것이다.
 */
function RoomCard({ room }: { room: TeacherClassroomItem }) {
  const [rosterOpen, setRosterOpen] = useState(false);

  return (
    <li className="bg-card rounded-2xl border p-5" data-testid={`classroom-card-${room.classroomId}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-pullim-slate-900 text-sm font-bold">{room.label}</h3>
          <p className="text-pullim-slate-500 mt-0.5 text-2xs">{room.organization}</p>
        </div>
        <Chip tone="neutral" className="shrink-0">
          <Users aria-hidden />
          <span>
            <span className="sr-only">참여 학생 </span>
            {room.studentCount}명
          </span>
        </Chip>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {room.subject && <Chip tone="info">{room.subject}</Chip>}
        {room.grade && <Chip tone="outline">{room.grade}</Chip>}
        {room.botName && (
          <Chip tone="outline">
            <Bot aria-hidden />
            <span>
              <span className="sr-only">봇 </span>
              {room.botName}
            </span>
          </Chip>
        )}
      </div>

      <div className="border-pullim-blue-200 bg-pullim-blue-50 mt-4 rounded-xl border p-4">
        <JoinCodeBlock classroomId={room.classroomId} code={room.joinCode} />
      </div>

      {/*
        공유는 반이 아니라 **봇**에 거는 일이라 봇이 없는 빈 반에는 이 칸이 없다.
        (`botId` 가 null 인 반은 참여 행도 코드도 없는 껍데기다 — 계약 타입 주석 참조.)
      */}
      {room.botId && (
        <PublishBotBlock
          botId={room.botId}
          botName={room.botName}
          isPublished={room.isPublished}
          publishedAt={room.publishedAt}
          publishBlurb={room.publishBlurb}
        />
      )}

      <div className="mt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setRosterOpen((open) => !open)}
          aria-expanded={rosterOpen}
          className="text-pullim-slate-600 hover:text-pullim-slate-900"
          data-testid={`classroom-roster-toggle-${room.classroomId}`}
        >
          {/* 인원수는 위 칩이 이미 말한다 — 이 버튼은 「명단을 여닫는다」만 말한다 */}
          <Users />
          학생 명단
          {rosterOpen ? <ChevronUp /> : <ChevronDown />}
        </Button>

        {rosterOpen && <ClassroomRoster classroomId={room.classroomId} label={room.label} />}
      </div>
    </li>
  );
}
