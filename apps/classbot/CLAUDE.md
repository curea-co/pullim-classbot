@AGENTS.md

# apps/classbot — 풀림 클래스봇 앱 가이드

이 앱은 **풀림 스터디 데모(`260506 pullim-study-demo`)** 에서 **풀림 클래스봇 도메인만** 떼어 낸 추출본입니다. 모노레포로 옮겨오면서 `src/`는 사라지고 `apps/classbot/` 직속 구조가 됐습니다.

원본의 6 도메인(스튜디오/스토어/플래너/Q/클래스봇/라이브러리) 중 **클래스봇만 살아 있고**, 나머지 도메인의 페이지·컴포넌트·mock·라우트는 모두 제거됐습니다. 사이드바·하단탭·역할 전환(GNB)도 클래스봇/빌더 라우트만 노출하도록 좁혀져 있습니다.

루트 모노레포 가이드는 [/CLAUDE.md](../../CLAUDE.md), 도메인 권위는 [`input/docs-archive/07_풀림_클래스봇_핸드오프.md`](../../input/docs-archive/07_풀림_클래스봇_핸드오프.md).

## 1. 살아 있는 영역 (apps/classbot/ 직속)

| 구분 | 경로 | 비고 |
|---|---|---|
| 학생 라우트 | `app/(student)/classbot/{,chat,discover,replay,replay/[id],onboarding}` | 5 페이지 + 동적 1 |
| 학생 루트 | `app/(student)/page.tsx` | `/classbot`로 즉시 redirect — 6 도메인 홈은 사라짐 |
| 교사 라우트 | `app/(teacher)/teacher/{,classbot,builder}` | 홈/내 클래스봇/봇 빌더 3 페이지 |
| 도메인 컴포넌트 | `components/classbot/*`, `components/builder/*` | 13 파일 |
| 공유 셸 | `components/shell/*` | Role = `student | teacher` (parent 분기 제거, CoachFab 제거) |
| 공유 UI (shadcn) | `components/ui/*`, `components/brand/*` | shadcn 프리미티브 |
| 도메인 mock | `lib/mock/{persona,family,tutor,classbot,chat}.ts` | 잔존 — Phase β 이후 DB 로 점진 대체 |
| Drizzle 스키마 | `lib/db/schema.ts` | classbot 도메인 테이블 |
| 토큰 / 유틸 | `lib/tokens/*`, `lib/utils.ts` | |
| Drizzle 마이그레이션 | `drizzle/` | 0000_stiff_ulik.sql + meta |

## 2. 사라진 영역 (작업 시 의식할 것)

다음은 **이 앱에 존재하지 않습니다.** 클래스봇 안에서 다른 도메인을 참조하는 코드를 새로 쓰지 말 것:

- 플래너 / Q(무한풀기·코치·분석·복습) / 라이브러리 / 스튜디오 / 스토어 페이지·컴포넌트
- 보호자 영역(`(parent)/parent/*`), `currentParent` UI 분기 (mock의 `family.ts`는 type만 살려둠)
- `lib/mock/{features,domains,planner,coach,tutor 본체,conqueror,infinity,memory,irt,xray,visual,phase1(채팅 외),subscriptions,billing,parent-notifications}`
- `components/{planner,planner-builder,planner-manage,infinity,coach,tutor,conqueror,memory,study-index,xray,visual,parent,study}` — 학생 홈 카드 위젯(`study/*`)도 함께 제거됨
- 공유 셸 중 `coach-fab.tsx` — `/q/talk` 의존 → 삭제

## 3. UI · 도메인 컨벤션

- **UI 소스는 3레인으로 갈린다** — 아래 [§ 3.1 PUDS 레인 판별표](#31-puds-디자인-시스템--3레인-판별표) 가 권위.
  요지: 토큰·셸은 **PUDS 원격에서 벤더링**, 프리미티브는 **로컬 base-ui**, 나머지는 서비스 고유.
  npm DS **패키지**(`@pullim/design-system` 등)를 dependency 로 추가하는 건 여전히 **금지**다 —
  PUDS 는 패키지가 아니라 `shadcn add` 로 소스를 복사해 오는 방식이라 이 금지와 충돌하지 않는다.
  다만 **복사돼 오는 소스가 npm 의존을 끌고 올 수는 있다** — 새 아이템은 들이기 전에
  ① target 충돌 ② **이 앱의 `package.json` 에 없는 npm 의존성** — **둘 다** 확인한다
  ([§ 3.1 설치 전 확인](#설치-전-확인--검사는-둘이다)).
  **금지만 읽고 「PUDS 는 못 쓴다」로 읽지 마라** — 충돌 없이 들일 수 있는 것이
  [§ 3.1 전수 판정](#무엇을-들일-수-있는가--전수-판정)에 있고, 들인 뒤 값을 어디서 맞추는지는
  [§ 3.1 조정 사다리](#세부-값은-어디서-조정하는가--조정-사다리)에 있다.
- **i18n 미도입** — 한글 하드코딩 OK. `useTranslations` 같은 호출 추가 금지
- **Sentry 미도입** — 에러 추적 라이브러리 추가 금지
- **drizzle ORM** — `lib/db/` 에서 스키마·쿼리. `drizzle.config.ts` 는 `apps/classbot/` 직속
- **mock 잔존** — `lib/mock/*` 가 데이터 권위. BE entity 와 동기화는 Phase β 이후 점진적
- **import alias** — `@/*` → `apps/classbot/*` (모노레포 root 아님, 이 앱 root)

### 3.1 PUDS 디자인 시스템 — 3레인 판별표

[PUDS](https://github.com/curea-co/pullim-design-system)(풀림 통합 디자인 시스템)를 **버전 고정 URL** 로
쓴다. `shadcn add` 는 npm 의존이 아니라 **소스를 이 리포로 복사(벤더링)** 하므로, 받아 온 파일은
그때부터 이 리포에 커밋된 우리 소스다. 그래서 **어느 파일이 어느 레인인지**가 곧 규칙이다.

| 레인 | 파일 | 출처 | 로컬 수정 |
|---|---|---|---|
| **1. PUDS 원격** | 아래 목록 | `shadcn add @puds/*` | **금지** |
| **2. 로컬 base-ui 프리미티브** | `components/ui/*` 중 레인 1 이 아닌 전부 | 이 리포 | 자유 (단 PUDS 프리미티브로 **교체 금지**) |
| **3. 서비스 고유** | 그 밖의 전부 | 이 리포 | 자유 |

#### 레인 1 — PUDS 원격에서 받는 것 (로컬 수정 금지)

```
app/tokens/_base.css            app/tokens/pullim-os.css
app/tokens/_animations.css      app/tokens/pullim-jr.css     ← 설치만, import 안 함(아래 주의)
components/ui/dashboard-shell.tsx    components/ui/os-rail.tsx
components/ui/os-tabbar.tsx          components/ui/rail-collapse-context.tsx
components/ui/page-header.tsx        components/ui/breadcrumb.tsx
components/ui/service-switcher.tsx   components/ui/service-icon.tsx
components/ui/skip-link.tsx
lib/cn.ts
```

**이 파일들을 직접 고치지 마라.** 재설치가 조용히 덮어쓴다. 고쳐야 할 이유가 생기면 둘 중 하나다:
1. **prop 으로 해결한다** — 앱이 넘기는 prop 은 재설치에 안전하다
   (예: `AppShell` 의 `collapsed={false}` + `hideToggle`).
2. **PUDS 에 역상신한다** — 상류에서 고치고 버전을 올려 받는다.
   (`hideToggle` 은 원래 이 리포의 로컬 포크였다가 v0.2.0 에서 상류로 올라간 사례다.
   `page-header` 의 breadcrumb import 도 v0.2.0 에선 로컬 한 줄 패치였다가 v0.3.0 에서 상류가 같은 형태로 고쳐,
   재설치만으로 패치가 사라졌다.)

레인 1 파일을 감싸는 얇은 어댑터를 **레인 3에** 두는 건 괜찮다 —
`components/shell/app-shell.tsx` 가 그 예다.

> ⚠ **`_animations.css` 와 `pullim-jr.css` 는 설치되지만 `globals.css` 에서 import 하지 않는다.**
> 이유는 `app/globals.css` 상단 주석에 적어 뒀다(각각 `tw-animate-css` 와의 `@utility` 이름 충돌,
> 그리고 이 앱이 `pullim-os` 테마 하나만 쓴다는 것). 지우지 말고 import 하지도 마라.

#### 레인 2 — 로컬 base-ui 프리미티브 (PUDS 프리미티브로 교체 금지)

`components/ui/` 의 나머지(`button` · `dialog` · `dropdown-menu` · `sheet` · `tooltip` ·
`tabs` · `input` · `select` 계열 등)는 **`@base-ui/react` 엔진**이다.

> ⚠ **옛 판별법 「Radix 를 무는가」는 PUDS v0.5.0(2026-08-28)에 죽었다.** PUDS 가 `@radix-ui/*`
> 24개와 `cmdk` 를 전부 걷어내 **이제 양쪽 다 `@base-ui/react`** 다. v0.4.2 까지는 레지스트리
> 93 아이템 중 **29개**가 Radix·cmdk 를 물었고(겹치는 16종 중 12종), 그래서 「Radix 를 무는가」
> 가 판별 기준이었다. v0.5.0 에서 그 수는 **0** 이다 —
> **그 검사를 지금 돌리면 전부 통과한다. 막던 것을 전부 통과시킨다.**
>
> 무엇이 죽고 무엇이 남았는지 셋으로 갈라 둔다. **하나를 지우면서 나머지 둘까지 같이 지우지 마라:**
>
> | | 상태 |
> |---|---|
> | ⑴ 「엔진이 갈린다」 — Radix vs base-ui 라서 금지한다 | **죽었다.** v0.5.0 부터 양쪽 다 `@base-ui/react` 다 |
> | ⑵ 「덮어쓰기다」 — 같은 경로를 통째로 갈아치워 이 리포의 수정이 말없이 사라진다 | **살아 있다.** 아래 검사 ① 이 이걸 본다 |
> | ⑶ 「의존성을 본다」 — 아이템이 끌고 오는 npm 패키지를 확인한다 | **살아 있다.** 죽은 것은 **대상이 `@radix-ui/*` 하나뿐이었던 것**이지 의존성 검사 자체가 아니다. 대상을 **「이 앱에 아직 없는 패키지 전부」로 넓혀** 아래 검사 ② 로 남긴다 |
>
> **⑶ 을 지우면 판정이 반대 방향으로 fail-open 한다.** 「target 이 안 겹치니 들여도 된다」인데
> 새 npm 패키지를 끌고 오는 아이템이 실재한다 — 아래 `data-table` 실측이 그 자리다.

**금지는 그대로다. 근거가 ⑴ 에서 ⑵ 로 옮겨 갔을 뿐이다.** `shadcn add @puds/button` 같은 명령은 머지가 아니라
**덮어쓰기**다. 실행하면:
- 같은 파일 경로(`components/ui/button.tsx`)를 PUDS 판으로 통째로 갈아치운다 —
  **이 리포가 그 파일에 넣어 둔 수정이 아무 말 없이 사라진다.** 이게 살아 있는 근거다.
- 공개 API 가 달라 호출부가 **즉시 깨진다.** 실측(v0.5.0 `button` vs 로컬 `components/ui/button.tsx`):
  PUDS 판의 variant prop 은 `intent`(primary·secondary·outline·ghost·danger)인데 로컬은
  `variant`(default 등)이고, PUDS 판은 `buttonVariants` 를 **export 하지 않는다** —
  `components/classbot/coming-soon-button.tsx:7` 이 그 타입을 import 하고 있다.
- import 경로도 갈린다. PUDS 판은 `@/lib/cn`, 로컬 프리미티브 16종은 `@/lib/utils` 를 읽는다.
- PUDS 판은 치수를 PUDS 스케일(`--radius-*` · `--text-<size>`)로 읽으므로(아래 레인 3)
  갈아치우면 그 컴포넌트만 다른 치수로 그려진다.

**`badge` · `card` · `input` · `skeleton` 도 예외가 아니다.** 예전엔 「Radix 를 물지 않는 넷」
이라 예외처럼 보였지만 **그 구분 자체가 없어졌다.** 덮어쓴다는 사실만 남고, 그 사실은 16종 전부에 같다.

그래서 **레인 2 파일 이름과 겹치는 PUDS 아이템은 설치하지 않는다.** 겹치는 것 **16개**:
`avatar` · `badge` · `button` · `card` · `dialog` · `dropdown-menu` · `input` · `label` ·
`progress` · `scroll-area` · `separator` · `sheet` · `skeleton` · `slider` · `tabs` ·
`tooltip`.
나머지 레인 2 파일(`chip` · `meta-row` · `sonner` · `textarea`)은 **PUDS 에 대응 아이템이
아예 없다** — 겹칠 일이 없다.

##### 설치 전 확인 — 검사는 **둘**이다

새 PUDS 아이템을 들일 때 확인할 것은 둘이고, **어느 하나가 다른 하나를 대신하지 못한다.**

| | 무엇을 보는가 | 걸리면 |
|---|---|---|
| **①** | `files[].target` 이 **이미 있는 파일**을 가리키는가 | 레인 2 를 덮으면 들이지 않는다 |
| **②** | **`apps/classbot/package.json` 에 선언되지 않은 npm 패키지**를 끌고 오는가 | 새 의존이면 들이기 전에 보고한다 |

둘 다 **전이 의존(`registryDependencies`)을 재귀로 펼친 뒤** 봐야 한다. 두 단계를 타고
내려가 레인 2 파일을 덮거나 새 패키지를 끌고 오는 아이템이 **양쪽 다 실재한다**(아래 실측).

```bash
cd apps/classbot
PUDS=https://pullim-design-system.vercel.app/v/0.5.1   # components.json 과 같은 버전을 쓸 것
ITEM=combobox                                          # ← 들이려는 아이템 이름. 여기만 바꾼다
```

> 아이템 이름을 `<name>` 같은 꺾쇠 자리표시자로 두지 마라. `<` 와 `>` 는 셸의 리다이렉션이라
> **복사해 붙이면 구문 오류로 아예 실행되지 않는다** — `bash -n` 도 `zsh -n` 도
> ``syntax error near unexpected token `|'`` 를 낸다. 아래 두 블록은 위 `ITEM` 을 그대로 읽으므로
> **환경 블록 → ① → ② 순서로 붙여 넣으면 그대로 돈다.**

> ⛔ **큐를 `set -- $q` 로 돌리지 마라 — zsh 에서 전이 확장이 조용히 죽는다.**
> zsh 는 따옴표 없는 `$q` 를 **단어 분할하지 않는다**(bash 는 한다). 그래서 큐가 두 개 이상이 되는
> 순간 `n` 이 `" cn rail-collapse-context"` 같은 **한 덩어리**가 되고, `curl` 이 그 URL 을 거부해
> **빈 응답**을 돌려주고, 빈 입력을 받은 `jq` 는 **에러 없이 종료 0** 이다.
> 결과는 **에러 한 줄 없이 깊이 1 에서 멈춘 판정**이다 — 이 문서가 ② 아래에서 경고하는
> `jq: parse error` 조차 안 난다.
>
> macOS 기본 셸이 zsh 라 이게 기본값이다. 실측(2026-08-31, `set -- $q` 판):
>
> | | bash | zsh |
> |---|---|---|
> | ① `sidebar` | 3 줄 (`sidebar` · `cn` · `rail-collapse-context`) | **1 줄** — 전이 2 개가 사라진다 |
> | ② `combobox` | 5 줄 | **0 줄** — 「걸린 게 없다」로 읽힌다 |
>
> 위 블록은 `read -r n q <<< "$q"` 로 고쳐 두 셸에서 **같은 출력**을 내는 것을 확인했다.
> 아래 실측 출력은 그 판으로 bash·zsh 양쪽에서 재현된다.

**① `files[].target` 충돌**

```bash
puds_targets() {          # 전이 의존까지 펼쳐 target 을 전부 뽑는다
  local q="$*" seen="" n j
  while [ -n "$q" ]; do
    read -r n q <<< "$q"     # 큐에서 하나. `set -- $q` 로 쓰지 마라 — 위 ⛔ 주의
    [ -z "$n" ] && continue
    case " $seen " in *" $n "*) continue ;; esac
    seen="$seen $n"
    j=$(curl -s "$PUDS/$n.json")
    printf '%s' "$j" | jq -r --arg n "$n" '.files[].target + "\t" + $n'
    q="$q $(printf '%s' "$j" | jq -r '(.registryDependencies // [])[] | sub("^@puds/";"")' | tr '\n' ' ')"
  done
}

puds_targets "$ITEM" | while IFS=$'\t' read -r target from; do
  [ -e "$target" ] && echo "덮어씀   $target  ← @puds/$from" || echo "새 파일   $target  ← @puds/$from"
done
```

**`덮어씀` 이 레인 1 파일(`lib/cn.ts` · `app/tokens/*` · 위 셸 9종) 밖에 하나라도 찍히면
들이지 않는다.** 레인 1 은 원래 벤더링이 덮는 자리라 거기 찍히는 건 정상이다.

**② 이 앱에 선언되지 않은 npm 의존성**

```bash
puds_deps() {             # 전이 의존까지 펼쳐 npm dependencies 를 전부 뽑는다
  local q="$*" seen="" n j
  while [ -n "$q" ]; do
    read -r n q <<< "$q"     # 큐에서 하나. `set -- $q` 로 쓰지 마라 — 위 ⛔ 주의
    [ -z "$n" ] && continue
    case " $seen " in *" $n "*) continue ;; esac
    seen="$seen $n"
    j=$(curl -s "$PUDS/$n.json")
    printf '%s' "$j" | jq -r --arg n "$n" '(.dependencies // [])[] + "\t" + $n'
    q="$q $(printf '%s' "$j" | jq -r '(.registryDependencies // [])[] | sub("^@puds/";"")' | tr '\n' ' ')"
  done
}

# 「선언됨」 판정은 **이 앱의 package.json 하나만** 본다. 루트·락파일은 따로 등급을 준다
app=$(jq -r '(.dependencies // {}) + (.devDependencies // {}) | keys[]' package.json | sort -u)
root=$(jq -r '(.dependencies // {}) + (.devDependencies // {}) | keys[]' ../../package.json | sort -u)
locked=$(grep -oE '^    "[^"]+": \[' ../../bun.lock | sed 's/^    "//; s/": \[$//' | sort -u)

puds_deps "$ITEM" | sort -u | while IFS=$'\t' read -r dep from; do
  pkg=$(printf '%s' "$dep" | sed -E 's#^(@[^@/]+/[^@]+|[^@]+)@.+$#\1#')   # 레지스트리는 `pkg@1.2.3` 표기도 허용한다
  if   printf '%s\n' "$app"    | grep -qxF "$pkg"; then s="선언됨   "
  elif printf '%s\n' "$root"   | grep -qxF "$pkg"; then s="루트에만 "
  elif printf '%s\n' "$locked" | grep -qxF "$pkg"; then s="락파일뿐 "
  else                                                   s="없음     "; fi
  echo "$s $dep  ← @puds/$from"
done
```

**`선언됨` 이 아닌 것이 하나라도 찍히면 들이기 전에 보고한다**(§5 「확인 후에만」).
셋 다 「`apps/classbot/package.json` 에 없다」는 같은 뜻이고, 어디까지 와 있는지만 다르다:

| 등급 | 뜻 | 왜 통과가 아닌가 |
|---|---|---|
| `없음` | 어디에도 없다 | 순수하게 새 npm 의존이다 |
| `루트에만` | 루트 `package.json` 에만 선언돼 있다 | **루트 `package.json` 수정은 글로벌 작업**이라 별건 승인 사항이다(AGENTS.md 「모노레포 글로벌 작업」). 이 앱이 그 선언에 기대면 안 된다 |
| `락파일뿐` | 남의 전이 의존으로 우연히 트리에 있을 뿐이다 | 그 남이 버전을 올리거나 의존을 끊으면 사라진다. **import 근거가 못 된다** |

셋 중 무엇이든 들이기로 정했으면 `apps/classbot/package.json` 에 **직접 선언**한다.

> **`root`·`locked` 를 `app` 과 한 덩어리로 합치지 마라.** 합치면 루트에만 있는 패키지가
> 「이 앱에 이미 있다」로 분류돼 검사 ② 가 조용히 통과시킨다 — 이 문단이 막으려는 바로 그
> false negative 다. (이 PR 의 첫 판이 그렇게 썼고 리뷰에서 잡혔다.)

> 없는 이름을 넣으면 404 HTML 이 내려와 두 명령 모두 `jq: parse error` 를 낸다 —
> 조용히 빈 출력이 되지는 않는다. 그 에러를 「걸린 게 없다」로 읽지 마라.

**실측** (2026-08-31, `/v/0.5.0/`). 아래는 **위 세 블록을 그대로 붙여 넣고 `ITEM` 만 바꿔** 얻은
출력이다. 두 아이템이 **서로 반대 방향으로** 한쪽 검사만 통과한다:

`combobox` — ① 이 잡고 ② 는 깨끗하다

```
① 새 파일   components/ui/combobox.tsx  ← @puds/combobox
   덮어씀   lib/cn.ts  ← @puds/cn                      ← 레인 1. 정상
   새 파일   components/ui/command.tsx  ← @puds/command
   새 파일   components/ui/popover.tsx  ← @puds/popover
   덮어씀   components/ui/dialog.tsx  ← @puds/dialog    ← 레인 2. 들이지 않는다
② 선언됨    @base-ui/react  ← @puds/command
   선언됨    @base-ui/react  ← @puds/dialog
   선언됨    @base-ui/react  ← @puds/popover
   선언됨    clsx  ← @puds/cn
   선언됨    tailwind-merge  ← @puds/cn
```

`@puds/combobox` 는 레인 2 와 이름이 겹치지 않고 Radix 도 물지 않는다 — **구 판별법 두 개를
모두 통과한다.** 그런데 `@puds/command` → `@puds/dialog` 로 두 단계를 내려가
`components/ui/dialog.tsx` 를 덮는다. 이름 대조만으로는 못 잡는 자리다.

`data-table` — **① 이 깨끗하고 ② 가 잡는다**

```
① 새 파일   components/ui/data-table.tsx  ← @puds/data-table
   새 파일   components/ui/checkbox.tsx  ← @puds/checkbox
   덮어씀   lib/cn.ts  ← @puds/cn                      ← 레인 1. 정상
② 선언됨    @base-ui/react  ← @puds/checkbox
   없음      @tanstack/react-table  ← @puds/data-table   ← 이 앱에 없다. 보고 대상
   선언됨    clsx  ← @puds/cn
   선언됨    tailwind-merge  ← @puds/cn
```

① 만 보면 「레인 1 밖에 `덮어씀` 이 없으니 들여도 된다」가 된다. 실제로는
`@tanstack/react-table` 이 딸려 온다. **② 를 지우면 이 자리를 놓친다.**

**레지스트리 전수 집계** — v0.5.0 의 93 아이템을 전부 ② 로 돌린 결과(2026-08-31 실측):

| 등급 | 패키지 | 걸리는 아이템 |
|---|---|---|
| `선언됨` | `@base-ui/react` · `class-variance-authority` · `clsx` · `recharts` · `tailwind-merge` | 86 |
| `루트에만` | — | **0** |
| `락파일뿐` | — | **0** |
| `없음` | `@tanstack/react-table` | **1** — `data-table` |

`루트에만` 과 `락파일뿐` 은 **지금은 해당 사례가 없다.** 루트 `package.json` 에만 선언된 것은
`turbo` 하나뿐이고 그걸 무는 PUDS 아이템이 없어서다. 등급을 지우라는 뜻이 아니라 —
**지금 0 이라는 것을 기록해 둔다.** 다음 버전에서 이 표의 어느 칸이 0 을 벗어나는지가
이 검사가 알려 주는 것이다.

**수가 적다고 검사를 빼지 마라.** `없음` 1 건은 0 이 아니고, **그 1 건을 검사 ① 은 완전히 놓친다.**

겹치는 16종은 ① 로 **16/16 전부** `components/ui/<name>.tsx` 충돌이 확인됐다
(2026-08-31, `/v/0.5.0/`).

##### 무엇을 들일 수 있는가 — 전수 판정

위 두 검사는 **막는 쪽만** 말한다. 그래서 이 절만 읽으면 「PUDS 는 못 쓰는 것」으로 읽히는데
**사실은 반대다.** v0.5.0 의 93 아이템을 이 앱에 대고 ①·② 로 전부 돌린 결과
(2026-08-31 · `/v/0.5.0/` · `origin/dev`):

| 판정 | 개수 | 뜻 |
|---|---|---|
| 이미 벤더링돼 있다 | **11** | 레인 1. 설치가 아니라 [재설치](#버전-업그레이드-절차)가 정상 경로다 |
| **충돌 없이 바로 들일 수 있다** | **58** | ① 이 레인 1 밖을 안 덮고, ② 가 전부 `선언됨` |
| 레인 2 파일을 덮는다 | **23** | 들이지 않는다 |
| 새 npm 의존을 끌고 온다 | **1** | `data-table` → `@tanstack/react-table`. 보고 후 결정 |

네 칸은 배타적이고, 나뉘는 기준은 이렇다 — **재현할 때 같은 기준을 쓸 것**:
「이미 벤더링」은 아이템 **자기 파일이 전부 레인 1 경로**인 것(`theme-puds` · `cn` ·
셸 9 종 = 11), 나머지는 **전이까지 펼친 뒤** ② 에 `선언됨` 아닌 것이 있으면 「새 npm 의존」,
없으면서 ① 에 **레인 1 밖** `덮어씀` 이 있으면 「레인 2 를 덮는다」, 둘 다 아니면 「충돌 없음」이다.

> `sidebar` 를 ① 로 돌리면 `덮어씀 components/ui/rail-collapse-context.tsx` 가 찍힌다.
> **그건 레인 1 이라 정상이다** — 차단 사유가 아니다. `덮어씀` 이 찍혔다는 사실이 아니라
> **어느 레인에 찍혔는가**가 판정이다.

58 개의 갈래 (PUDS 저장소의 디렉터리 기준):

| 갈래 | 개수 | 아이템 |
|---|---|---|
| 프리미티브 | 28 | `accordion` `alert` `alert-dialog` `banner` `carousel` `checkbox` `collapsible` `context-menu` `empty-state` `file-upload` `hover-card` `input-otp` `kbd` `number-input` `pagination` `popover` `radio-group` `rating` `resizable` `select` `spinner` `stepper` `switch` `tag-input` `timeline` `toast` `toggle` `toggle-group` |
| 차트 | 8 | `area-chart` `bar-chart` `bullet` `donut` `heatmap` `line-chart` `radar-chart` `sparkline` — 이 중 `bullet`·`donut`·`heatmap` 은 **이 앱에 같은 이름의 로컬 구현이 있다.** 경로가 달라 덮지는 않는다 (아래 ⚠ ⑵) |
| 풀림 | 5 | `chat-bubble` `roi-meter` `section-head` `service-hero` `service-tile` |
| 블록 | 4 | `faq` `feature-grid` `footer` `pricing-table` |
| 내비 | 4 | `app-shell` `bottom-tabs` `sidebar` `topbar` |
| 레이아웃 | 3 | `flex` `grid` `stack` |
| 캘린더 | 2 | `month-calendar` `week-planner` |
| 그 밖 | 4 | `cuds-icons` `kr-text` `theme-variants` `use-reduced-motion` |

막히는 23 개 중 **이름이 겹치는 16 종**은 [레인 2](#레인-2--로컬-base-ui-프리미티브-puds-프리미티브로-교체-금지) 목록 그대로고,
**나머지 7 종은 전이 의존으로 덮는다** — 이름 대조만으로는 안 보이는 자리다:

| 아이템 | 전이로 덮는 레인 2 파일 |
|---|---|
| `auth-card` | `button` · `input` |
| `combobox` · `command` | `dialog` |
| `date-picker` · `hero` | `button` |
| `avatar-group` | `avatar` |
| `mobile-menu` | `input` |

> **이 숫자를 믿지 말고 판별기를 다시 돌려라.** 위 수치는 **핀이 `/v/0.5.0/` 이던 2026-08-31**
> 시점의 것이다. 핀을 올리거나 레인 2 파일이 늘거나 줄면 그날로 낡는다. 근거는 숫자가 아니라
> [①·②](#설치-전-확인--검사는-둘이다)의 **출력**이다.

**⚠ 「들일 수 있다」가 「들여도 된다」는 아니다.** 판별기는 **충돌만** 본다.
`충돌 없음` 은 「§ 3.1 의 두 검사를 통과했다」는 뜻이지 「들여도 좋다」는 결론이 아니다 —
[§ 5 「확인 후에만」](#5-작업-컨벤션--클래스봇-단일-도메인-락인)이 새 PUDS 아이템 도입을
**보고 사항**으로 두는 이유가 그것이다. 판정은 사람이 결정하기 위한 입력이다.

**이 앱에 실제로 그런 자리가 있다 — `@puds/bullet`.** ①·② 를 깨끗이 통과하는데(새 파일
하나 + `lib/cn.ts`, 새 의존 없음) 이 앱의 **금지 hue 규약**에 정면으로 걸린다. `bullet` 은
`--color-success-500` 과 `--color-warning-500` 을 직접 읽는데, 이 앱에 설치된 PUDS 토큰에서
그 둘의 값이 이렇다:

| 토큰 | `app/tokens/_base.css` | sRGB | `color-palette.spec.ts` 판정 |
|---|---|---|---|
| `--color-success-500` | `oklch(0.696 0.170 162)` | `rgb(0,188,124)` | **`success` — 금지 녹** |
| `--color-warning-500` | `oklch(0.795 0.184 86)` | `rgb(240,177,0)` | **`warn` — 금지 앰버** |

`tests/e2e/color-palette.spec.ts` 의 `isForbiddenHue()` 에 그대로 넣어 계산한 값이다.
**`globals.css` 는 이 두 토큰을 덮지 않는다.** (지금 테스트가 빨개지지는 않는다 — `bullet` 이
아직 어느 라우트에도 없어서다. 화면에 올리는 순간이 그 순간이다.)

**색을 쓰는 차트 6종도 같은 부류다.** `area`·`bar`·`line`·`radar`·`sparkline`·`donut` 은
`--chart-cat-1…8` 을 읽고, PUDS 기본값에는 `cat-4`(green `rgb(84,184,91)`)와
`cat-6`(yellow `rgb(213,153,0)`)가 있어 **둘 다 같은 판정에 걸린다.** 이 앱이 안전한 이유는
`globals.css` 가 그 8 개를 전부 덮어 두었기 때문이고, 그 블록 주석이 「이 오버라이드는
**테스트가 의존하는 값**이니 지우지 말 것」이라고 적어 둔 이유가 이것이다.

**판별기 ①·② 는 이 의존을 전혀 보지 않는다.** 그래서 새 아이템은 「무엇을 덮는가」·
「무엇을 끌고 오는가」 말고 **「무슨 토큰을 읽는가」**도 봐야 한다:

```bash
curl -s "$PUDS/$ITEM.json" | jq -r '.files[].content' | grep -oE '\-\-(color|chart)-[a-z0-9-]+' | sort -u
```

**그다음으로 큰 자리가 `theme-puds` 다. 이 앱은 그것을 이미 설치한 쪽이다** —
[레인 1](#레인-1--puds-원격에서-받는-것-로컬-수정-금지) 목록의 `app/tokens/*.css` 넉 장이 그
결과이고, `app/globals.css` 가 그 위에서 값을 조정하는 구조다. 그래서 여기서는 `theme-puds`
재설치가 정상 경로이고, 토큰 값을 이 앱에 맞추는 자리는 벤더링본이 아니라 `globals.css` 다
(아래 [조정 사다리](#세부-값은-어디서-조정하는가--조정-사다리)).

**다만 그건 이 앱이 내린 선택이지 PUDS 를 쓰는 앱의 기본값이 아니다.** `_base.css` 는 순수
토큰 파일이 아니라 전역 리셋과 `--text-*` · `--radius-*` · `--color-gray-*` 재정의를 함께 싣는
**테마 파일**이다(그래서 이 앱도 `_animations.css` · `pullim-jr.css` 는 설치만 하고 import 하지
않는다 — 위 ⚠ 참조). 자체 테마를 이미 가진 앱이라면 같은 판정이 나와도 결론이 반대일 수 있다.
**이 앱이 어느 쪽인지는 위 문단이 답이다.**

**⚠ 경로가 안 겹쳐도 역할은 겹친다 — 이 앱에 그런 자리가 둘 있다.**

**⑴ 내비 4 종.** `components/nav/*` 로 떨어져 판정은 `충돌 없음` 인데, 이 앱에는 같은 일을
하는 `components/shell/*` 가 이미 있다. `app-shell.tsx` 는 **파일 이름까지 같다** —
`components/nav/app-shell.tsx`(**아직 없다.** `@puds/app-shell` 을 들이면 생기는 경로다) vs
`components/shell/app-shell.tsx`(이 앱의 레인 3 어댑터, 실재한다).

**⑵ 차트 3 종 — `bullet` · `donut` · `heatmap`.** 이 앱에 **같은 이름의 로컬 구현이 이미
있고** `components/charts/index.ts` 가 `BulletChart` · `Donut` · `Heatmap` 로 export 한다.
그래도 ① 은 깨끗하다 — **PUDS 가 쓰는 경로가 다르기 때문이다.** ① 의 실제 출력이 근거다
(2026-08-31 · `/v/0.5.0/` · `ITEM=bullet`):

```
새 파일   components/ui/charts/bullet.tsx  ← @puds/bullet
덮어씀   lib/cn.ts  ← @puds/cn                              ← 레인 1. 정상
```

| | PUDS `files[].target` | 이 앱의 로컬 구현 |
|---|---|---|
| `bullet` | `components/ui/charts/bullet.tsx` — **없음** | `components/charts/bullet.tsx` — 있음 |
| `donut` | `components/ui/charts/donut.tsx` — **없음** | `components/charts/donut.tsx` — 있음 |
| `heatmap` | `components/ui/charts/heatmap.tsx` — **없음** | `components/charts/heatmap.tsx` — 있음 |

**덮어쓰지 않는다. 대신 같은 차트가 두 벌이 된다.** 로컬 3 종은 `components/charts/index.ts`
머리주석대로 「CUDS-native charts (zero deps, pure SVG)」이고 PUDS 판도 같은 성격이라,
들이면 **어느 쪽을 쓸지 정하는 문제**가 새로 생긴다. 나머지 차트 5 종
(`area`·`bar`·`line`·`radar`·`sparkline`)은 이 앱에 대응 구현이 없다.

**판별기는 경로만 본다. 두 벌이 공존해도 되는지는 사람이 본다** — 두 자리 다 그렇다.

##### 실제 설치로 확인한 것 — 그리고 설치가 `package.json` 을 고친다

> ⛔ **순서를 뒤집지 마라.** 이 절은 **설치가 무엇을 하는지**를 기록한 것이지
> 「일단 설치하고 나중에 확인하라」가 아니다. 실행 순서는 이렇다:
>
> 1. **비파괴 판정** — [①·②](#설치-전-확인--검사는-둘이다), 필요하면
>    [`--dry-run`](#--dry-run--빠른-예비-조회-두-검사를-대신하지-않는다). 셋 다 파일을 쓰지 않는다.
> 2. **보고 · 승인** — [§ 5 「확인 후에만」](#5-작업-컨벤션--클래스봇-단일-도메인-락인).
>    새 PUDS 아이템 도입은 그 자체가 승인 사항이고, **아래에서 보듯 `shadcn add` 는 root 파일
>    `bun.lock` 까지 건드리므로** 루트 가이드의 「글로벌 작업」 경계도 함께 넘는다
>    ([/CLAUDE.md § 4](../../CLAUDE.md)).
> 3. **설치** — 승인 뒤에만. 그리고 **깨끗한 워크트리에서** 돈다
>    (`git status --porcelain` 이 비어 있을 것). 그래야 4 의 diff 가 **설치가 만든 것만**
>    보여 주고, 되돌리기가 남의 미커밋 작업을 함께 지우지 않는다.
> 4. **설치가 실제로 무엇을 바꿨는지 확인** — 아래 `git diff`. 승인 없이 3 을 먼저 돌면
>    이 단계는 **이미 늦었다.**

`origin/dev` 워크트리에서 위 순서대로 `@puds/accordion` 을 실제로 설치했다
(2026-08-31, shadcn 4.8.1).
**파일 쪽은 판정대로였다:**

```
✔ Created 1 file:
  - components/ui/accordion.tsx
ℹ Skipped 1 file: (files might be identical, use --overwrite to overwrite)
  - lib/cn.ts
```

받은 `components/ui/accordion.tsx` 는 레지스트리 페이로드와 **바이트 동일**하다
(13,247 B, sha256 `8b90854031…76abd820`, `jq -j -r '.files[]|select(.target=="components/ui/accordion.tsx")|.content'` 와 `cmp`).

**그런데 `git status` 에는 셋이 뜬다:**

```
 M apps/classbot/package.json      ← "@base-ui/react": "^1.4.1" → "^1.7.0"
 M bun.lock                        ← @base-ui/react 1.5.0→1.7.0, @floating-ui/* 동반 상승
?? apps/classbot/components/ui/accordion.tsx
```

> 위는 **확인용으로 설치했다가 되돌린 기록**이다. **지금 이 저장소에
> `components/ui/accordion.tsx` 는 없다** — `accordion` 은 위 「충돌 없음 58」쪽 아이템이다.
> 이 절의 경로를 「가서 보라」로 읽지 마라.

`shadcn add` 는 아이템의 `dependencies` 를 **최신 범위로 다시 설치**한다. **검사 ② 가 전부
`선언됨` 이어도 그렇다** — ② 는 「없는 의존을 끌고 오는가」를 보지 「있는 의존의 핀을 올리는가」를
보지 않는다. `@puds/switch` 로 한 번 더 돌려 같은 상승을 재현했다.

**엔진 핀 상승은 전 화면 회귀 범위다.** 그리고 **되돌리기를 기본 흐름으로 삼지 마라** —
`bun.lock` 은 **root 파일**이라 그 변경은 루트 가이드가 「글로벌 작업」으로 분류하는
**사용자 명시 확인 사항**이고([/CLAUDE.md § 4](../../CLAUDE.md)),
`apps/classbot/package.json` 의 의존성 변경도 [§ 5 「확인 후에만」](#5-작업-컨벤션--클래스봇-단일-도메인-락인)이다.
그러니 설치 뒤 할 일은 **보는 것**까지다:

```bash
# 저장소 루트에서 — 설치가 무엇을 건드렸는지 본다
git diff --stat -- apps/classbot/package.json bun.lock
git diff -- apps/classbot/package.json
```

**출력이 비어 있지 않으면 거기서 멈추고 보고한다.** `bun.lock` 이 바뀐 시점에서 이미
**글로벌 작업 영역**이다. 「의도치 않은 상승이 보이니 되돌린다」로 혼자 처리하지 마라 —
핀을 올릴지 되돌릴지는 **사용자 결정**이고, **올리기로 정해졌다면 그건 컴포넌트 도입 PR 이
아니라 별건 PR** 이다. 되돌리는 쪽으로 정해졌을 때에만 아래를 돈다.

```bash
git checkout -- apps/classbot/package.json bun.lock
bun install --frozen-lockfile
```

> ⛔ **이 `git checkout` 은 그 두 파일의 미커밋 변경을 전부 버린다** — 설치가 만든 것만
> 골라 되돌리지 않는다. 위 순서 3 의 **「깨끗한 워크트리에서 설치」** 전제가 지켜졌을 때만
> 안전하다. 그 전제가 깨졌다면(다른 의존성 조정이나 lockfile 갱신이 이미 올라가 있다면)
> 이 명령을 돌리지 말고 **해당 hunk 만** 되돌린다 — `git restore -p -- apps/classbot/package.json bun.lock`.

되돌린 핀(`@base-ui/react` 1.5.0)에서 `accordion.tsx` 는
`bun --filter @pullim-classbot/classbot typecheck` 를 통과했다 — **상승이 필요해서 일어난 게 아니다.**
확인 뒤 워크트리는 원상 복구했다.

##### `--dry-run` — 빠른 예비 조회 (두 검사를 대신하지 않는다)

shadcn 4.8.1 에는 `--dry-run` 이 있다. 전이 의존을 이미 펼쳐 주고 **아무 파일도 쓰지 않는다**
(실측: 세 아이템에 돌린 뒤 `git status` 가 비어 있었다).

```bash
cd apps/classbot
bunx shadcn add @puds/combobox --yes --dry-run
```

> ⛔ **`bunx shadcn` 은 반드시 `apps/classbot` 안에서 돈다.** 이 저장소의 명령 규약은 root
> 기준이지만(`bun run <script>` · `bun --filter <pkg> <script>`, [/CLAUDE.md § 3](../../CLAUDE.md)),
> **`bun --filter` 는 워크스페이스 *스크립트* 실행용이라 `shadcn` 같은 CLI 에는 못 쓴다**
> (실측: `bun --filter @pullim-classbot/classbot shadcn` → `error: No packages matched the filter`).
> 그래서 `cd apps/classbot` 이 먼저다.
>
> **루트에서 돌리지 마라 — 조용히 다른 버전이 온다.** `shadcn` 은
> `apps/classbot/package.json` 의 선언된 의존(`shadcn: ^4.4.0`)이고 bun 은 그 바이너리를
> 루트가 아니라 **그 워크스페이스에** 심는다. 루트에서 `bunx shadcn` 을 치면 bun 이 npm 에서
> 새로 받아 온다 — **실측(2026-08-31): `apps/classbot` 에서 `4.8.1`, 루트에서 `4.19.0`.**
> 벤더링 결과가 도구 버전에 좌우되므로 그 차이는 무해하지 않다.
```
├ Files (5) +3 new, ~1 overwrite, =1 skip
│ = lib/cn.ts                   skip (identical)
│ ~ components/ui/dialog.tsx    overwrite
│ + components/ui/popover.tsx   create
...
⚠ 1 file will be overwritten.
├ Dependencies (3)
│ + clsx
│ + tailwind-merge
│ + @base-ui/react
```

**그래도 ①·② 를 대신하지 못한다. 셋 다 실측이다:**

- **의존성의 선언 여부를 구별하지 않는다.** `data-table` 의 `--dry-run` 은 `+ clsx` ·
  `+ tailwind-merge` · `+ @base-ui/react` 와 `+ @tanstack/react-table` 을 **같은 모양으로**
  나열한다. 앞 셋은 `선언됨`, 마지막 하나만 `없음` 인데 출력만으로는 못 가른다.
- **`overwrite` 가 레인 1 인지 레인 2 인지 구별하지 않는다.** 레인 1(`lib/cn.ts` ·
  `app/tokens/*` · 셸 9 종)을 덮는 건 정상이고 레인 2 를 덮는 건 차단 사유다.
- **위의 `package.json` 핀 상승을 예고하지 않는다.**

보고에는 [①·②](#설치-전-확인--검사는-둘이다)의 출력을 붙인다. `--dry-run` 은 그 앞에 한 번 훑는 것이다.

#### 레인 3 — 서비스 고유 컴포넌트

`components/{classbot,builder,shell,brand,charts,layout,features}/*` 와 `app/**` 전부.
자유롭게 고친다. 다만 토큰 규칙 하나:

- **`var(--radius-*)` / `var(--text-<size>)` 를 직접 읽지 마라.** Tailwind 유틸리티
  (`rounded-2xl`, `text-sm`)를 쓴다. 이 두 이름은 앱 스케일과 PUDS 스케일이 **같은 이름에 다른 값**이고,
  유틸리티는 앱 값을, `var()` 는 PUDS 값을 준다(`rounded-md`=14px vs `var(--radius-md)`=8px).
  근거와 경계는 `app/globals.css` 의 해당 주석에 적어 뒀다.
- **색·표면 의미 토큰은 자유롭게 읽어도 된다** — `var(--surface-*)`, `var(--text-primary|secondary|tertiary)`,
  `var(--border-*)`, `var(--color-action-*)` 은 이름 충돌이 없고 **명암 축을 자동으로 따라간다.**

#### 명암(다크) 축 — `data-scheme`

`<html data-theme="pullim-os" data-scheme="light|dark">` 두 축이다.
`data-theme` 슬롯은 **성격**(pullim-os)이 점유했으므로 **다크를 `data-theme="dark"` 로 지정하면 테마가 풀린다.**
next-themes 는 `attribute="data-scheme"` 로 배선돼 있고(`app/layout.tsx`), `globals.css` 의
`@custom-variant dark` 도 같은 축을 본다. **`.dark` 클래스는 더 이상 아무 의미가 없다.**

다크 정의는 **PUDS 토큰 파일 한 곳뿐**이다. `globals.css` 에서 shadcn 계층 변수를 다시 칠하지 마라 —
`:root` 매핑이 PUDS 의미 토큰을 가리키므로 명암은 자동으로 따라온다.

> **아직 남은 것**: 앱 본문은 `text-pullim-slate-900` · `bg-white` 같은 **고정 브랜드 팔레트**를
> 400곳 넘게 쓴다. 이 유틸리티들은 스킴 축에 참여하지 않아 다크에서도 밝은 채로 남는다.
> 셸은 다크가 맞지만 **본문까지 다크가 정합하지는 않다.** 별도 과제.

#### 세부 값은 어디서 조정하는가 — 조정 사다리

**「PUDS 기준으로 조립하고, 세부 값은 이 서비스에서 맞춘다」가 이 앱의 운영 방식이다.**
그 조정은 아래 네 층에서 한다. **벤더링본을 고쳐서 하지 않는다** — 이유는 이 절 끝에 있다.

| 층 | 자리 | 무엇을 바꾸나 | 재설치가 덮나 |
|---|---|---|---|
| ① 토큰 재정의 | `app/globals.css` | 색·모션·차트 팔레트 등 **PUDS 토큰 값** | **아니다** |
| ② cva variant prop | 호출부 | `intent` · `size` 같은 **공개 축** | 아니다 |
| ③ `className` | 호출부 | 그 한 자리의 유틸리티 | 아니다 |
| ④ `data-theme` · `data-scheme` | `app/layout.tsx` | 테마 성격 · 명암 | 아니다 |

**① `app/globals.css` — 이 앱이 소유한다.** `_base.css` · `pullim-os.css` 를 import 한
**다음**(1–5 행)이라 레이어 없는 CSS 의 소스 순서로 이긴다. 그리고 **레지스트리가 이 파일에
손댈 통로가 없다** — v0.5.0 의 93 아이템 중 `app/globals.css` 를 `files[].target` 으로 삼는 것이
**0 개**이고, shadcn 이 CSS 에 값을 주입하는 `cssVars`/`css` 키를 가진 아이템도 **0 개**다
(2026-08-31 실측).

지금 들어 있는 재정의 (실측 줄 범위, 총 500 행 중):

| 블록 | 줄 | 무엇 |
|---|---|---|
| `@theme inline` | 29–155 (127) | Tailwind 유틸리티 스케일 — **앱 값** |
| `:root` | 157–227 (71) | shadcn 계층 → PUDS 의미 토큰 매핑 |
| **`:root, [data-theme]`** | **239–260 (22)** | **PUDS 토큰 자체를 이 앱 값으로** — `--duration-fast` · `--duration-slow` · `--ease-standard` · `--chart-cat-1…8` |
| `[data-scheme="dark"]` | 297–314 (18) | PUDS 에 대응이 없는 `--sidebar-*` 와 차트 정지점 |

**세 번째 블록이 「세부 값 조정」의 정본이다.** 새 토큰 조정은 거기에 줄을 더한다.
`[data-theme]` 를 함께 적어 특정도를 (0,1,0)으로 맞춘 이유는 그 블록 머리주석에 있다 —
`:root` 하나로는 PUDS 의 `[data-theme="pullim-os"]` 에 진다. **선택자를 줄이지 마라.**

**② cva variant prop.** PUDS 컴포넌트는 축을 prop 으로 연다. **아래 실측은 전부 원격
레지스트리 페이로드를 읽은 것이다** — `alert` 도 `spinner` 도 이 앱에는 아직 없는 아이템이다
(둘 다 위 「충돌 없음 58」쪽이라 들여야 생긴다). `alert` 은 `intent`
(`info`·`success`·`warning`·`danger`, 기본 `info`), `spinner` 은 `size`(기본 `md`).
어떤 축이 있는지는 **설치 전에** 페이로드에서 바로 볼 수 있다:

```bash
curl -s "$PUDS/$ITEM.json" | jq -r '.files[].content' | grep -n 'cva(\|VariantProps\|defaultVariants'
```

**③ `className`.** PUDS 컴포넌트는 소비자 `className` 을 자기 기본 클래스와 함께 `cn()` 에
넣는다(페이로드 실측: `alert` 은 `cn(alertVariants({ intent }), className)`, `kbd` · `switch` ·
`popover` 도 같은 형태 — **넷 다 이 앱에 아직 없는 아이템이다**). 받아 온 뒤 이 앱의 `lib/cn.ts`
는 `twMerge(clsx(...))` 이므로 **같은 축의 유틸리티는 소비자 것이 이긴다.** 두 가지만 조심한다:

- **어느 파트에 합쳐지는지는 컴포넌트가 정한다.** 부유 레이어는 파트가 여럿이라 한 곳에만
  합친다 — PUDS `popover` **페이로드**의 머리주석이 「소비자 `className` 은 Popup 한 곳에만
  합친다」라고 못 박아 뒀다. 로컬 파일이 아니라 원격에서 읽는다:
  ```bash
  curl -s "$PUDS/popover.json" | jq -r '.files[].content' | sed -n '40,55p'
  ```
  다른 파트를 겨냥하고 싶으면 ③ 이 아니라 공개 prop 이 있는지부터 본다.
- **[레인 3 의 토큰 규칙](#레인-3--서비스-고유-컴포넌트)이 여기에도 걸린다.** 벤더링 컴포넌트에
  `rounded-md`(앱 14px)를 얹으면 **그 컴포넌트만** PUDS 스케일(8px)에서 벗어난다.
  치수를 계열 전체에 맞추려는 것이면 ③ 이 아니라 ① 로 간다.

**④ 테마·명암 축** — 위 [명암(다크) 축](#명암다크-축--data-scheme).

##### 벤더링본을 고쳐서 조정하지 마라

레인 1 파일을 직접 고치면 **다음 재설치가 말없이 덮는다.** 이 리포에서 실제로 두 번 일어났다 —
`hideToggle` 과 `page-header` 의 breadcrumb import(위 [레인 1](#레인-1--puds-원격에서-받는-것-로컬-수정-금지)).
둘 다 상류로 올라가 해소됐지만, 그때까지는 재설치마다 사라졌다.

**정말 벤더링본을 고쳐야 하는 상황이면 그 자체가 신호다.** 고치고 끝내지 말고, 이 문서의
[버전 업그레이드 절차](#버전-업그레이드-절차)에 **그 수정을 다시 얹는 단계를 이름 붙여 추가한다.**
재설치가 덮는다는 사실은 변하지 않으므로, 절차에 적히지 않은 로컬 패치는 **다음 업그레이드에서
사라진다** — 위 두 사례가 그렇게 사라졌다. 절차에 적혀 있어야 다음 사람이 다시 얹을 수 있다.

#### 레지스트리 URL — **경로로 고정**한다

레지스트리는 `apps/classbot/components.json` 의 한 줄이 전부다:

```json
"registries": { "@puds": "https://pullim-design-system.vercel.app/v/0.5.1/{name}.json" }
```

**고정은 호스트가 아니라 경로(`/v/<버전>/`)가 한다.** `/v/0.5.1/` 이 내려주는 내용은 PUDS 저장소의
`registry-releases/0.5.1/` 에 **커밋돼 있어서** main 에 무엇이 푸시돼도 변하지 않는다.

> ⛔ **`/r/{name}.json` 을 서비스가 직접 참조하면 안 된다.** 그 경로는 항상 **main 최신**을
> 따라가므로 `shadcn add` 를 돌리는 **시점마다 받아오는 소스가 달라진다.** 어제 벤더링한 셸과
> 오늘 받는 셸이 서로 다른 판이 되고, 그 차이는 커밋 diff 로만 드러난다.
>
> 호스트로 고정하는 방식(`puds-v0-2-0.vercel.app` 류)도 쓰지 마라 — **폐기됐다.** Vercel 의
> `ssoProtection: all_except_custom_domains` 때문에 공개로 열리는 건 프로젝트 도메인뿐인데
> 그 도메인은 프로덕션 최신을 추종한다. 공개와 고정이 동시에 성립하지 않아 다음 배포에서 밀린다.

버전 목록은 PUDS 리포의 `docs/releases.md`.

#### 버전 업그레이드 절차

```bash
cd apps/classbot

# 1) components.json 의 URL 에서 **경로의 버전만** 바꾼다.  /v/0.5.1/ → /v/0.6.0/
#    (호스트는 그대로 pullim-design-system.vercel.app 이다)

# 2) 레인 1 파일을 재설치한다
bunx shadcn add @puds/theme-puds --overwrite --yes
bunx shadcn add \
  @puds/dashboard-shell @puds/os-rail @puds/os-tabbar @puds/page-header \
  @puds/rail-collapse-context @puds/service-switcher @puds/service-icon \
  @puds/skip-link --overwrite --yes

# 3) diff 리뷰 → 검증
git diff apps/classbot/app/tokens apps/classbot/components/ui
bun --filter @pullim-classbot/classbot typecheck
bun --filter @pullim-classbot/classbot lint
bun --filter @pullim-classbot/classbot build
```

> ⚠ **재설치는 로컬 수정을 덮어쓴다.** 벤더링이라 머지가 아니다. `--overwrite` 를 **반드시** 붙여라 —
> 없이 돌리면 기존 파일과 내용이 다를 때 `--yes` 를 줘도 **대화형 프롬프트에서 멈춘다**(에이전트는 그대로 매달린다).
> 반대로 내용이 이미 같으면 `--overwrite` 를 붙여도 `Skipped ... use --overwrite` 라고 찍히는데,
> 이건 **정상이다** — 바뀔 게 없어서 건너뛴 것이다. 그러니 로그 문구가 아니라 **diff 로 판단해라.**
> "조용히 아무 일도 안 일어났다" 와 "덮어썼다" 둘 다 경계할 것. **diff 리뷰는 선택이 아니다.**
> 토큰 값이 바뀌었으면 `tests/e2e/color-palette.spec.ts` 도 함께 돌린다(금지 hue 회귀를 잡는다).

## 4. 포트

| 서비스 | 포트 |
|---|---|
| classbot FE (Next.js) | **3032** |
| backend (NestJS) | 4032 |
| Postgres (docker compose) | 5434 → container 5432 |

`predev` 가 3032 점유 프로세스를 kill 하므로 dev 재시작은 마음 편히.

## 5. 작업 컨벤션 — 클래스봇 단일 도메인 락인

**해도 되는 것**
- `app/(student)/classbot/*`, `app/(teacher)/teacher/{classbot,builder}/*` 페이지·컴포넌트·mock 수정·신규
- `components/{classbot,builder}/*` 도메인 컴포넌트 수정·신규
- `lib/db/*`, `lib/mock/*`, `lib/tokens/*` 수정
- 클래스봇 import 경로 갱신, 클래스봇 onboarding 페이지/UX 작업
- `__tests__/`, `lib/**/__tests__/`, `components/**/__tests__/` 단위 테스트 추가
- 공유 셸(`components/shell/*`)·UI 프리미티브(`components/ui/*`) **read**

**확인 후에만 (사용자 명시 동의 필요)**
- 공유 셸 / UI / nav-config 수정 — 클래스봇 한 도메인만 쓰는 상황이라 보통 안전하지만, role/nav 변경은 보고 후 진행
- 사라진 다른 도메인의 mock/페이지 복원 — 원본을 다시 가져와야 하는 경우 사용자에게 보고
- `packages/{api-client,auth,types}` 편집 — backend 와 양쪽 영향 (현재는 빈 placeholder)
- **PUDS 버전 업그레이드** — `components.json` 의 레지스트리 URL 변경 + 레인 1 재설치. 전 화면 시각 회귀 범위라 보고 후 진행 ([§ 3.1](#31-puds-디자인-시스템--3레인-판별표))
- **새 PUDS 아이템 도입** — 설치 전 확인 ①·② 를 돌린 **출력을 붙여** 보고한다. ② 에 `선언됨` 아닌 것
  (`없음`·`루트에만`·`락파일뿐`)이 찍혔으면 **`apps/classbot/package.json` 에 새 의존을 선언하는
  결정**이라 사용자 몫이다 ([§ 3.1](#설치-전-확인--검사는-둘이다)).
  **설치 뒤 `git diff -- apps/classbot/package.json bun.lock` 도 함께 본다** — ② 가 전부
  `선언됨` 이어도 `shadcn add` 는 이미 선언된 의존의 **핀을 올린다**(실측: `@base-ui/react`
  `^1.4.1` → `^1.7.0`). 엔진 핀 상승은 별건 결정이다
  ([§ 3.1](#실제-설치로-확인한-것--그리고-설치가-packagejson-을-고친다))

**하면 안 되는 것**
- 다른 도메인(플래너/Q/라이브러리 등) 코드를 새로 작성 — 추출본 범위 외. 필요하면 원본 풀림 스터디 데모 저장소 또는 `pullim` 본체에서 작업
- npm DS **패키지**(`@pullim/design-system` 등)를 dependency 로 추가 — UI 소스는 로컬 파일뿐이다.
  PUDS 는 `shadcn add` 로 **소스를 복사**해 오는 방식이라 여기 해당하지 않는다 ([§ 3.1](#31-puds-디자인-시스템--3레인-판별표))
- 레인 1(PUDS 벤더링) 파일 직접 수정, 레인 2(로컬 프리미티브)를 PUDS 프리미티브로 교체 — 둘 다 [§ 3.1](#31-puds-디자인-시스템--3레인-판별표)
  (교체 금지의 근거는 엔진이 아니라 **`files[].target` 충돌**이다. v0.5.0 부터 양쪽 다 `@base-ui/react` 다.
  설치 전 확인은 그 충돌과 **미설치 npm 의존성**을 **둘 다** 본다 — 「Radix 를 무는가」가 죽은 것이지
  의존성 검사가 죽은 게 아니다)
- 벤더링본을 **고쳐서** 세부 값을 맞추기 — 재설치가 덮는다. 조정은
  [§ 3.1 조정 사다리](#세부-값은-어디서-조정하는가--조정-사다리)의 네 층에서 한다

## 6. prod-verify — production 회귀 자동화

이 앱은 **production hit Playwright** 자산을 보유 (`apps/classbot/tests/e2e/*` + `.github/workflows/prod-verify.yml`):
- main push / 일일 schedule (UTC 23:00 = KST 08:00) / 수동 dispatch 세 경로로 https://classbot.pullim.ai 검증
- HTML `<meta name="x-build-sha">` 와 commit SHA 일치 polling 후 Playwright 7 spec 실행
- 색·chat·slider 회귀 자동 검출

`apps/classbot/app/layout.tsx` 에 x-build-sha meta tag 가 임베드되어 있어야 polling 이 동작.

## 7. 검증 (이 앱 단독)

루트에서:
```bash
bun install
bun --filter @pullim-classbot/classbot typecheck
bun --filter @pullim-classbot/classbot lint
bun --filter @pullim-classbot/classbot build
bun --filter @pullim-classbot/classbot test
bun --filter @pullim-classbot/classbot dev    # http://localhost:3032/classbot
```

원본의 6 도메인 라우트(`/planner`, `/q`, `/library`, `/parent` 등)는 모두 404가 정상입니다.

## 8. 의존 패키지 (현재 모두 빈 placeholder)

- `@pullim-classbot/api-client` — FE→BE fetch 래퍼
- `@pullim-classbot/auth` — IAuthProvider 추상화
- `@pullim-classbot/types` — BE↔FE 공유 타입

세 패키지 모두 Phase β·δ 이후 채워 넣을 예정.
