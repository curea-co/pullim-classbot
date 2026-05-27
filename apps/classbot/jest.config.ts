import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  displayName: "classbot",
  testEnvironment: "jsdom",
  passWithNoTests: true,
  setupFilesAfterEnv: ["<rootDir>/../../config/jest.setup.ts", "<rootDir>/test/setup.ts"],
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/tests/e2e/",
  ],
  moduleDirectories: ["node_modules", "<rootDir>/node_modules", "<rootDir>/../../node_modules"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@pullim-classbot/api-client$": "<rootDir>/../../packages/api-client/src/index.ts",
    "^@pullim-classbot/api-client/(.*)$": "<rootDir>/../../packages/api-client/src/$1.ts",
    "^@pullim-classbot/auth$": "<rootDir>/../../packages/auth/src/index.ts",
    "^@pullim-classbot/auth/(.*)$": "<rootDir>/../../packages/auth/src/$1.ts",
    "^@pullim-classbot/types$": "<rootDir>/../../packages/types/src/index.ts",
    "^@pullim-classbot/types/(.*)$": "<rootDir>/../../packages/types/src/$1.ts",
  },
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],
};

export default createJestConfig(config);
