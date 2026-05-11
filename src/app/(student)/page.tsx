import { redirect } from 'next/navigation';

/**
 * 학생 루트 — 풀림 클래스봇 추출본의 단일 도메인으로 즉시 이동.
 * 원본 풀림 스터디 데모의 6 도메인 카드 홈은 클래스봇만 남으면서 불필요.
 */
export default function StudentRootPage() {
  redirect('/classbot');
}
