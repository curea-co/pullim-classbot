import { ApiProperty } from "@nestjs/swagger";

/** 이메일 중복 확인 응답 DTO. */
export class CheckEmailResponseDto {
  @ApiProperty({ description: "사용 가능 여부 (미존재면 true)", example: true })
  available: boolean;

  /**
   * 사용 가능 여부를 응답 DTO 로 변환한다.
   * @param available - 사용 가능 여부
   * @returns CheckEmailResponseDto
   */
  static from(available: boolean): CheckEmailResponseDto {
    const dto = new CheckEmailResponseDto();
    dto.available = available;
    return dto;
  }
}
