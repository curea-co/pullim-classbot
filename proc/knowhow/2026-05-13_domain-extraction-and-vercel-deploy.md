# 단일 도메인 추출 → GitHub 연동 → Vercel 배포 플레이북

> 작성일: 2026-05-13
> 사례: 풀림 스터디 데모(`260506`)에서 클래스봇 도메인만 떼어 `curea-co/pullim-classbot` 신규 저장소로 분리, Vercel 첫 배포까지.

multi-domain 풀림 데모를 도메인 단위로 분기시킬 때 다시 쓸 수 있는 재현 가능 절차.
구체 코드 변경 이력은 git/log를 보면 되니 여기엔 **판단 기준과 함정**만 적는다.

---

## 0. 사전 점검 — 1분 안에 끝낼 것

- 추출 대상 도메인이 [CLAUDE.md](../../CLAUDE.md)(혹은 원본 AGENTS) 의 "6 도메인 표"에 명시되어 있는지 확인. 표가 있다면 **편집 OK 페이지·컴포넌트·mock의 권위 목록**으로 쓰인다.
- 도메인 권위 문서(`input/docs-archive/0X_풀림_*_핸드오프.md`)와 마스터 문서가 input에 있는지 확인.
- 추출 후 남길 라우트와 버릴 라우트의 경계를 미리 메모. 도중에 흔들리면 mock 의존 사이클을 잘못 풀게 된다.

---

## 1. 의존 그래프 매핑 — 코드를 옮기기 전에 먼저

도메인의 페이지·컴포넌트·mock이 다른 도메인을 얼마나 끌고 들어오는지 먼저 그린다.

```bash
# 1-1. 페이지/컴포넌트가 import 하는 라이브러리·다른 컴포넌트
grep -rh "^import" \
  src/app/(student)/<domain>/ \
  src/app/(teacher)/teacher/<domain>/ \
  src/components/<domain>/ \
  | sort -u

# 1-2. mock barrel 의존 — 어떤 named export 를 끌어쓰나
grep -rh "from '@/lib/mock" src/app/(student)/<domain>/ src/components/<domain>/

# 1-3. mock 파일 자체의 cross-import — 가장 큰 함정
grep -h "^import\|^export" src/lib/mock/<domain>.ts
```

판단 기준:

- mock이 다른 도메인 mock의 **type 하나만** 끌고 오면 그 type을 동봉(예: classbot이 tutor의 `ScopeLevel` 사용 → `tutor.ts` 16줄 통째로 가져옴). 의존 1개 때문에 도메인 통째로 끌어들이지 말 것.
- 페이지/컴포넌트가 다른 도메인 컴포넌트(`@/components/<other>/...`)를 쓰면 도메인 경계가 깨진 것 — 추출 전에 원본에서 먼저 풀어내야 함.
- 셸(`@/components/shell/*`)·UI 프리미티브(`@/components/ui/*`)·`@/lib/utils`·`@/lib/tokens/*`는 **공유 인프라**로 분류, 통째로 동봉.

---

## 2. 파일 옮기기 — cp -r 통째로 + barrel만 다시 쓰기

```bash
SRC="/path/to/원본"; DST="/path/to/추출본"

# 디렉토리 골격
mkdir -p "$DST/src/app/(student)/<domain>" \
         "$DST/src/app/(teacher)/teacher/<domain>" \
         "$DST/src/components" "$DST/src/lib/mock" "$DST/src/lib/tokens"

# 라우트
cp "$SRC/src/app/layout.tsx" "$SRC/src/app/globals.css" "$DST/src/app/"
cp "$SRC/src/app/favicon.ico" "$DST/src/app/favicon.ico"
cp "$SRC/src/app/(student)/layout.tsx" "$DST/src/app/(student)/layout.tsx"
cp "$SRC/src/app/(teacher)/layout.tsx" "$DST/src/app/(teacher)/layout.tsx"
cp -r "$SRC/src/app/(student)/<domain>/." "$DST/src/app/(student)/<domain>/"

# 도메인 컴포넌트 + 공유 인프라
cp -r "$SRC/src/components/<domain>" \
      "$SRC/src/components/shell" \
      "$SRC/src/components/ui" \
      "$SRC/src/components/brand" \
      "$DST/src/components/"

# lib
cp "$SRC/src/lib/utils.ts" "$DST/src/lib/"
cp -r "$SRC/src/lib/tokens/." "$DST/src/lib/tokens/"
cp "$SRC/src/lib/mock/<domain>.ts" "$SRC/src/lib/mock/<dep>.ts" "$DST/src/lib/mock/"
```

손으로 다시 쓸 파일은 두 개뿐:

1. **`src/lib/mock/index.ts`** — barrel을 추출 대상 + 의존 mock만 export 하는 형태로 새로 작성. 절대 `cp` 하지 말 것. 원본 barrel은 14~20개 도메인을 re-export 하기 때문에 다 같이 끌려온다.
2. **`src/components/shell/nav-config.ts`** — Role union 좁히기, `studentDomains`/`studentBottomTabs`/`teacherNav` 모두 단일 도메인 라우트만 노출.

---

## 3. 보일러플레이트 + SPARK+IPO 하네스

코드만 옮기면 풀림 데모의 **AI 에이전트 하네스**가 빠진다. 이게 빠지면 같은 도메인 작업을 이 저장소에서 이어갈 때 컨텍스트가 비어버린다. 반드시 동봉:

```bash
# Next.js 보일러플레이트
cp "$SRC/package.json" "$SRC/tsconfig.json" "$SRC/eslint.config.mjs" \
   "$SRC/postcss.config.mjs" "$SRC/next.config.ts" "$SRC/next-env.d.ts" \
   "$SRC/components.json" "$SRC/.gitignore" "$SRC/.dockerignore" \
   "$SRC/bun.lock" "$SRC/Dockerfile" "$DST/"
cp -r "$SRC/public" "$DST/public"

# SPARK+IPO 하네스 골격 (디렉토리만)
mkdir -p "$DST/input" "$DST/proc/spec" "$DST/proc/plan" "$DST/proc/archive" \
         "$DST/proc/research" "$DST/proc/knowhow" "$DST/output" "$DST/.claude"
touch "$DST/input/.gitkeep" "$DST/proc/plan/.gitkeep" "$DST/proc/knowhow/.gitkeep" "$DST/output/.gitkeep"

# AI 에이전트 설정 + 루트 메타
cp -r "$SRC/.claude/skills" "$DST/.claude/"
cp "$SRC/.claude/settings.local.json" "$DST/.claude/"
cp "$SRC/AGENTS.md" "$SRC/README.md" "$DST/"
# CLAUDE.md 는 항상 새로 쓴다 — 원본은 6 도메인 락인 규칙이라 단일 도메인 추출본엔 안 맞음
```

문서 필터링 기준:

- `input/docs-archive/` — 추출 도메인 핸드오프 + 공통 마스터(00, 03, 04)만. 다른 도메인 핸드오프는 드롭.
- `proc/spec/` — 00~10 마스터 spec은 도메인 비종속이라 그대로 옮긴다. 날짜 prefix 붙은 도메인별 spec은 해당 도메인 것만.
- `proc/archive/` — 추출 도메인 + 셸 글로벌 작업만. planner/Q/library 등 다른 도메인 archive는 드롭.
- `proc/research/` — 도메인별이라면 해당하는 것만. 보통 비어있는 채로 시작해도 OK.

---

## 4. 흔히 빠지는 함정

### 4-1. `coach-fab.tsx` 같은 공유 셸의 도메인 의존

셸 디렉토리는 "공유"라 통째로 cp하지만 일부 파일이 특정 도메인 라우트(`/q/talk`)에 하드코딩 의존하는 경우가 있다. 추출 도메인에 그 라우트가 없으면 **링크가 모두 404**가 된다. 셸 cp 직후 다음 grep으로 잡는다:

```bash
grep -rn "/q/\|/planner\|/library\|/parent" src/components/shell/
```

원본은 `CoachFab`이 `/q/talk`로 점프 → 클래스봇 추출본에선 파일 자체 제거하고 `AppShell`에서도 호출 삭제.

### 4-2. Role union 축소 시 `parent` 분기 잔재

`Role = 'student' | 'teacher' | 'parent'` → `'student' | 'teacher'` 로 줄이면, 셸 안의 분기문(`role === 'parent' ? ... : ...`)이 모두 죽은 가지가 된다. tsc는 통과하지만 코드 노이즈. 추출 직후 grep으로 한 번에 정리:

```bash
grep -rn "'parent'\|currentParent\|parentNav" src/components/shell/ src/lib/
```

### 4-3. 원본 mock 단일 export 의존 — phase1.ts 함정

도메인 mock이 다른 mock 파일에 **흩어진 export**를 import하는 경우(예: classbot 채팅 응답이 `phase1.ts`에 같이 들어있음), tsc 실패 메시지 보고 처음 알게 된다. 사전에 잡으려면:

```bash
grep -rh "from '@/lib/mock'" src/app/<domain>/ src/components/<domain>/ \
  | grep -oP "import \{ \K[^}]+" | tr ',' '\n' | awk '{print $NF}' | sort -u \
  | xargs -I{} grep -l "export.*{}" src/lib/mock/
```

추출본에서는 phase1.ts 통째로 가져오지 말고, 채팅 관련 export만 새 파일(`chat.ts`)로 발췌하는 게 깨끗하다.

### 4-4. predev 훅의 port-kill — 다른 dev 서버를 죽임

원본 `package.json` 의 `predev`가 `lsof -ti:3030 | xargs kill -9` 형태라서, 그 포트를 다른 프로세스가 쓰고 있으면 **남의 dev 서버를 죽인다**. 추출본 dev 포트가 점유되어 있다면 단순히 `--port` 플래그로 회피하지 말고 `package.json` 의 `predev`/`dev`/`start` 세 곳 모두 **새 포트로 바꿔서 고정**시켜야 함.

```bash
# 점유 확인
lsof -i :3030 -i :3031 -i :3032
```

---

## 5. 검증 게이트 — 셋 다 통과해야 다음 단계

```bash
bun install
bun x tsc --noEmit          # 1. 타입
bun run build               # 2. 정적 빌드 — 라우트 수가 기대값과 일치하는지
bun dev                     # 3. 라이브 — / 와 도메인 홈 200
```

빌드 로그의 라우트 표가 추출 의도와 맞는지 사람 눈으로 확인. 예상 못한 라우트가 보이면 cp 단계에서 뭔가 더 따라온 것.

---

## 6. GitHub 연동 — 빈 stub repo가 있는 경우

원격이 비어 있지 않고 stub commit(예: 자동 생성된 README) 한 개가 있을 때, force push 없이 깔끔하게 얹는 방법:

```bash
git init -b main
git remote add origin <url>
git fetch origin
git reset --mixed origin/main    # HEAD를 stub commit 위로, working tree는 그대로
git add -A
GIT_AUTHOR_NAME=... GIT_AUTHOR_EMAIL=... \
GIT_COMMITTER_NAME=... GIT_COMMITTER_EMAIL=... \
  git commit -m "..."             # 글로벌 config 안 건드리고 인라인 author로 commit
git push -u origin main
```

`git config --global user.email` 을 마음대로 건드리지 말 것 — 글로벌 식별이 의도치 않게 바뀌면 다른 저장소 commit author 가 다 망가진다. **항상 env var 또는 `-c` 플래그로 한 commit 동안만 주입**.

---

## 7. Vercel 첫 배포의 함정 — preview 의도가 production 으로 간다

**`vercel deploy --yes`(또는 인자 없는 `vercel`)는 신규 프로젝트의 첫 배포를 자동으로 production target에 올린다.** Git 기본 브랜치가 main이고 그 브랜치에서 처음 배포되는 경우의 표준 동작. 의도가 preview였다면 명시적으로:

```bash
vercel deploy --yes --target=preview
```

라고 `--target` 을 박아야 한다. 안 박으면 prod alias(`<project>.vercel.app`)에 즉시 노출되는데, 추출본의 첫 빌드라 라이브 트래픽이 없으니 보통은 OK이지만, 도메인이 검색 인덱스에 잡힐 위험이 있다.

배포 후 확인:

```bash
# 도메인 + 핵심 라우트 일괄 smoke test
for path in / /<domain> /teacher /teacher/<domain>; do
  curl -sS -o /dev/null -w "$path -> %{http_code}\n" \
    -L "https://<project>.vercel.app$path"
done
```

`vercel deploy --yes`는 GitHub repo 연결도 자동으로 잡아준다(remote 가 이미 GitHub URL이면). 이후 `main` push는 production 자동 배포, 다른 브랜치 push는 preview 자동 배포로 굴러간다 — 별도 webhook 설정 불필요.

---

## 8. 체크리스트 — 추출 완료 정의

- [ ] `bun x tsc --noEmit` 통과
- [ ] `bun run build` 의 라우트 표가 추출 의도와 일치 (도메인 + 셸 진입점만)
- [ ] `bun dev` 의 `/` 접근 시 도메인 홈으로 리다이렉트 또는 정상 렌더
- [ ] CLAUDE.md 가 단일 도메인 작업 가이드로 재작성됨 (원본 6 도메인 표 잔재 없음)
- [ ] 셸 안의 다른 도메인 라우트 하드코딩 모두 정리 (grep으로 확인)
- [ ] SPARK+IPO 디렉토리 골격 + .claude/skills 동봉
- [ ] GitHub repo의 stub commit 위에 깔끔히 1 commit 얹힘
- [ ] Vercel 라이브 URL의 도메인 라우트 4~5개 200 응답
