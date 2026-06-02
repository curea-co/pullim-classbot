import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { Public } from "../../../common/decorators/public.decorator";
import { JwtRefreshGuard } from "../../../common/guards/jwt-refresh.guard";
import { AuthUser } from "../../../entities/auth-user.entity";
import { CheckEmailQueryDto } from "./dto/check-email-query.dto";
import { CheckEmailResponseDto } from "./dto/check-email-response.dto";
import { LoginDto } from "./dto/login.dto";
import { LogoutDto } from "./dto/logout.dto";
import { SignupDto } from "./dto/signup.dto";
import { SignupResponseDto } from "./dto/signup-response.dto";
import { TokenResponseDto } from "./dto/token-response.dto";
import { CheckEmailUseCase } from "../use-cases/check-email.use-case";
import { LoginUseCase } from "../use-cases/login.use-case";
import { LogoutUseCase } from "../use-cases/logout.use-case";
import { RefreshUseCase } from "../use-cases/refresh.use-case";
import { SignupUseCase } from "../use-cases/signup.use-case";

/** 인증 컨트롤러. HTTP/DTO 처리만 담당하고 모든 로직은 use-case 에 위임한다. */
@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly signupUseCase: SignupUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly checkEmailUseCase: CheckEmailUseCase,
  ) {}

  @Public()
  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  /** 이메일 회원가입을 수행한다. */
  async signup(@Body() dto: SignupDto): Promise<SignupResponseDto> {
    const result = await this.signupUseCase.execute(dto);
    return SignupResponseDto.from(result);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  /** 이메일과 비밀번호로 로그인한다. */
  async login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    const tokens = await this.loginUseCase.execute(dto);
    return TokenResponseDto.from(tokens);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  /** Refresh Token 으로 새 토큰 쌍을 발급한다. */
  async refresh(
    @CurrentUser() currentUser: { user: AuthUser; refreshToken: string },
  ): Promise<TokenResponseDto> {
    const tokens = await this.refreshUseCase.execute(
      currentUser.user,
      currentUser.refreshToken,
    );
    return TokenResponseDto.from(tokens);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  /** 로그아웃한다. Refresh Token 을 블랙리스트에 등록한다. (인증 필요) */
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.logoutUseCase.execute(dto.refreshToken);
  }

  @Public()
  @Get("check-email")
  /** 이메일 중복 여부를 확인한다. */
  async checkEmail(
    @Query() query: CheckEmailQueryDto,
  ): Promise<CheckEmailResponseDto> {
    const { available } = await this.checkEmailUseCase.execute(query.email);
    return CheckEmailResponseDto.from(available);
  }
}
