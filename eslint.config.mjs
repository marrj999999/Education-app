import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Dev-only debug scripts (not production code)
    "scripts/**",
    // Test coverage
    "coverage/**",
    // Playwright artifacts
    "playwright-report/**",
    "test-results/**",
  ]),
  // Custom rules
  {
    rules: {
      // Disable React Compiler/Hooks warnings that are optimization hints, not bugs
      // These rules are from Next.js 15+ React Compiler integration
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/refs": "warn",
      // Downgrade explicit any to warning - Notion API types are complex
      // TODO: Add proper types to Notion-related files
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
