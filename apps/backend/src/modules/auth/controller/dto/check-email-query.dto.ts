import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

/** 이메일 중복 확인 쿼리 DTO. */
export class CheckEmailQueryDto {
  @ApiProperty({ description: "확인할 이메일", example: "teacher@pullim.com" })
  @IsEmail()
  email: string;
}
