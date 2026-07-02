import { Module } from "@nestjs/common";

import { AssignmentsController } from "./controller/assignments.controller";
import { AssignmentRepository } from "./infrastructure/assignment.repository";
import { ASSIGNMENT_REPOSITORY_TOKEN } from "./interface/assignment-repository.interface";
import { AssignmentService } from "./service/assignment.service";
import { ListAssignmentsUseCase } from "./use-cases/list-assignments.use-case";

/**
 * assignment 도메인 모듈 — assignments / assignment_questions / submissions (M2).
 * IAssignmentRepository 는 ASSIGNMENT_REPOSITORY_TOKEN Symbol 로만 바인딩한다
 * (classroom 패턴 미러). 도메인 테이블 접근은 raw SQL 리포지토리
 * (TypeOrmModule.forRoot 가 전역 등록한 DataSource 주입) 하나로 캡슐화한다.
 */
@Module({
  controllers: [AssignmentsController],
  providers: [
    { provide: ASSIGNMENT_REPOSITORY_TOKEN, useClass: AssignmentRepository },
    AssignmentService,
    ListAssignmentsUseCase,
  ],
})
export class AssignmentModule {}
