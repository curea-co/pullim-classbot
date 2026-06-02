import { BadRequestException, ConflictException } from "@nestjs/common";

import { AuthUser } from "../../../entities/auth-user.entity";
import { UserRole } from "../../../entities/enums/user-role.enum";
import { SignupDto } from "../controller/dto/signup.dto";
import { AuthService } from "../service/auth.service";
import { AuthUserRepositoryInterface } from "../interface/auth-user-repository.interface";
import { SignupUseCase } from "./signup.use-case";

/**
 * 트랜잭션 콜백을 즉시 실행하는 DataSource 더블.
 */
function fakeDataSource() {
  return {
    transaction: jest.fn(async (cb: (m: unknown) => Promise<unknown>) =>
      cb({}),
    ),
  };
}

function buildDto(overrides: Partial<SignupDto> = {}): SignupDto {
  return {
    name: "홍길동",
    email: "new@example.com",
    password: "pw123456",
    passwordConfirm: "pw123456",
    role: UserRole.STUDENT,
    ...overrides,
  };
}

describe("SignupUseCase", () => {
  let authService: jest.Mocked<
    Pick<
      AuthService,
      "validatePasswordConfirm" | "hashPassword" | "generateTokens"
    >
  >;
  let userRepository: jest.Mocked<
    Pick<
      AuthUserRepositoryInterface,
      "isEmailAvailable" | "createWithProvider" | "provisionDomainUser"
    >
  >;

  beforeEach(() => {
    authService = {
      validatePasswordConfirm: jest.fn(),
      hashPassword: jest.fn().mockResolvedValue("HASHED"),
      generateTokens: jest
        .fn()
        .mockReturnValue({ accessToken: "AT", refreshToken: "RT" }),
    };
    userRepository = {
      isEmailAvailable: jest.fn().mockResolvedValue(true),
      createWithProvider: jest.fn(),
      provisionDomainUser: jest.fn().mockResolvedValue(undefined),
    };
  });

  function buildUseCase(): SignupUseCase {
    return new SignupUseCase(
      fakeDataSource() as never,
      authService as never,
      userRepository as never,
    );
  }

  it("중복 이메일이면 ConflictException 을 던지고 저장하지 않는다", async () => {
    userRepository.isEmailAvailable.mockResolvedValue(false);
    const useCase = buildUseCase();

    await expect(useCase.execute(buildDto())).rejects.toThrow(
      ConflictException,
    );
    expect(userRepository.createWithProvider).not.toHaveBeenCalled();
  });

  it("비밀번호를 해시한 뒤 user+provider 를 생성하고 토큰을 반환한다", async () => {
    const created = AuthUser.create({
      name: "홍길동",
      email: "new@example.com",
      role: UserRole.STUDENT,
    });
    created.id = "uuid-new";
    userRepository.createWithProvider.mockResolvedValue(created);

    const useCase = buildUseCase();
    const result = await useCase.execute(buildDto());

    expect(authService.hashPassword).toHaveBeenCalledWith("pw123456");
    // provider 에 들어간 password 는 평문이 아니라 해시여야 한다.
    const providerArg = userRepository.createWithProvider.mock.calls[0][1];
    expect(providerArg.password).toBe("HASHED");
    expect(result).toEqual({
      id: "uuid-new",
      email: "new@example.com",
      role: UserRole.STUDENT,
      accessToken: "AT",
      refreshToken: "RT",
    });
  });

  it("student/teacher 는 도메인 user 를 프로비저닝한다", async () => {
    const created = AuthUser.create({
      name: "선생",
      email: "t@example.com",
      role: UserRole.TEACHER,
    });
    created.id = "uuid-teacher";
    userRepository.createWithProvider.mockResolvedValue(created);

    await buildUseCase().execute(buildDto({ role: UserRole.TEACHER }));

    expect(userRepository.provisionDomainUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: "uuid-teacher", role: UserRole.TEACHER }),
      expect.anything(),
    );
  });

  it("공개 회원가입에서 admin 역할 요청은 거부한다(권한 상승 차단)", async () => {
    await expect(
      buildUseCase().execute(buildDto({ role: UserRole.ADMIN })),
    ).rejects.toThrow(BadRequestException);
    expect(userRepository.createWithProvider).not.toHaveBeenCalled();
    expect(userRepository.provisionDomainUser).not.toHaveBeenCalled();
  });
});
