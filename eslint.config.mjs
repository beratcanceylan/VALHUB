import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/**
 * Repository-wide lint. Beyond code quality, it enforces architecture rules:
 * - production code never imports test fixtures
 * - UI never imports provider DTO modules
 */
export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.expo/**", "coverage/**", "android/**", "ios/**", "**/*.config.*", "**/babel.config.js", "tooling/**"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["error", { allow: ["warn", "error", "debug"] }],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}", "packages/*/src/**/*.{ts,tsx}"],
    ignores: ["packages/test-fixtures/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@valhub/test-fixtures", "**/test-fixtures/**"], message: "Fixtures are for tests only; production must not fall back to fixture data." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@valhub/test-fixtures", "**/test-fixtures/**"], message: "Fixtures are for tests only." },
            { group: ["**/adapters/**", "**/dto"], message: "UI must consume domain entities, never provider DTOs." },
          ],
          paths: [{ name: "react-native", importNames: ["Image"], message: "Use RemoteImage (expo-image, host allowlist, bounded cache)." }],
        },
      ],
    },
  },
);
