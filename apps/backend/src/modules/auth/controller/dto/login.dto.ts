import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

/** 이메일 로그인 요청 DTO. */
export class LoginDto {
  @ApiProperty({ description: "이메일", example: "teacher@pullim.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "비밀번호", example: "securePass1!" })
  @IsString()
  @IsNotEmpty()
  password: string;
}
