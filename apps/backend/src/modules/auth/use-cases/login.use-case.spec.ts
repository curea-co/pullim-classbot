import { UnauthorizedException } from "@nestjs/common";

import { AuthUser } from "../../../entities/auth-user.entity";
import { AuthProvider } from "../../../entities/enums/auth-provider.enum";
import { AuthUserProvider } from "../../../entities/auth-user-provider.entity";
import { UserRole } from "../../../entities/enums/user-role.enum";
import { LoginDto } from "../controller/dto/login.dto";
import { AuthService } from "../service/auth.service";
import { AuthUserRepositoryInterface } from "../interface/auth-user-repository.interface";
import { LoginUseCase } from "./login.use-case";

function buildUserWithEmailProvider(): {
  user: AuthUser;
  emailProvider: AuthUserProvider;
} {
  const user = AuthUser.create({
    name: "학생",
    email: "s@example.com",
    role: UserRole.STUDENT,
  });
  user.id = "user-1";
  const emailProvider = new AuthUserProvider();
  emailProvider.id = "provider-1";
  emailProvider.provider = AuthProvider.EMAIL;
  emailProvider.providerId = "s@example.com";
  emailProvider.password = "HASH";
  emailProvider.failedLoginCount = 0;
  emailProvider.lockedAt = null;
  user.authProviders = [emailProvider];
  return { user, emailProvider };
}

const dto: LoginDto = { email: "s@example.com", password: "pw" };

describe("LoginUseCase", () => {
  let authService: jest.Mocked<
    Pick<
      AuthService,
      | "findEmailLoginUserOrFail"
      | "validateLoginPreConditions"
      | "verifyPasswordOrFail"
      | "generateTokens"
    >
  >;
  let userRepository: jest.Mocked<
    Pick<
      AuthUserRepositoryInterface,
      | "findByEmailWithProviders"
      | "incrementFailedLoginCount"
      | "resetFailedLoginCount"
    >
  >;

  beforeEach(() => {
    const { user, emailProvider } = buildUserWithEmailProvider();
    authService = {
      findEmailLoginUserOrFail: jest.fn().mockReturnValue({ user, emailProvider }),
      validateLoginPreConditions: jest.fn(),
      verifyPasswordOrFail: jest.fn().mockResolvedValue(undefined),
      generateTokens: jest
        .fn()
        .mockReturnValue({ accessToken: "AT", refreshToken: "RT" }),
    };
    userRepository = {
      findByEmailWithProviders: jest.fn().mockResolvedValue(user),
      incrementFailedLoginCount: jest.fn().mockResolvedValue(undefined),
      resetFailedLoginCount: jest.fn().mockResolvedValue(undefined),
    };
  });

  function buildUseCase(): LoginUseCase {
    return new LoginUseCase(authService as never, userRepository as never);
  }

  it("성공 시 실패카운트를 리셋하고 토큰을 반환한다", async () => {
    const result = await buildUseCase().execute(dto);

    expect(userRepository.resetFailedLoginCount).toHaveBeenCalledWith("provider-1");
    expect(userRepository.incrementFailedLoginCount).not.toHaveBeenCalled();
    expect(result).toEqual({ accessToken: "AT", refreshToken: "RT" });
  });

  it("비밀번호가 틀리면 실패카운트를 증가시키고 예외를 전파한다", async () => {
    authService.verifyPasswordOrFail.mockRejectedValue(
      new UnauthorizedException("AUTH_LOGIN_FAILED"),
    );

    await expect(buildUseCase().execute(dto)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(userRepository.incrementFailedLoginCount).toHaveBeenCalledWith(
      "provider-1",
    );
    expect(userRepository.resetFailedLoginCount).not.toHaveBeenCalled();
  });

  it("존재하지 않는 사용자는 findEmailLoginUserOrFail 에서 거부된다", async () => {
    userRepository.findByEmailWithProviders.mockResolvedValue(null);
    authService.findEmailLoginUserOrFail.mockImplementation(() => {
      throw new UnauthorizedException("AUTH_LOGIN_FAILED");
    });

    await expect(buildUseCase().execute(dto)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(authService.generateTokens).not.toHaveBeenCalled();
  });
});
