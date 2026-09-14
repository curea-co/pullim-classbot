'use client';

import { useMemo } from 'react';
import { EyeOff, Lock, Share2, TriangleAlert, UserRound, UserRoundX } from 'lucide-react';

import BackLink from '@/components/classbot/back-link';
import { AlertCard } from '@/components/classbot/alert-card';
import { EmptyState } from '@/components/classbot/empty-state';
import { ReadErrorState } from '@/components/classbot/read-state';
import { PageHeader } from '@/components/shell/page-header';
import { SectionHeading } from '@/components/shell/section-heading';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyConsents, type ConsentItem } from '@/hooks/api/consents';
import { useServerIdentityState } from '@/hooks/api/self-server';
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
  const identity = useServerIdentityState();
  const consents = useMyConsents();

  /*
    서버가 401 을 주는 상태는 고장이 아니라 「아직 내 명의가 아님」이다 — 신원 없음과 같이 그린다.

    ## ⛔ `'pending'` 을 여기에 **넣지 마라**
    판정은 셋이고(`ServerIdentityState`), 「비로그인」으로 굳은 것은 `'demo'` 하나뿐이다.
    세션 복원 중(`'pending'`)을 여기 넣으면 로그인한 학생이 복원되는 수백 ms 동안
    **「지금은 공유를 켤 수 없어요」를 읽는다** — 이 화면이 「모를 때는 모른다고만 적는다」로
    정해 둔 바로 그 자리에서, 모르는 것을 「아니다」로 단정하는 셈이다.
    `'pending'` 은 아래 `consents.isPending` 갈래(스켈레톤)로 떨어진다 — 훅이 그동안
    요청을 내보내지 않으므로 쿼리가 대기 상태로 남는다(`hooks/api/consents.ts`).
  */
  const isSignedOut =
    identity === 'demo' ||
    (consents.error instanceof ApiClientError && consents.error.status === 401);

  /*
    `null` 은 「연결된 보호자가 없다」 — 새로 **켤** 상대가 없다는 뜻이다.
    그렇다고 목록을 통째로 접지는 않는다: 링크가 끊겨도 예전에 켠 동의는 살아 있을 수
    있고, 그때 목록이 없으면 학생이 그걸 **끄지 못한다**(아래 `shownItems`).
  */
  const parent = consents.data?.parent ?? null;
  const relationLabel = parent ? RELATION_LABEL[parent.relation] : null;

  /**
   * 타입 → 지금 살아 있는 동의. **받는 사람으로 두 갈래**로 나눠 담는다.
   *
   * 서버는 살아 있는 동의를 **전부** 준다 — 지금 보호자 것만 주면 옛 보호자에게 남은
   * 권한을 학생이 보지도 끄지도 못하게 된다(`app/api/me/consents/route.ts` GET 머리주석).
   * 그 대신 행마다 `toCurrentParent` 가 어디로 가는지를 말하므로, 화면은 그 칸으로
   * 「지금 보호자께 보여요」와 「다른 보호자께 아직 열려 있어요」를 갈라 그린다.
   * 한 갈래로 뭉쳐 담으면 옛 보호자 대상 행이 지금 보호자의 이름과 함께 그려진다 —
   * 이 화면이 낼 수 있는 가장 나쁜 종류의 거짓이다.
   *
   * 한 타입에 살아 있는 행이 둘이면 **나중에 준 것**이 남는다(응답이 준 순 오름차순이라
   * 뒤에 덮인다). 부여가 멱등이라 정상 경로로는 안 생기지만, 손으로 넣으면 생긴다 —
   * 실제로 한 번 그런 표를 봤다. 그때 한 줄을 둘로 그리는 것보다 「지금 유효한 약속」
   * 하나를 그리는 편이 맞다. 끄기는 어차피 그 타입의 살아 있는 행을 **전부** 거둔다.
   */
  const { current, elsewhere } = useMemo(() => {
    const current = new Map<string, ConsentItem>();
    const elsewhere = new Map<string, ConsentItem>();
    for (const row of consents.data?.consents ?? []) {
      (row.toCurrentParent ? current : elsewhere).set(row.type, row);
    }
    return { current, elsewhere };
  }, [consents.data]);

  /*
    이어진 보호자가 없어도 **끌 것이 남아 있으면 목록을 그린다.**

    링크가 끊겨도 동의 행은 남고, 링크가 되살아나면 열람도 되살아난다. 그때 「보호자가
    없으니 그릴 게 없다」로 접으면 학생은 그 줄을 끝내 못 끈다. 반대로 이어진 보호자가
    있으면 목록 전체를 그린다 — 아직 안 켠 줄도 켜는 자리가 있어야 하니까.
  */
  const shownItems =
    parent !== null
      ? SHAREABLE_ITEMS
      : SHAREABLE_ITEMS.filter((item) => elsewhere.has(item.type));
  const hasElsewhere = SHAREABLE_ITEMS.some((item) => elsewhere.has(item.type));

  /*
    **이 화면이 못 보는 동의도 살아 있을 수 있다.**

    `GET /api/me/consents` 는 타입으로 거르지 않는다(계약 `MyConsentRow`). 교사·기관
    승인 흐름이 넣은 동의(주간 리포트 등)는 여기 목록에 그려지지 않고 여기서 끌 수도
    없는데, 그렇다고 **없는 것은 아니다.** 그래서 「아무에게도 안 보이는 상태예요」처럼
    화면 밖까지 단정하는 문구는 이 값이 참일 때 쓰면 안 된다 — 세는 범위와 말하는 범위를
    같게 두는 규칙(`useShareSummary()` 와 같은 규칙)이 여기에도 걸린다.
  */
  const hasAnyLiving = (consents.data?.consents.length ?? 0) > 0;

  /**
   * 이어진 보호자가 없을 때 뭐라고 적을 것인가 — 아는 만큼만.
   *
   * 세 갈래인 이유는 **거짓이 되는 지점이 셋**이기 때문이다: 여기서 끌 수 있는 것이
   * 남아 있나 · 이 화면 밖의 동의가 살아 있나 · 정말 아무것도 없나.
   */
  const noParentDescription = hasElsewhere
    ? '연결된 분이 있어야 새로 켤 수 있어요. 그런데 예전에 켠 공유가 아직 남아 있어요 — 아래에서 끌 수 있어요.'
    : hasAnyLiving
      ? // 화면 밖 동의만 남은 상태. 「안 보인다」고 못 적는다 — 실제로 열려 있다.
        '연결된 분이 있어야 여기서 공유를 켤 수 있어요. 여기서 정하는 공유는 지금 켜 둔 게 없어요.'
      : '연결된 분이 있어야 공유를 켤 수 있어요. 지금은 내 기록이 아무에게도 안 보이는 상태예요.';

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
            /* 「켜 둔 게 없다」고 쓰지 않는다 — 신원이 없으면 서버에 묻지 않으므로 켜 둔 것이
               있는지 **모르는** 상태다. 꺼졌다고 단정하면 로그아웃한 학생이 공유가 이미
               멈춘 줄 안다. 동의 화면에서 가장 피해야 할 거짓이라 「모른다」로만 적는다. */
            description="내 계정으로 들어와야 누구와 연결돼 있는지, 무엇을 켜 뒀는지 확인할 수 있어요. 지금은 그걸 알 수 없어요."
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
                  /* 「아무에게도 안 보인다」고 단정하지 않는다 — 예전에 켠 것이나
                     이 화면 밖의 동의가 살아 있으면 사실이 아니다(위 `noParentDescription`). */
                  description={noParentDescription}
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
          {shownItems.length > 0 && (
            <section>
              <SectionHeading
                title="보여드릴 것"
                description={
                  parent !== null
                    ? '켠 것만 보여요. 하나씩 따로 켜고 끌 수 있어요.'
                    : '예전에 켜 둔 것이 아직 남아 있어요. 하나씩 따로 끌 수 있어요.'
                }
              />

              {/*
                다른 보호자에게 남은 공유가 있으면 **목록 위에** 적는다 — 줄마다 붙는
                글자는 그 줄을 읽어야 보이는데, 이건 화면에 들어오자마자 알아야 하는 사실이다.
                누구인지는 적지 않는다: 서버가 그 사람의 id·이름을 싣지 않고(계약
                `MyConsentRow.toCurrentParent`), 끄는 데도 필요 없다 — 철회는
                `(학생, 타입)` 기준이라 받는 사람과 상관없이 꺼진다.
              */}
              {hasElsewhere && (
                <AlertCard
                  tone="danger"
                  icon={TriangleAlert}
                  title="다른 보호자께 아직 열려 있는 공유가 있어요"
                  className="mb-3"
                >
                  <p>
                    지금 이어진 분이 아닌 다른 보호자께 예전에 켠 것이 아직 살아 있어요.
                    아래 목록에 빨갛게 표시해 뒀어요.
                  </p>
                  <p className="mt-2">
                    끄기는 항목별로 한 번에 이뤄져요 — 그 항목을 끄면 누구에게 열려 있었든
                    전부 함께 꺼져요.
                  </p>
                </AlertCard>
              )}

              <ul className="space-y-2">
                {shownItems.map((item) => (
                  <ShareItem
                    key={item.type}
                    item={item}
                    consent={current.get(item.type) ?? null}
                    elsewhere={elsewhere.get(item.type) ?? null}
                    parentName={parent?.name ?? null}
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
