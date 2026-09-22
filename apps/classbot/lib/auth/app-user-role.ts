import type { UserRole } from '@pullim-classbot/types';

/**
 * 이 앱 안에서만 쓰는 역할 union — `UserRole` 에 OS 가 주는 두 값을 더한 것.
 *
 * `packages/types` 의 `UserRole` 은 'student' | 'teacher' | 'admin' 이라 학부모·기관이 없다.
 * 그 union 은 BE 와 공유하는 계약(`packages/*`)이라 이 앱 사정으로 넓히지 않는다 —
 * 대신 여기서 넓힌 별칭을 두고 앱 경계 안에서만 쓴다(2026-09-16 계획 §10 결정 ⑥:
 * 「AppUserRole(앱 경계 별칭)에 institution 하나를 더하는 것으로 끝난다(parent 는 이미 있다)」 —
 * 그리고 「packages/types 는 건드리지 않는다」).
 *
 * 값의 출처는 pullim-api `GET /me` 의 `role`(student·parent·teacher·institution)이고,
 * `lib/auth/os-sso-provider.ts` 의 `mapRole` 이 이 union 으로 옮긴다. 화면에서 이 둘은
 * RoleGuard 가 「클래스봇은 학생과 선생님이 쓰는 곳」 안내 한 장으로 보낸다 —
 * 학생으로 위장시키지 않는다.
 *
 * 이 파일이 leaf 인 이유: `lib/current-user.ts` 가 `auth-context` 를 import 하고
 * `auth-context` 가 `os-sso-provider` 를 import 하므로, provider 가 `current-user` 에서 타입을
 * 가져오면 순환이 된다. 타입만 있는 leaf 를 양쪽이 바라본다(`current-user.ts` 는 재수출).
 */
export type AppUserRole = UserRole | 'parent' | 'institution';
