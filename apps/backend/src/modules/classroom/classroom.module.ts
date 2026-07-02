import { Module } from "@nestjs/common";

import { BotsController } from "./controller/bots.controller";
import { ClassroomsController } from "./controller/classrooms.controller";
import { EnrollmentsController } from "./controller/enrollments.controller";
import { ClassroomRepository } from "./infrastructure/classroom.repository";
import { CLASSROOM_REPOSITORY_TOKEN } from "./interface/classroom-repository.interface";
import { ClassroomService } from "./service/classroom.service";
import { GetBotUseCase } from "./use-cases/get-bot.use-case";
import { IssueJoinCodeUseCase } from "./use-cases/issue-join-code.use-case";
import { JoinByCodeUseCase } from "./use-cases/join-by-code.use-case";
import { ListBotsUseCase } from "./use-cases/list-bots.use-case";
import { ListClassroomsUseCase } from "./use-cases/list-classrooms.use-case";

/**
 * classroom 도메인 모듈 — bots / classrooms / enrollments / join_codes (M2).
 * IClassroomRepository 는 CLASSROOM_REPOSITORY_TOKEN Symbol 로만 바인딩한다
 * (replay 의 QGEN_CLIENT_TOKEN 패턴). 도메인 테이블 접근은 raw SQL 리포지토리
 * (TypeOrmModule.forRoot 가 전역 등록한 DataSource 주입) 하나로 캡슐화한다.
 */
@Module({
  controllers: [BotsController, ClassroomsController, EnrollmentsController],
  providers: [
    { provide: CLASSROOM_REPOSITORY_TOKEN, useClass: ClassroomRepository },
    ClassroomService,
    ListBotsUseCase,
    GetBotUseCase,
    ListClassroomsUseCase,
    JoinByCodeUseCase,
    IssueJoinCodeUseCase,
  ],
})
export class ClassroomModule {}
