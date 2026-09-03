'use client';

import { useMemo } from 'react';
import { EyeOff, Lock, Share2, UserRound, UserRoundX } from 'lucide-react';

import BackLink from '@/components/classbot/back-link';
import { AlertCard } from '@/components/classbot/alert-card';
import { EmptyState } from '@/components/classbot/empty-state';
import { ReadErrorState } from '@/components/classbot/read-state';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyConsents, type ConsentItem } from '@/hooks/api/consents';
import { useHasServerIdentity } from '@/hooks/api/self-server';
import { ApiClientError } from '@/lib/api/client-fetch';
import { NEVER_SHARED, SHAREABLE_ITEMS } from './catalog';
import { ShareItem } from './share-item';

/**
 * 공유 — SCR 신설. 학생이 **자기 것을 내주는 이 앱의 유일한 자리**다.
 *
 * ## 왜 여기가 따로 한 화면인가
 *
 * 자기주도 학습에는 승인할 교사가 구조적으로 없다 — 학생이 스스로 고른 봇이기 때문이다
 * (계약 §0). 그 자리를 대신할 수 있는 사람은 학생 본인뿐이라 동의가 필수가 됐고,
 * 그렇다면 그 결정이 **어디서 일어나는지 학생이 찾을 수 있어야** 한다.
 *
 * `/classbot/me` 안의 한 단락으로 접어 넣지 않고 그 아래 제 주소를 준 이유:
 *  - 여기서 답해야 할 것이 **넷**이다 — 무엇을 · 누구에게 · 언제부터 · 언제까지.
 *    거기에 되돌릴 수 없다는 말과 안 나가는 것들의 목록까지 붙는다. 이걸 프로필 카드
 *    사이에 끼우면 가장 줄여도 되는 것처럼 보이는 글부터 줄어드는데, 그게 하필 경고문이다.
 *  - **끄러 오는 길이 켜러 오는 길과 같아야 한다.** 주소가 있으면 「공유 끄는 데」가
 *    한 곳으로 고정된다. 프로필 안 한 단락은 나중에 자리를 옮기기 쉽고, 옮겨지면
 *    학생은 껐다고 생각하고 못 찾는다.
 *  - `내 정보` 의 사이드 링크(학습 기록 · 주간 리포트)와 **같은 결**이다. 새 문법이 아니라
 *    이미 있는 자리에 한 칸 더 놓는 것이다.
 *
 * ## 신원이 없으면 데모로 떨어지지 않는다
 *
 * 담은 봇·공부한 날은 신원이 없을 때 localStorage 갈래로 간다. 여기는 **안 간다** —
 * 로컬에만 있는 동의는 아무에게도 권한을 주지 않으면서 학생에게는 준 것처럼 보인다.
 * 그래서 켤 수 없다고 적고 스위치를 그리지 않는다(훅 `hooks/api/consents.ts` ⛔).
 */

const RELATION_LABEL: Record<'mother' | 'father' | 'guardian', string> = {
  mother: '어머니',
  father: '아버지',
  guardian: '보호자',
};

export default function SharePage() {
  const hasServerIdentity = useHasServerIdentity();
  const consents = useMyConsents();

  // 서버가 401 을 주는 상태는 고장이 아니라 「아직 내 명의가 아님」이다 — 신원 없음과 같이 그린다.
  const isSignedOut =
    !hasServerIdentity ||
    (consents.error instanceof ApiClientError && consents.error.status === 401);

  // `null` 은 「연결된 보호자가 없다」 — 줄 상대가 없다는 뜻이라 공유 칸을 아예 안 그린다.
  const parent = consents.data?.parent ?? null;
  const relationLabel = parent ? RELATION_LABEL[parent.relation] : null;

  /** 타입 → 지금 살아 있는 동의. 없으면 안 켜진 것이다. */
  const byType = useMemo(() => {
    const map = new Map<string, ConsentItem>();
    for (const row of consents.data?.consents ?? []) map.set(row.type, row);
    return map;
  }, [consents.data]);

  return (
    <div className="space-y-5">
      <BackLink href="/classbot/me">내 정보</BackLink>

      <PageHeader
        eyebrow={{ icon: Share2, text: '공유' }}
        title="무엇을 보여드릴지 내가 정해요"
        description="내가 켠 것만 보여요. 켜지 않은 건 안 보이고, 켠 뒤에도 언제든 끌 수 있어요."
      />

      {isSignedOut ? (
        <div data-testid="share-signin">
          <EmptyState
            icon={Lock}
            title="지금은 공유를 켤 수 없어요"
            description="내 계정으로 들어와야 누구와 연결돼 있는지 확인할 수 있어요. 켜 둔 게 없으니 지금은 아무것도 안 보이는 상태예요."
          />
        </div>
      ) : consents.isError ? (
        <ReadErrorState onRetry={() => void consents.refetch()} />
      ) : consents.isPending ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          {/* ─── 누구에게 ─── */}
          <section>
            <SectionHeading
              title="보여드릴 사람"
              description="풀림에 연결된 보호자에게만 보낼 수 있어요. 내가 다른 사람을 고를 수는 없어요."
            />
            {parent === null ? (
              <div data-testid="share-no-parent">
                <EmptyState
                  icon={UserRoundX}
                  title="아직 연결된 보호자가 없어요"
                  description="연결된 분이 있어야 공유를 켤 수 있어요. 지금은 내 기록이 아무에게도 안 보이는 상태예요."
                />
              </div>
            ) : (
              <div
                className="bg-card flex items-center gap-3 rounded-2xl border p-4"
                data-testid="share-parent"
              >
                <span
                  className="bg-pullim-slate-100 text-pullim-slate-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  aria-hidden
                >
                  <UserRound className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-pullim-slate-900 text-sm font-bold">{parent.name}</p>
                  {/* 이름이 이미 「어머니」면 관계를 한 번 더 적지 않는다 — 같은 말이 두 줄이 된다. */}
                  <p className="text-pullim-slate-500 mt-0.5 text-2xs">
                    {relationLabel && relationLabel !== parent.name
                      ? relationLabel
                      : '풀림에 연결된 보호자예요.'}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* ─── 무엇을 ─── */}
          {parent !== null && (
            <section>
              <SectionHeading
                title="보여드릴 것"
                description="켠 것만 보여요. 하나씩 따로 켜고 끌 수 있어요."
              />
              <ul className="space-y-2">
                {SHAREABLE_ITEMS.map((item) => (
                  <ShareItem
                    key={item.type}
                    item={item}
                    consent={byType.get(item.type) ?? null}
                    parentName={parent.name}
                  />
                ))}
              </ul>
            </section>
          )}

          {/*
            ─── 열람 로그는 없다 ───
            학생은 「켜 두면 보러 오실 때 알림이 오겠지」라고 기대하기 쉽다. 그런 기록은
            없고, 만들 계획도 없다(계약 §3). 기대한 채로 켜게 두는 게 이 화면이 할 수 있는
            가장 나쁜 일이라 목록 **바로 아래**에 적는다 — 켜기 전에 읽는 자리다.
          */}
          <AlertCard
            tone="notice"
            icon={EyeOff}
            title="부모님이 언제 보셨는지는 알려드리지 않아요"
          >
            <p>
              누가 언제 열어 봤는지 남기는 기록은 없어요. 앞으로도 만들지 않을 거예요.
              켜 두는 동안 부모님은 아무 때나 보실 수 있고, 나는 그걸 알 수 없어요.
            </p>
            <p className="mt-2">켤지 말지는 이걸 알고 나서 정하면 돼요.</p>
          </AlertCard>

          {/* ─── 어떻게 해도 안 나가는 것 ─── */}
          <section>
            <SectionHeading
              title="이건 켤 수도 없어요"
              description="켜고 끄는 자리가 아예 없는 것들이에요. 공유를 켜도 따라가지 않아요."
            />
            <ul className="bg-pullim-slate-50 divide-pullim-slate-200 divide-y rounded-2xl px-4">
              {NEVER_SHARED.map(({ icon: Icon, label, note }) => (
                <li key={label} className="flex items-start gap-3 py-3">
                  <Icon
                    className="text-pullim-slate-400 mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-pullim-slate-900 text-xs font-bold">{label}</p>
                    <p className="text-pullim-slate-600 mt-0.5 text-2xs leading-relaxed">
                      {note}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
