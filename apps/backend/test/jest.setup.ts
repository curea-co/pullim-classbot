/**
 * 백엔드 단위 테스트 전역 셋업.
 * NestJS 엔티티/프로바이더는 데코레이터 메타데이터에 의존하므로 reflect-metadata 를
 * 모든 테스트보다 먼저 로드한다.
 */
import "reflect-metadata";
