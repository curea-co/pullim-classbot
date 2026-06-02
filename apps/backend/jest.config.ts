import type { Config } from "jest";

/**
 * NestJS 백엔드 단위 테스트 설정. ts-jest 로 .spec.ts 를 실행한다.
 * 데코레이터 메타데이터가 필요한 클래스를 다루므로 reflect-metadata 를 선로딩한다.
 */
const config: Config = {
  displayName: "backend",
  rootDir: "src",
  testEnvironment: "node",
  moduleFileExtensions: ["js", "json", "ts"],
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/../tsconfig.json",
      },
    ],
  },
  setupFiles: ["<rootDir>/../test/jest.setup.ts"],
  collectCoverageFrom: ["**/*.ts", "!**/*.module.ts", "!**/main.ts"],
  coverageDirectory: "../coverage",
};

export default config;
