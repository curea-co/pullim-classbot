import { Inject, Injectable } from "@nestjs/common";

import {
  unauthorized,
  validationError,
} from "../../classroom/infrastructure/domain-http.error";
import type { AssignmentsReadResponseDto } from "../controller/dto/assignment-responses.dto";
import {
  ASSIGNMENT_REPOSITORY_TOKEN,
  IAssignmentRepository,
} from "../interface/assignment-repository.interface";

/**
 * assignment 도메인 비즈니스 로직 — assignments / assignment_questions /
 * submissions (spec §4.5 + M2 개정 §3).
 *
 * 응답·에러 형태는 spec §3 을 따른다: 성공은 데이터 그대로, 에러는
 * { error: { code, message } } 봉투 — 봉투 헬퍼는 classroom 의
 * domain-http.error 를 재사용한다(순수 함수라 모듈 결합 없음, 봉투 구현
 * 이중화 방지).
 */
@Injectable()
export class AssignmentService {
  constructor(
    @Inject(ASSIGNMENT_REPOSITORY_TOKEN)
    private readonly repository: IAssignmentRepository,
  ) {}

  /**
   * 내 과제 목록 (spec §4.5 — `GET /api/assignments?audience=student|teacher`).
   *
   * 학생: enrolled 봇 스코프 + 대상 필터(student_id NULL=전체 enrolled, 또는 본인).
   * 교사: 소유 봇 스코프의 발사 과제 전체.
   * @param audience - 'student' | 'teacher'
   * @param userId - 요청 사용자 id (JWT 또는 x-user-id)
   */
  async listAssignments(
    audience: string | undefined,
    userId: string | undefined,
  ): Promise<AssignmentsReadResponseDto> {
    if (audience !== "student" && audience !== "teacher") {
      throw validationError(
        "audience 쿼리는 student 또는 teacher 여야 합니다.",
      );
    }
    const requesterId = this.requireUserId(userId);

    const assignments =
      audience === "student"
        ? await this.repository.findAssignmentsForStudent(requesterId)
        : await this.repository.findAssignmentsForTeacher(requesterId);
    return { assignments };
  }

  /** 신원이 없으면 401 봉투 — M2 개정 §3 (무신원 mock 폴백 폐지). */
  private requireUserId(userId: string | undefined): string {
    if (!userId) {
      throw unauthorized("로그인이 필요합니다.");
    }
    return userId;
  }
}
