import { UnauthorizedException } from "@nestjs/common";

import { AuthUser } from "../../../entities/auth-user.entity";
import { UserRole } from "../../../entities/enums/user-role.enum";
import { AuthService } from "../service/auth.service";
import { RefreshUseCase } from "./refresh.use-case";

function buildUser(): AuthUser {
  const user = AuthUser.create({
    name: "학생",
    email: "s@example.com",
    role: UserRole.STUDENT,
  });
  user.id = "user-1";
  return user;
}

describe("RefreshUseCase (rotation)", () => {
  let authService: jest.Mocked<
    Pick<AuthService, "blacklistTokenOrFail" | "generateTokens">
  >;

  beforeEach(() => {
    authService = {
      blacklistTokenOrFail: jest.fn().mockResolvedValue(undefined),
      generateTokens: jest
        .fn()
        .mockReturnValue({ accessToken: "AT2", refreshToken: "RT2" }),
    };
  });

  function buildUseCase(): RefreshUseCase {
    return new RefreshUseCase(authService as never);
  }

  it("기존 refresh 토큰을 블랙리스트에 올린 뒤 새 토큰 쌍을 발급한다(rotation)", async () => {
    const result = await buildUseCase().execute(buildUser(), "old-refresh");

    expect(authService.blacklistTokenOrFail).toHaveBeenCalledWith(
      "old-refresh",
    );
    expect(result).toEqual({ accessToken: "AT2", refreshToken: "RT2" });
  });

  it("이미 사용된(블랙리스트) refresh 토큰이면 거부하고 새 토큰을 발급하지 않는다", async () => {
    authService.blacklistTokenOrFail.mockRejectedValue(
      new UnauthorizedException("AUTH_TOKEN_BLACKLISTED"),
    );

    await expect(
      buildUseCase().execute(buildUser(), "reused-refresh"),
    ).rejects.toThrow(UnauthorizedException);
    expect(authService.generateTokens).not.toHaveBeenCalled();
  });
});
