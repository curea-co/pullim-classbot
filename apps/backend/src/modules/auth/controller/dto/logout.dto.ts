import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/** 로그아웃 요청 DTO. */
export class LogoutDto {
  @ApiProperty({
    description: "무효화할 Refresh Token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
