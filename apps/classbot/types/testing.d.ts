// Global type augmentation for @testing-library/jest-dom matchers.
// This import pulls in the ambient declarations (e.g. .toBeInTheDocument())
// for every test file without requiring an explicit import in each test.
// The file is included via tsconfig.json's "include": ["**/*.ts"] glob.
import "@testing-library/jest-dom";
