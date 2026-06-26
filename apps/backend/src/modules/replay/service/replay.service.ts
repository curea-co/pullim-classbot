import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ReplayQuestion } from "@pullim-classbot/types";

import { ReplayRequizResponseDto } from "../controller/dto/requiz-response.dto";
import { QgenUnavailableError } from "../infrastructure/qgen-unavailable.error";
import type { IQgenClient } from "../interface/qgen-client.interface";
import { QGEN_CLIENT_TOKEN } from "../interface/qgen-client.interface";

// ---------------------------------------------------------------------------
// Mock fixture — flag-off 또는 QgenUnavailableError 시 graceful degrade 폴백.
// 5지선다 형태(answerIndex 0-4)를 유지한다.
// ---------------------------------------------------------------------------

const MOCK_QUESTIONS: ReplayQuestion[] = [
  {
    stem: "다음 빈칸에 들어갈 말로 가장 적절한 것을 고르시오.",
    passage: {
      paragraphs: [
        "The ability to delay gratification is a key predictor of success.",
        "Those who can resist immediate rewards tend to achieve more in the long run.",
      ],
    },
    options: [
      "① patience",
      "② intelligence",
      "③ creativity",
      "④ ambition",
      "⑤ curiosity",
    ],
    answerIndex: 0,
    explanation:
      "글은 즉각적인 보상을 참는 능력(지연 만족)을 다루고 있으므로 'patience(인내)'가 적절하다.",
    subjectLabel: "영어 · 빈칸 추론",
  },
  {
    stem: "다음 글의 주제로 가장 적절한 것은?",
    passage: {
      paragraphs: [
        "Regular physical activity improves mental health by reducing stress hormones.",
        "Exercise also stimulates the production of endorphins, natural mood elevators.",
      ],
    },
    options: [
      "① 신체 활동과 정신 건강의 연관성",
      "② 스트레스 호르몬의 종류와 기능",
      "③ 엔도르핀 분비를 억제하는 방법",
      "④ 운동이 수면에 미치는 부정적 영향",
      "⑤ 다양한 운동 종목의 장단점 비교",
    ],
    answerIndex: 0,
    explanation:
      "신체 활동이 스트레스 호르몬 감소와 엔도르핀 증가를 통해 정신 건강을 개선한다는 내용이므로 ①이 가장 적절하다.",
    subjectLabel: "영어 · 주제",
  },
];

// ---------------------------------------------------------------------------
// ReplayService
// ---------------------------------------------------------------------------

/**
 * 재응시 requiz 비즈니스 로직.
 * - qgen.enabled flag 가 false 면 즉시 mock 폴백(degraded: true).
 * - enabled 면 IQgenClient 를 통해 실 문항을 요청한다.
 * - QgenUnavailableError 발생 시 mock 폴백으로 graceful degrade — 예외를 전파하지 않는다.
 */
@Injectable()
export class ReplayService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(QGEN_CLIENT_TOKEN) private readonly qgen: IQgenClient,
  ) {}

  async requiz(replayId: string): Promise<ReplayRequizResponseDto> {
    const enabled = this.configService.get<boolean>("qgen.enabled");

    if (!enabled) {
      return this.buildMockResponse(replayId);
    }

    try {
      const result = await this.qgen.requiz({ count: 5 });
      const dto = new ReplayRequizResponseDto();
      dto.replayId = replayId;
      dto.attemptId = result.setQuestionId;
      dto.questions = result.questions;
      dto.degraded = false;
      dto.generatedAt = new Date().toISOString();
      return dto;
    } catch (err) {
      if (err instanceof QgenUnavailableError) {
        return this.buildMockResponse(replayId);
      }
      // 예상치 못한 에러는 전파한다.
      throw err;
    }
  }

  private buildMockResponse(replayId: string): ReplayRequizResponseDto {
    const dto = new ReplayRequizResponseDto();
    dto.replayId = replayId;
    dto.attemptId = `mock-${replayId}`;
    dto.questions = MOCK_QUESTIONS;
    dto.degraded = true;
    dto.generatedAt = new Date().toISOString();
    return dto;
  }
}
