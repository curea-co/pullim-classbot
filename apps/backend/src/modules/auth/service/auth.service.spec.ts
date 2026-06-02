import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";

import { MAX_LOGIN_ATTEMPTS } from "../../../common/constants/security.constant";
import { TokenProvider } from "../../../common/interfaces/token-provider.interface";
import { AuthUser } from "../../../entities/auth-user.entity";
import { AuthProvider } from "../../../entities/enums/auth-provider.enum";
import { AuthUserProvider } from "../../../entities/auth-user-provider.entity";
import { UserRole } from "../../../entities/enums/user-role.enum";
import { RevokedTokenRepositoryInterface } from "../interface/revoked-token-repository.interface";
import { AuthService } from "./auth.service";

const PEPPER = "test-pepper";

/** ConfigService 스텁 — PASSWORD_PEPPER 만 제공. */
const configServiceStub = {
  getOrThrow: jest.fn((key: string) => {
    if (key === "PASSWORD_PEPPER") return PEPPER;
    throw new Error(`unexpected key ${key}`);
  }),
};

/** 인메모리 블랙리스트 — DB-table 블랙리스트의 단위테스트 더블. */
class InMemoryRevokedTokenRepository extends RevokedTokenRepositoryInterface {
  private readonly store = new Set<string>();

  revoke(jti: string): Promise<void> {
    this.store.add(jti);
    return Promise.resolve();
  }

  revokeOnce(jti: string): Promise<boolean> {
    if (this.store.has(jti)) return Promise.resolve(false);
    this.store.add(jti);
    return Promise.resolve(true);
  }

  isRevoked(jti: string): Promise<boolean> {
    return Promise.resolve(this.store.has(jti));
  }
}

/** TokenProvider 더블 — 결정적 jti 로 토큰을 발급한다. */
class FakeTokenProvider extends TokenProvider {
  public counter = 0;

  generateTokens(user: AuthUser): {
    accessToken: string;
    refreshToken: string;
  } {
    this.counter += 1;
    return {
      accessToken: `access-${user.id}-${this.counter}`,
      refreshToken: `refresh-${user.id}-${this.counter}`,
    };
  }
}

/** jwtService.decode 더블 — token 문자열을 payload 로 해석한다. */
const jwtServiceStub = {
  decode: jest.fn(),
};

function buildService(
  revokedRepo: RevokedTokenRepositoryInterface,
  tokenProvider: TokenProvider = new FakeTokenProvider(),
): AuthService {
  return new AuthService(
    configServiceStub as never,
    tokenProvider,
    jwtServiceStub as never,
    revokedRepo,
  );
}

function buildEmailProvider(
  overrides: Partial<AuthUserProvider> = {},
): AuthUserProvider {
  const provider = new AuthUserProvider();
  provider.id = "provider-1";
  provider.provider = AuthProvider.EMAIL;
  provider.providerId = "u@example.com";
  provider.password = null;
  provider.failedLoginCount = 0;
  provider.lockedAt = null;
  return Object.assign(provider, overrides);
}

function buildUser(role: UserRole = UserRole.STUDENT): AuthUser {
  const user = AuthUser.create({
    name: "테스트",
    email: "u@example.com",
    role,
  });
  user.id = "user-1";
  return user;
}

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validatePasswordConfirm", () => {
    it("비밀번호와 확인이 일치하면 통과한다", () => {
      const service = buildService(new InMemoryRevokedTokenRepository());
      expect(() =>
        service.validatePasswordConfirm("pw1234", "pw1234"),
      ).not.toThrow();
    });

    it("불일치하면 BadRequestException 을 던진다", () => {
      const service = buildService(new InMemoryRevokedTokenRepository());
      expect(() => service.validatePasswordConfirm("pw1234", "nope")).toThrow(
        BadRequestException,
      );
    });
  });

  describe("hashPassword / isPasswordMatch (해싱)", () => {
    it("평문을 그대로 저장하지 않고 bcrypt 해시를 만든다", async () => {
      const service = buildService(new InMemoryRevokedTokenRepository());
      const hash = await service.hashPassword("plain-secret");
      expect(hash).not.toBe("plain-secret");
      expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt 포맷
    });

    it("올바른 비밀번호는 매치된다", async () => {
      const service = buildService(new InMemoryRevokedTokenRepository());
      const hash = await service.hashPassword("correct-horse");
      const provider = buildEmailProvider({ password: hash });
      await expect(
        service.isPasswordMatch(provider, "correct-horse"),
      ).resolves.toBe(true);
    });

    it("틀린 비밀번호는 매치되지 않는다", async () => {
      const service = buildService(new InMemoryRevokedTokenRepository());
      const hash = await service.hashPassword("correct-horse");
      const provider = buildEmailProvider({ password: hash });
      await expect(service.isPasswordMatch(provider, "wrong-pw")).resolves.toBe(
        false,
      );
    });

    it("password 가 없는 provider 는 매치되지 않는다", async () => {
      const service = buildService(new InMemoryRevokedTokenRepository());
      const provider = buildEmailProvider({ password: null });
      await expect(service.isPasswordMatch(provider, "anything")).resolves.toBe(
        false,
      );
    });
  });

  describe("findEmailLoginUserOrFail (계정 열거 방지)", () => {
    it("user 가 null 이면 UnauthorizedException", () => {
      const service = buildService(new InMemoryRevokedTokenRepository());
      expect(() => service.findEmailLoginUserOrFail(null)).toThrow(
        UnauthorizedException,
      );
    });

    it("EMAIL provider 가 없으면 동일한 UnauthorizedException", () => {
      const service = buildService(new InMemoryRevokedTokenRepository());
      const user = buildUser();
      user.authProviders = [];
      expect(() => service.findEmailLoginUserOrFail(user)).toThrow(
        UnauthorizedException,
      );
    });

    it("EMAIL provider 가 있으면 user 와 provider 를 반환한다", () => {
      const service = buildService(new InMemoryRevokedTokenRepository());
      const user = buildUser();
      const emailProvider = buildEmailProvider();
      user.authProviders = [emailProvider];
      const result = service.findEmailLoginUserOrFail(user);
      expect(result.user).toBe(user);
      expect(result.emailProvider).toBe(emailProvider);
    });
  });

  describe("validateLoginPreConditions / verifyPasswordOrFail (잠금)", () => {
    it("lockedAt 이 있으면 ForbiddenException", () => {
      const service = buildService(new InMemoryRevokedTokenRepository());
      const provider = buildEmailProvider({ lockedAt: new Date() });
      expect(() => service.validateLoginPreConditions(provider)).toThrow(
        ForbiddenException,
      );
    });

    it("틀린 비밀번호는 UnauthorizedException(로그인 실패)", async () => {
      const service = buildService(new InMemoryRevokedTokenRepository());
      const hash = await service.hashPassword("right");
      const provider = buildEmailProvider({
        password: hash,
        failedLoginCount: 0,
      });
      await expect(
        service.verifyPasswordOrFail(provider, "wrong"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("실패 한도 직전(=한도-1)에서 틀리면 잠금 ForbiddenException 으로 전환", async () => {
      const service = buildService(new InMemoryRevokedTokenRepository());
      const hash = await service.hashPassword("right");
      const provider = buildEmailProvider({
        password: hash,
        failedLoginCount: MAX_LOGIN_ATTEMPTS - 1,
      });
      await expect(
        service.verifyPasswordOrFail(provider, "wrong"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("올바른 비밀번호는 예외 없이 통과", async () => {
      const service = buildService(new InMemoryRevokedTokenRepository());
      const hash = await service.hashPassword("right");
      const provider = buildEmailProvider({ password: hash });
      await expect(
        service.verifyPasswordOrFail(provider, "right"),
      ).resolves.toBeUndefined();
    });
  });

  describe("generateTokens", () => {
    it("access/refresh 쌍을 발급한다", () => {
      const provider = new FakeTokenProvider();
      const service = buildService(
        new InMemoryRevokedTokenRepository(),
        provider,
      );
      const tokens = service.generateTokens(buildUser());
      expect(tokens.accessToken).toContain("access-user-1");
      expect(tokens.refreshToken).toContain("refresh-user-1");
    });
  });

  describe("블랙리스트 / refresh rotation (DB-table)", () => {
    const decodableToken = "header.payload.sig";

    beforeEach(() => {
      jwtServiceStub.decode.mockImplementation(() => ({
        jti: "jti-abc",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }));
    });

    it("blacklistToken 후 validateTokenNotBlacklisted 가 거부한다", async () => {
      const repo = new InMemoryRevokedTokenRepository();
      const service = buildService(repo);

      await service.blacklistToken(decodableToken);
      await expect(
        service.validateTokenNotBlacklisted(decodableToken),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("블랙리스트에 없으면 validateTokenNotBlacklisted 가 통과한다", async () => {
      const service = buildService(new InMemoryRevokedTokenRepository());
      await expect(
        service.validateTokenNotBlacklisted(decodableToken),
      ).resolves.toBeUndefined();
    });

    it("blacklistTokenOrFail 은 최초 1회만 성공하고 재사용(reuse)을 거부한다", async () => {
      const service = buildService(new InMemoryRevokedTokenRepository());

      await expect(
        service.blacklistTokenOrFail(decodableToken),
      ).resolves.toBeUndefined();
      // 같은 jti(rotation 으로 회수된 refresh)를 다시 쓰면 거부.
      await expect(
        service.blacklistTokenOrFail(decodableToken),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("jti 추출 불가(payload null)면 INVALID_TOKEN 으로 거부", async () => {
      jwtServiceStub.decode.mockImplementation(() => null);
      const service = buildService(new InMemoryRevokedTokenRepository());
      await expect(service.blacklistToken(decodableToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
