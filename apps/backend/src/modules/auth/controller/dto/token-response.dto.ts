import { ApiProperty } from "@nestjs/swagger";

/** 토큰 발급 응답 DTO. */
export class TokenResponseDto {
  @ApiProperty({
    description: "Access Token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  accessToken: string;

  @ApiProperty({
    description: "Refresh Token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  refreshToken: string;

  /**
   * 토큰 쌍을 응답 DTO 로 변환한다.
   * @param tokens - accessToken, refreshToken
   * @returns TokenResponseDto
   */
  static from(tokens: {
    accessToken: string;
    refreshToken: string;
  }): TokenResponseDto {
    const dto = new TokenResponseDto();
    dto.accessToken = tokens.accessToken;
    dto.refreshToken = tokens.refreshToken;
    return dto;
  }
}
