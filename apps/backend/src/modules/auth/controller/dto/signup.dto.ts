import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PASSWORD_PATTERN,
} from "../../../../common/constants/validation.constant";
import { UserRole } from "../../../../entities/enums/user-role.enum";

/** 이메일 회원가입 요청 DTO. */
export class SignupDto {
  @ApiProperty({ description: "이름", example: "김선생" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "이메일", example: "teacher@pullim.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "비밀번호", example: "securePass1!" })
  @IsString()
  @IsNotEmpty()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(MAX_PASSWORD_LENGTH)
  @Matches(PASSWORD_PATTERN, {
    message: "비밀번호는 영문·숫자·특수문자를 각 1개 이상 포함해야 합니다.",
  })
  password: string;

  @ApiProperty({ description: "비밀번호 확인", example: "securePass1!" })
  @IsString()
  @IsNotEmpty()
  passwordConfirm: string;

  @ApiPropertyOptional({
    description: "역할 (미지정 시 student)",
    enum: UserRole,
    example: UserRole.TEACHER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
