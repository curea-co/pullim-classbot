import { Injectable } from "@nestjs/common";

import { AuthUserRepositoryInterface } from "../interface/auth-user-repository.interface";

/** 이메일 사용 가능 여부를 확인하는 use-case. */
@Injectable()
export class CheckEmailUseCase {
  constructor(private readonly userRepository: AuthUserRepositoryInterface) {}

  /**
   * 이메일 사용 가능 여부를 반환한다.
   * @param email - 확인할 이메일
   * @returns available 여부
   */
  async execute(email: string): Promise<{ available: boolean }> {
    const available = await this.userRepository.isEmailAvailable(email);
    return { available };
  }
}
