'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarClock, Eye, EyeOff, TriangleAlert } from 'lucide-react';

import { AlertCard } from '@/components/classbot/alert-card';
import { RadioCard, RadioCardGroup } from '@/components/classbot/radio-card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import {
  useGrantConsent,
  useRevokeConsent,
  type ConsentItem,
  type ConsentScopeLabel,
} from '@/hooks/api/consents';
import { cn } from '@/lib/utils';
import type { ShareableItem } from './catalog';

/**
 * 공유 한 줄 — 켜고 · 언제까지인지 고르고 · 끄는 일이 전부 여기서 일어난다.
 *
 * ## 주는 것도 거두는 것도 **제자리에서 펼쳐진다**
 *
 * 범위 고르기도, 그만두기 확인도 모달이 아니라 카드 안에서 열린다. 까닭이 둘이다:
 *  - **읽히라고 쓴 글이다.** 모달은 바깥을 눌러 닫힌다 — 「지금까지 보여드린 건 되돌릴 수
 *    없어요」를 안 읽고 지나가는 길이 생긴다. 여기서는 그 글을 지나쳐야 버튼에 닿는다.
 *  - **주기와 거두기가 같은 모양이어야 한다.** 켤 때만 신중한 화면을 만들면 끄는 쪽이
 *    가벼워 보이고, 그 반대면 켜는 쪽이 가벼워 보인다. 둘 다 두 걸음이다.
 *
 * ## 기본 범위는 **가장 짧은 것**
 *
 * 안 읽고 눌러 넘긴 학생이 가장 적게 주도록 `이번 주만` 에서 시작한다. 「계속」을 기본으로
 * 두면 화면을 대충 넘긴 대가가 무기한 권한이 된다 — 기본값은 그런 식으로 정하지 않는다.
 * (이미 켜 둔 줄을 다시 열 때만 지금 범위를 그대로 물려받는다.)
 */

/** 범위 세 갈래 — 서버의 파생표와 **같은 글자**여야 한다(계약 §2). 늘리려면 서버가 먼저다. */
const SCOPE_OPTIONS: ReadonlyArray<{ label: ConsentScopeLabel; note: string }> = [
  { label: '계속', note: '내가 끌 때까지 보여요.' },
  { label: '이번 달만', note: '30일 뒤에 저절로 꺼져요.' },
  { label: '이번 주만', note: '7일 뒤에 저절로 꺼져요.' },
];

/** 안 읽고 넘긴 사람이 가장 적게 주도록 — 위 머리주석 참고. */
const DEFAULT_SCOPE: ConsentScopeLabel = '이번 주만';

/**
 * 서버가 준 범위 라벨을 고르기 칸에 되꽂을 수 있는가.
 *
 * 계약이 `scopeLabel` 을 `string` 으로 둔 것은 DB 가 `text` 이기 때문이지 아무 글자나
 * 온다는 뜻이 아니다. 그래도 **화면은 모르는 라벨을 만날 수 있다** — 서버가 네 번째 범위를
 * 먼저 내보내는 순간이 그렇다. 그때 억지로 캐스팅하면 어느 칸도 안 켜진 고르기 판이 뜨고
 * 학생은 자기가 뭘 골랐는지 모른 채 버튼을 누른다. 모르는 값이면 `null` 을 주고,
 * 부르는 쪽이 가장 짧은 기본값에서 다시 시작하게 한다.
 * @param value - 서버가 준 라벨
 * @returns 아는 라벨이면 그대로, 아니면 null
 */
function knownScope(value: string | undefined): ConsentScopeLabel | null {
  const match = SCOPE_OPTIONS.find((option) => option.label === value);
  return match ? match.label : null;
}

/**
 * 날짜 한 칸 — 「언제부터·언제까지」만 답하면 되므로 시각은 버린다.
 * 마켓 카드(`components/classbot/marketplace/format.ts`)와 **같은 눈금**을 쓴다 —
 * 한 앱 안에서 날짜가 두 가지 꼴로 적히면 같은 종류의 값인지 한 번 더 읽어야 한다.
 * @param value - ISO 문자열
 * @returns `2026년 9월 3일` 꼴. 못 읽으면 null(그 자리를 아예 안 그린다).
 */
function formatDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return null;
  return `${at.getFullYear()}년 ${at.getMonth() + 1}월 ${at.getDate()}일`;
}

export function ShareItem({
  item,
  consent,
  elsewhere = null,
  parentName,
}: {
  item: ShareableItem;
  /** 지금 보호자에게 가는 살아 있는 동의. 안 켜져 있으면 null. */
  consent: ConsentItem | null;
  /**
   * **다른 보호자**에게 아직 열려 있는 살아 있는 동의. 없으면 null.
   *
   * 주 보호자가 바뀌어도 옛 보호자 대상 동의는 그대로 유효하다(그 사정은
   * `app/api/me/consents/route.ts` GET 머리주석). 그 줄을 안 그리면 이 카드가
   * **「지금은 아무에게도 안 보여요」라고 거짓을 말한다** — 실제로는 열려 있는데.
   *
   * ⛔ 그 보호자가 **누구인지는 알 수 없고, 알려 주지도 않는다** — 서버가 id·이름을
   * 싣지 않는다(계약 `MyConsentRow.toCurrentParent`). 학생에게 필요한 것은
   * 「저쪽에도 열려 있다 · 여기서 끌 수 있다」 둘뿐이다.
   */
  elsewhere?: ConsentItem | null;
  /**
   * 보여드릴 사람 이름 — 버튼 글자에 들어간다(누구에게 주는지 손끝에서도 보이게).
   * 이어진 보호자가 없으면 `null` 이고, 그때는 켜는 버튼을 아예 그리지 않는다.
   */
  parentName: string | null;
}) {
  const [picking, setPicking] = useState(false);
  const [scope, setScope] = useState<ConsentScopeLabel>(DEFAULT_SCOPE);
  const [confirmingStop, setConfirmingStop] = useState(false);
  const pickPanelRef = useRef<HTMLDivElement>(null);
  const stopPanelRef = useRef<HTMLDivElement>(null);

  const grant = useGrantConsent();
  const revoke = useRevokeConsent();

  const isOn = consent !== null;
  // 끌 것이 있는가 — 지금 보호자든 다른 보호자든. 철회는 `(학생, 타입)` 기준이라
  // 한 번 누르면 **양쪽이 함께** 꺼진다(`app/api/me/consents/[type]/route.ts`).
  const hasLiving = isOn || elsewhere !== null;
  const Icon = item.icon;

  /*
    판이 열리면 초점을 그리로 옮긴다.

    고른 대로 두면 눌린 버튼이 **사라지는** 자리다(판이 그 버튼을 밀어내고 들어선다).
    초점이 사라진 요소에 남으면 낭독기는 문서 처음으로 되돌아가고, 학생은 방금 연 판을
    다시 찾아 내려와야 한다. 특히 그만두기 쪽은 그 판에 적힌 경고를 **먼저** 들어야 한다.
  */
  useEffect(() => {
    if (picking) pickPanelRef.current?.focus();
  }, [picking]);

  useEffect(() => {
    if (confirmingStop) stopPanelRef.current?.focus();
  }, [confirmingStop]);

  function openPicker() {
    // 이미 켜 둔 줄은 지금 범위를 물려받고, 처음 켜는 줄은 가장 짧은 것에서 시작한다.
    setScope(knownScope(consent?.scopeLabel) ?? DEFAULT_SCOPE);
    setConfirmingStop(false);
    grant.reset();
    setPicking(true);
  }

  function submitGrant() {
    grant.mutate(
      { type: item.type, scopeLabel: scope },
      { onSuccess: () => setPicking(false) },
    );
  }

  function submitRevoke() {
    revoke.mutate({ type: item.type }, { onSuccess: () => setConfirmingStop(false) });
  }

  /*
    상태 줄이 말하는 동의 — 지금 보호자 것이 있으면 그것, 없으면 다른 보호자 것.

    「없으면 안 그린다」로 두면 다른 보호자에게만 열려 있는 줄이 날짜도 범위도 없이
    남아, 학생이 **언제 켠 것인지 모른 채** 끄기만 하게 된다.
  */
  const showing = consent ?? elsewhere;
  const isElsewhereOnly = consent === null && elsewhere !== null;

  const grantedLabel = formatDay(showing?.grantedAt);
  const untilLabel = showing
    ? // `계속` 은 만료가 null 로 온다 — 없는 날짜를 지어내지 않고 뜻을 그대로 적는다.
      (formatDay(showing.expiresAt) ?? '내가 끌 때까지')
    : null;
  const untilSuffix = showing?.expiresAt ? '까지' : '';

  return (
    <li
      className="bg-card rounded-2xl border p-5"
      data-testid={`share-item-${item.type}`}
    >
      <div className="flex items-start gap-3">
        <span
          className="bg-pullim-slate-100 text-pullim-slate-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-pullim-slate-900 text-sm font-bold">{item.label}</h3>

          {/* 무엇이 나가는지 — 뭉뚱그리지 않고 칸을 하나씩 적는다. */}
          <ul className="text-pullim-slate-600 mt-1.5 space-y-0.5 text-2xs leading-relaxed">
            {item.fields.map((field) => (
              <li key={field} className="flex gap-1.5">
                <span aria-hidden>·</span>
                <span>{field}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ─── 지금 상태 ─── */}
      <div
        className={cn(
          'mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl px-3 py-2.5',
          isElsewhereOnly
            ? 'bg-pullim-danger-bg'
            : isOn
              ? 'bg-pullim-blue-50'
              : 'bg-pullim-slate-50',
        )}
        data-testid={`share-state-${item.type}`}
      >
        {isElsewhereOnly ? (
          <TriangleAlert className="text-pullim-danger h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : isOn ? (
          <Eye className="text-pullim-blue-600 h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <EyeOff className="text-pullim-slate-400 h-3.5 w-3.5 shrink-0" aria-hidden />
        )}
        <span
          className={cn(
            'text-xs font-bold',
            isElsewhereOnly
              ? 'text-pullim-danger'
              : isOn
                ? 'text-pullim-blue-700'
                : 'text-pullim-slate-600',
          )}
        >
          {isOn
            ? `${parentName}께 보여요`
            : isElsewhereOnly
              ? '다른 보호자께 아직 보여요'
              : '지금은 아무에게도 안 보여요'}
        </span>
        {showing && (
          <Chip tone={isElsewhereOnly ? 'danger' : 'info'}>{showing.scopeLabel}</Chip>
        )}
        {showing && (
          <span className="text-pullim-slate-500 basis-full text-2xs">
            {grantedLabel ? `${grantedLabel}부터` : '오늘부터'}
            {untilLabel ? ` · ${untilLabel}${untilSuffix}` : ''}
          </span>
        )}
        {/*
          다른 보호자에게 남은 줄은 **글자로 적는다.** 색만으로 말하면 그 상태가 있다는 것을
          모르는 학생에게는 그냥 다른 색 카드다. 누구인지는 적지 않는다 — 서버가 주지 않고,
          알려 주는 것이 이 화면의 일도 아니다(끄는 데 필요 없다).
        */}
        {elsewhere && (
          <span
            className="text-pullim-danger basis-full text-2xs leading-relaxed"
            data-testid={`share-elsewhere-${item.type}`}
          >
            {isOn
              ? '예전에 다른 보호자께 켠 것도 아직 살아 있어요. 끄면 둘 다 함께 꺼져요.'
              : '지금 이어진 분이 아닌 다른 보호자께 예전에 켠 것이 아직 살아 있어요. 여기서 끄면 그것도 꺼져요.'}
          </span>
        )}
      </div>

      {/* ─── 범위 고르기 ─── 이어진 보호자가 없으면 줄 상대가 없어 판도 열리지 않는다 */}
      {picking && parentName !== null ? (
        <div
          ref={pickPanelRef}
          tabIndex={-1}
          role="group"
          aria-label={`${item.label} 공유 범위 고르기`}
          className="border-pullim-blue-200 mt-3 rounded-xl border p-4 outline-none"
        >
          <div className="flex items-center gap-1.5">
            <CalendarClock className="text-pullim-blue-600 h-3.5 w-3.5" aria-hidden />
            <h4 className="text-pullim-slate-900 text-sm font-bold">
              언제까지 보여드릴까요?
            </h4>
          </div>

          <RadioCardGroup
            ariaLabel={`${item.label}을 언제까지 보여드릴지 고르기`}
            cols={3}
            // 좁은 화면에서는 **한 줄에 하나**로 편다. `cols={3}` 의 기본 좁은 화면 값은
            // 2열이라 셋 중 하나가 둘째 줄에 홀로 남는데, 그 자리에 놓인 값이 하필 기본값
            // (`이번 주만`)이라 남은 하나가 다른 종류의 선택지처럼 보인다.
            className="mt-3 grid-cols-1 sm:grid-cols-3"
          >
            {SCOPE_OPTIONS.map((option) => (
              <RadioCard
                key={option.label}
                active={scope === option.label}
                onSelect={() => setScope(option.label)}
                title={option.label}
                description={option.note}
                size="sm"
              />
            ))}
          </RadioCardGroup>

          {/* 만료는 서버가 짓는다(훅 머리주석 ⛔) — 화면은 고른 뒤에 받아 적을 뿐이다. */}
          <p className="text-pullim-slate-500 mt-2.5 text-2xs leading-relaxed">
            며칠까지인지는 켠 뒤에 이 자리에 날짜로 적혀요. 기간이 끝나면 내가 아무것도 안
            해도 저절로 꺼져요.
          </p>

          {grant.isError && (
            <p className="text-pullim-danger mt-2 text-2xs" role="alert">
              {grant.error.message}
            </p>
          )}

          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              size="touch"
              onClick={() => setPicking(false)}
              disabled={grant.isPending}
            >
              안 할래요
            </Button>
            <Button
              variant="pullim"
              size="touch"
              onClick={submitGrant}
              disabled={grant.isPending}
              data-testid={`share-confirm-${item.type}`}
            >
              {grant.isPending
                ? '보내는 중…'
                : isOn
                  ? '범위 바꾸기'
                  : `${parentName}께 보여드리기`}
            </Button>
          </div>
        </div>
      ) : confirmingStop ? (
        /* ─── 그만두기 확인 — 여기 적힌 글이 이 화면에서 가장 중요한 글이다 ─── */
        <div
          ref={stopPanelRef}
          tabIndex={-1}
          role="group"
          aria-label={`${item.label} 공유를 그만둘지 확인`}
          className="mt-3 outline-none"
          data-testid={`share-stop-confirm-${item.type}`}
        >
          <AlertCard tone="danger" icon={TriangleAlert} title="그만 보여드릴까요?">
            <p className="text-pullim-slate-900 text-xs font-bold">
              지금까지 보여드린 건 되돌릴 수 없어요. 오늘부터 안 보이게 돼요.
            </p>
            <p className="mt-2">
              부모님이 이미 보신 것, 찍어 두신 화면, 기억에 남은 것까지 되돌릴 수는 없어요.
              지금 열어 두신 화면에는 잠깐 더 남아 있을 수도 있고요. 끄면 그다음부터 새로
              보이지 않게 되는 거예요.
            </p>
            {/* 받는 사람이 여럿일 수 있다는 사실을 **끄기 직전**에 적는다 — 끄면 어디까지
                꺼지는지 모르고 누르면, 남아 있는 쪽을 껐다고 착각한다. */}
            {elsewhere && (
              <p className="text-pullim-slate-900 mt-2 text-xs font-bold">
                다른 보호자께 남아 있던 것도 함께 꺼져요. 이 항목은 아무에게도 안 보이게 돼요.
              </p>
            )}

            {parentName !== null && (
              <p className="mt-2">다시 보여드리고 싶어지면 언제든 여기서 다시 켤 수 있어요.</p>
            )}

            {revoke.isError && (
              <p className="text-pullim-danger mt-2 font-bold" role="alert">
                {revoke.error.message}
              </p>
            )}

            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                size="touch"
                onClick={() => setConfirmingStop(false)}
                disabled={revoke.isPending}
              >
                그대로 둘래요
              </Button>
              <Button
                variant="pullim-danger"
                size="touch"
                onClick={submitRevoke}
                disabled={revoke.isPending}
                data-testid={`share-stop-${item.type}`}
              >
                {revoke.isPending ? '끄는 중…' : '그만 보여드리기'}
              </Button>
            </div>
          </AlertCard>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {parentName !== null && (
            <Button
              variant={isOn ? 'outline' : 'pullim'}
              size="touch"
              onClick={openPicker}
              data-testid={`share-open-${item.type}`}
            >
              {isOn ? '범위 바꾸기' : `${parentName}께 보여드리기`}
            </Button>
          )}
          {/*
            끄기는 **살아 있는 줄이 하나라도 있으면** 그린다 — 지금 보호자 것이 없어도
            다른 보호자에게 남아 있으면 끌 것이 있다. `isOn` 으로만 그리면 그 줄이 화면에
            보이는데 끄는 버튼이 없는 상태가 된다.
          */}
          {hasLiving && (
            // 끄기는 범위 바꾸기와 **같은 무게**로 그린다. 흐리게 두면 되돌리는 길이 덜
            // 열린 것처럼 보이고, 빨갛게 두면 「그러면 안 되는 일」처럼 보인다 — 켠 것을
            // 다시 끄는 건 잘못이 아니라 이 화면이 약속한 일이다.
            <Button
              variant="outline"
              size="touch"
              onClick={() => {
                revoke.reset();
                setConfirmingStop(true);
              }}
              data-testid={`share-stop-open-${item.type}`}
            >
              그만 보여드리기
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
