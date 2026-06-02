import { Injectable, NotImplementedException } from "@nestjs/common";

import { ErrorMessages } from "../../../common/constants/error-messages.constant";

/**
 * ============================================================================
 * GATED 스캐폴드 — 본체 pullim auth 미러링 골격 (미구현)
 * ============================================================================
 *
 * 이 파일은 본체 `auth.controller.ts` 의 풀세트 엔드포인트 중 classbot 핵심 범위 밖
 * 기능들의 use-case 자리표시자다. 외부 의존(메일러/카카오/네이버/KCB/Redis)이 없어
 * 이번 작업에서는 동작하지 않으며, plan(2026-05-29_auth-login-signup.md §1.1) 매핑표와
 * 1:1 로 대응한다. 실제 구현 시 각 use-case 를 독립 파일로 분리한다(본체 디렉토리 구조 동일).
 *
 * GATED: 아래 전부 미연결. AuthModule providers 에 등록하지 않는다(컨트롤러도 노출 X).
 */

/** GATED: 이메일 인증 코드 발송. 본체 SendEmailVerificationUseCase 대응. 메일러 미연동. */
@Injectable()
export class GatedSendEmailVerificationUseCase {
  /** GATED: 메일러 연동 + email_verifications 테이블 필요. */
  execute(): never {
    throw new NotImplementedException(ErrorMessages.COMMON_NOT_IMPLEMENTED);
  }
}

/** GATED: 이메일 인증 코드 검증. 본체 VerifyEmailCodeUseCase 대응. */
@Injectable()
export class GatedVerifyEmailCodeUseCase {
  /** GATED: email_verifications 조회·소비 로직 필요. */
  execute(): never {
    throw new NotImplementedException(ErrorMessages.COMMON_NOT_IMPLEMENTED);
  }
}

/** GATED: OAuth state 생성. 본체 GenerateOAuthStateUseCase 대응. Redis 부재로 DB/메모리 store 설계 필요. */
@Injectable()
export class GatedGenerateOAuthStateUseCase {
  /** GATED: state 1회성 소비 store(현재 Redis 없음) 필요. */
  execute(): never {
    throw new NotImplementedException(ErrorMessages.COMMON_NOT_IMPLEMENTED);
  }
}

/** GATED: 소셜 로그인(카카오/네이버). 본체 SocialLoginUseCase 대응. OAuth 토큰 교환 미연동. */
@Injectable()
export class GatedSocialLoginUseCase {
  /** GATED: 카카오/네이버 OAuth API + auth_user_providers(KAKAO/NAVER) 연결 필요. */
  execute(): never {
    throw new NotImplementedException(ErrorMessages.COMMON_NOT_IMPLEMENTED);
  }
}

/** GATED: 소셜 회원가입. 본체 SocialSignupUseCase 대응. */
@Injectable()
export class GatedSocialSignupUseCase {
  /** GATED: 소셜 가입 토큰(임시 store) 소비 + User+Provider 생성 필요. */
  execute(): never {
    throw new NotImplementedException(ErrorMessages.COMMON_NOT_IMPLEMENTED);
  }
}

/** GATED: 비밀번호 재설정 코드 발송. 본체 SendPasswordResetCodeUseCase 대응. */
@Injectable()
export class GatedSendPasswordResetCodeUseCase {
  /** GATED: 메일러 + 재설정 토큰 store 필요. */
  execute(): never {
    throw new NotImplementedException(ErrorMessages.COMMON_NOT_IMPLEMENTED);
  }
}

/** GATED: 비밀번호 재설정 코드 검증. 본체 VerifyPasswordResetCodeUseCase 대응. */
@Injectable()
export class GatedVerifyPasswordResetCodeUseCase {
  /** GATED: 코드 검증 후 resetToken 발급 필요. */
  execute(): never {
    throw new NotImplementedException(ErrorMessages.COMMON_NOT_IMPLEMENTED);
  }
}

/** GATED: 비밀번호 재설정 확정. 본체 ConfirmPasswordResetUseCase 대응. */
@Injectable()
export class GatedConfirmPasswordResetUseCase {
  /**
   * GATED: resetToken 소비 + 비밀번호 변경 + passwordChangedAt 갱신(기 발급 토큰 무효화) 필요.
   * 핵심 인프라(passwordChangedAt 기반 토큰 무효화)는 JwtStrategy 에 이미 구현됨.
   */
  execute(): never {
    throw new NotImplementedException(ErrorMessages.COMMON_NOT_IMPLEMENTED);
  }
}

/** GATED: 이메일 찾기. 본체 FindEmailUseCase 대응. 본인인증(KCB) 의존. */
@Injectable()
export class GatedFindEmailUseCase {
  /** GATED: KCB 본인인증 결과로 이름 매칭 후 이메일 마스킹 반환 필요. */
  execute(): never {
    throw new NotImplementedException(ErrorMessages.COMMON_NOT_IMPLEMENTED);
  }
}

/**
 * GATED: 로그인 이력 기록. 본체 LoginHistoryService 대응.
 * login.use-case 가 성공 시 ip/userAgent 를 기록하도록 확장하는 자리.
 * (본체는 별도 login_history 테이블 + LoginHistoryModule)
 */
@Injectable()
export class GatedLoginHistoryRecorder {
  /** GATED: auth_login_history 테이블 + IP/UA 파싱 유틸 필요. */
  record(): never {
    throw new NotImplementedException(ErrorMessages.COMMON_NOT_IMPLEMENTED);
  }
}
