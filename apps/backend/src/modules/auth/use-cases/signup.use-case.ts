import { ConflictException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

import { ErrorMessages } from "../../../common/constants/error-messages.constant";
import { AuthProvider } from "../../../entities/enums/auth-provider.enum";
import { AuthUser } from "../../../entities/auth-user.entity";
import { AuthUserProvider } from "../../../entities/auth-user-provider.entity";
import { UserRole } from "../../../entities/enums/user-role.enum";
import { SignupDto } from "../controller/dto/signup.dto";
import { AuthService } from "../service/auth.service";
import { AuthUserRepositoryInterface } from "../interface/auth-user-repository.interface";

/**
 * 이메일 회원가입 use-case (Facade). 비즈니스 로직은 Service 에 위임하고 조합·트랜잭션만 담당한다.
 *
 * 본체 pullim signup 대비 단순화: KCB 본인인증/약관/만14세 게이트는 classbot 범위 밖이라 제외.
 * 이메일+비밀번호+이름+role 만으로 가입한다. (게이트들은 GATED 스캐폴드 참조)
 */
@Injectable()
export class SignupUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly authService: AuthService,
    private readonly userRepository: AuthUserRepositoryInterface,
  ) {}

  /**
   * 이메일 회원가입을 수행한다. 이메일 중복 검증 → 비번 해시 → User+Provider 생성 → 토큰 발급.
   * @param dto - 회원가입 요청 데이터
   * @returns 사용자 정보와 토큰
   */
  async execute(dto: SignupDto): Promise<{
    id: string;
    email: string;
    role: UserRole;
    accessToken: string;
    refreshToken: string;
  }> {
    this.authService.validatePasswordConfirm(dto.password, dto.passwordConfirm);

    const available = await this.userRepository.isEmailAvailable(dto.email);
    if (!available) {
      throw new ConflictException(ErrorMessages.USER_EMAIL_DUPLICATED);
    }

    const hashedPassword = await this.authService.hashPassword(dto.password);

    const savedUser = await this.dataSource.transaction(async (manager) => {
      const user = AuthUser.create({
        name: dto.name,
        email: dto.email,
        role: dto.role ?? UserRole.STUDENT,
      });
      const provider = AuthUserProvider.create({
        provider: AuthProvider.EMAIL,
        providerId: dto.email,
        password: hashedPassword,
        user,
      });
      const created = await this.userRepository.createWithProvider(
        user,
        provider,
        manager,
      );

      // 신원 단일화: 인증 사용자와 같은 id 로 도메인 users 행을 동일 트랜잭션에 생성한다.
      // 로그인 사용자가 도메인의 주체(FK)가 되게 한다. admin 은 도메인 진입 주체가
      // 아니라 행을 만들지 않는다(예약). student/teacher 만 프로비저닝.
      if (created.role !== UserRole.ADMIN) {
        await this.userRepository.provisionDomainUser(
          { id: created.id, name: created.name, role: created.role },
          manager,
        );
      }

      return created;
    });

    const tokens = this.authService.generateTokens(savedUser);

    return {
      id: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
      ...tokens,
    };
  }
}
