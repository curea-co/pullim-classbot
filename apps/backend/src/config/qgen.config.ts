import { registerAs } from "@nestjs/config";

/**
 * QGen AI 설정 — requiz 엔드포인트 접근용 feature flag + 자격증명.
 * 기본값: disabled (QGEN_ENABLED !== 'true'). 데모 좌표는 환경변수에서 빌드.
 */
export default registerAs("qgen", () => {
  const enabled = process.env.QGEN_ENABLED === "true";
  const baseUrl = process.env.QGEN_BASE_URL;
  const apiKey = process.env.QGEN_API_KEY;

  // 데모 좌표 환경변수 (모두 UUID 형식 가정).
  const demoTaskFamilyId = process.env.QGEN_DEMO_TASK_FAMILY_ID;
  const demoSubjectId = process.env.QGEN_DEMO_SUBJECT_ID;
  const demoGradeId = process.env.QGEN_DEMO_GRADE_ID;
  const demoAchievementStandardId =
    process.env.QGEN_DEMO_ACHIEVEMENT_STANDARD_ID;
  const demoSourceId = process.env.QGEN_DEMO_SOURCE_ID;

  // 데모 좌표: 모든 필수 UUID 필드가 있어야만 null 이 아님.
  const demoCoordinate =
    demoTaskFamilyId &&
    demoSubjectId &&
    demoGradeId &&
    demoAchievementStandardId &&
    demoSourceId
      ? {
          taskFamilyId: demoTaskFamilyId,
          subjectId: demoSubjectId,
          gradeId: demoGradeId,
          achievementStandardId: demoAchievementStandardId,
          sourceId: demoSourceId,
        }
      : null;

  return {
    enabled,
    baseUrl: baseUrl ?? "",
    apiKey: apiKey ?? "",
    demoCoordinate,
  };
});
