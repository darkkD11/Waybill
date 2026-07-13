import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  // Next.js core web vitals rules via the plugin's flat config
  nextPlugin.flatConfig.coreWebVitals,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Override default ignores
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
