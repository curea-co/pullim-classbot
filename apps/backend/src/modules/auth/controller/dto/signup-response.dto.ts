import { ApiProperty } from "@nestjs/swagger";

import { UserRole } from "../../../../entities/enums/user-role.enum";

/** 회원가입 응답 DTO. */
export class SignupResponseDto {
  @ApiProperty({
    description: "사용자 ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  id: string;

  @ApiProperty({ description: "이메일", example: "teacher@pullim.com" })
  email: string;

  @ApiProperty({
    description: "역할",
    enum: UserRole,
    example: UserRole.TEACHER,
  })
  role: UserRole;

  @ApiProperty({
    description: "Access Token",
    example: "eyJhbGciOiJIUzI1NiIs...",
  })
  accessToken: string;

  @ApiProperty({
    description: "Refresh Token",
    example: "eyJhbGciOiJIUzI1NiIs...",
  })
  refreshToken: string;

  /**
   * 회원가입 결과를 응답 DTO 로 변환한다.
   * @param params - 회원가입 결과
   * @returns SignupResponseDto
   */
  static from(params: {
    id: string;
    email: string;
    role: UserRole;
    accessToken: string;
    refreshToken: string;
  }): SignupResponseDto {
    const dto = new SignupResponseDto();
    dto.id = params.id;
    dto.email = params.email;
    dto.role = params.role;
    dto.accessToken = params.accessToken;
    dto.refreshToken = params.refreshToken;
    return dto;
  }
}
