import { Module } from "@nestjs/common";

import { AssignmentInterventionsController } from "./controller/assignment-interventions.controller";
import { InterventionsController } from "./controller/interventions.controller";
import { InterventionRepository } from "./infrastructure/intervention.repository";
import { INTERVENTION_REPOSITORY_TOKEN } from "./interface/intervention-repository.interface";
import { InterventionService } from "./service/intervention.service";
import { ListAssignmentInterventionsUseCase } from "./use-cases/list-assignment-interventions.use-case";
import { ListInterventionsUseCase } from "./use-cases/list-interventions.use-case";
import { MarkAllInterventionsReadUseCase } from "./use-cases/mark-all-interventions-read.use-case";
import { MarkInterventionReadUseCase } from "./use-cases/mark-intervention-read.use-case";
import { SendInterventionsUseCase } from "./use-cases/send-interventions.use-case";

/**
 * intervention 도메인 모듈 — interventions (M2, 교사 개입 루프의 실전판).
 * IInterventionRepository 는 INTERVENTION_REPOSITORY_TOKEN Symbol 로만
 * 바인딩한다(assignment/classroom 패턴 미러). 도메인 테이블 접근은 raw SQL
 * 리포지토리(TypeOrmModule.forRoot 가 전역 등록한 DataSource 주입) 하나로
 * 캡슐화한다. `/api/assignments/:id/interventions` 라우트도 도메인 응집을
 * 위해 이 모듈이 소유한다.
 */
@Module({
  controllers: [InterventionsController, AssignmentInterventionsController],
  providers: [
    {
      provide: INTERVENTION_REPOSITORY_TOKEN,
      useClass: InterventionRepository,
    },
    InterventionService,
    SendInterventionsUseCase,
    ListInterventionsUseCase,
    MarkInterventionReadUseCase,
    MarkAllInterventionsReadUseCase,
    ListAssignmentInterventionsUseCase,
  ],
})
export class InterventionModule {}
