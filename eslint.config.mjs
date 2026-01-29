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
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      "@typescript-eslint/no-deprecated": "error",
    },
    // 为需要类型信息的规则提供 TypeScript 配置
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  }
]);

export default eslintConfig;
