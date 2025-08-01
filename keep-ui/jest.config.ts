import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    // Handle module aliases
    "^@/(.*)$": "<rootDir>/$1",
    // Force module uuid to resolve with the CJS entry point, because Jest does not support package.json.exports. See https://github.com/uuidjs/uuid/issues/451
    uuid: require.resolve("uuid"),
    "^yaml$": require.resolve("yaml"),
    // Mock monaco-editor modules
    "^monaco-editor$": "<rootDir>/__mocks__/monaco-editor.js",
    "^@monaco-editor/react$": "<rootDir>/__mocks__/@monaco-editor/react.js",
  },
  // Transform ESM packages
  transformIgnorePatterns: [
    "node_modules/(?!(jose|@segment/analytics-node|@copilotkit)/)"
  ],
  // Add more setup options before each test is run
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
