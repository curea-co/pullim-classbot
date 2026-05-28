/**
 * 필수 입력 항목 표시 — 빨간 별표.
 * 다음 단계로 진행하기 위해 사용자가 반드시 직접 입력해야 하는 필드 라벨에만 사용.
 * 기본값(default value)이 합리적으로 채워지는 슬라이더·라디오·토글에는 사용하지 않음.
 */
export function RequiredMark() {
  return (
    <span
      className="text-pullim-danger ml-0.5 inline-block font-bold"
      aria-label="필수 입력"
    >
      *
    </span>
  );
}
