import { gradingQueue, gradingHistory, overriddenSample } from '@/lib/mock';
import { monitoredClass, monitoredRoster } from '../classbot-monitoring';
import { allGradingItems, gradingItemsOfStudent } from '../classbot-grading-roster';

/**
 * 채점 시드가 **학생 명단과 같은 모집단**인지 지키는 회귀 (spec 11 § 7.1).
 *
 * 예전에는 채점 시드가 `classRoster`(중2 수학 A반)를, 학생 목록·상세는 `monitoredRoster`
 * (중1-3반 과학)를 읽어서 두 화면이 **다른 반의 다른 학생**을 보고 있었다. 채점 항목에서
 * 학생을 눌러 들어가면 수학 제출물을 보러 왔는데 과학 대화가 열렸다.
 * 시드를 `monitoredRoster` 로 옮겨 모집단을 하나로 맞췄고, 여기서 그게 유지되는지 본다.
 *
 * ── 2026-09-18 · 케이스 여섯을 걷었다 ──────────────────────────────────────
 * 채점 허브가 목을 걷으면서 `buildGradingRoster()`·`GradingRosterRow`·`studentHrefOfGrading()` 이
 * 함께 사라졌다(소비처가 그 화면뿐이었다). 그것들을 단언하던 케이스가 지키던 것과, 지금 그것을
 * 누가 지키는가:
 *  - 「확정한 채점을 얹으면 그 학생의 대기가 줄어든다」 — 확정을 시드 위에 얹는 일 자체는
 *    `lib/store/__tests__/grading.test.ts` 의 `mergeGradingItems` 케이스가 그대로 지킨다.
 *    **학생별로 다시 세는 부분**만 함께 사라졌다 — 그 함수가 없어졌기 때문이다.
 *  - 「등록 학생 전원이 줄을 갖는다」·「대기 0건인 학생도 빠지지 않는다」·「학생별 대기 합계 =
 *    큐 전체 대기」·「지금 검수할 한 건은 신뢰도가 가장 낮은 항목」 — 전부 사라진 함수의 계약이라
 *    **대신 지킬 곳이 없다.** 같은 규칙이 필요해지는 날은 정본에 채점 문이 열리는 날이다.
 *  - 「학생 상세로 가는 링크가 되돌아갈 곳을 넘긴다」 — 링크를 만들던 채점 상세 화면이 사라졌다.
 *    `?from=` 을 읽는 쪽(`students/[id]/entry-source.ts`)은 그 트리의 테스트가 지킨다.
 *
 * 남은 것은 **학생 상세가 아직 읽는 둘**(`allGradingItems`·`gradingItemsOfStudent`)이고,
 * 이 파일이 지키는 것도 그 둘이 가리키는 학생이 명단과 어긋나지 않는다는 사실 하나다.
 */

describe('채점 시드는 학생 명단과 같은 모집단이다', () => {
  const rosterIds = new Set(monitoredRoster.map(s => s.id));

  it('모든 채점 항목이 학생 명단의 학생을 가리킨다', () => {
    expect(allGradingItems.length).toBe(gradingQueue.length + 1);
    for (const item of allGradingItems) {
      expect(rosterIds.has(item.studentId)).toBe(true);
    }
  });

  it('이름도 명단 이름 그대로다 — 화면마다 이름이 갈리지 않는다', () => {
    for (const item of allGradingItems) {
      const student = monitoredRoster.find(s => s.id === item.studentId);
      expect(item.studentName).toBe(student?.name);
    }
  });

  it('과목·단원도 그 학생들의 수업이다', () => {
    // 학생 상세 헤더가 말하는 수업과 채점 항목의 수업이 같아야 한다.
    for (const item of allGradingItems) {
      expect(item.topic).toContain(monitoredClass.unit);
    }
  });

  it('채점 이력도 같은 학생을 가리킨다', () => {
    // 학생 상세의 채점 패널이 studentId 로 곧장 찾는다.
    for (const entry of gradingHistory) {
      expect(rosterIds.has(entry.studentId)).toBe(true);
    }
    const withHistory = new Set(gradingHistory.map(h => h.studentId));
    for (const item of gradingQueue) {
      expect(withHistory.has(item.studentId)).toBe(true);
    }
  });
});

describe('gradingItemsOfStudent — 학생 상세가 읽는다', () => {
  it('그 학생 앞으로 온 항목만 돌려준다', () => {
    expect(gradingItemsOfStudent('m09').map(i => i.id)).toEqual([overriddenSample.id]);
  });

  it('채점 항목이 없는 학생은 빈 배열', () => {
    expect(gradingItemsOfStudent('m20')).toEqual([]);
  });
});
