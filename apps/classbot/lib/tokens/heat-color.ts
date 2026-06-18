/**
 * Maps a focus score (0–100) to a pullim heat CSS variable string.
 * Buckets: ≥90→heat-5, ≥80→heat-4, ≥70→heat-3, ≥60→heat-2, else→heat-1.
 * Floor is heat-1 (never heat-0).
 */
export function heatColor(v: number): string {
  if (v >= 90) return 'var(--color-pullim-heat-5)';
  if (v >= 80) return 'var(--color-pullim-heat-4)';
  if (v >= 70) return 'var(--color-pullim-heat-3)';
  if (v >= 60) return 'var(--color-pullim-heat-2)';
  return 'var(--color-pullim-heat-1)';
}
