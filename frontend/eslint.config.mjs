import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "lib/quiz-pubsub.ts",
      "lib/quiz-timer-service.ts", 
      "lib/use-quiz-events.ts",
      "lib/use-sse.ts",
      "lib/live-quiz-client.ts",
      "app/api/auth/passkey/**",
      "app/api/quizblitz/**"
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off", // Too noisy in this codebase
      "@typescript-eslint/no-explicit-any": "off", // Legacy code with many any types
      "@typescript-eslint/no-unsafe-function-type": "off",
      "react/no-unescaped-entities": "warn",
      "react-hooks/exhaustive-deps": "off",
      "prefer-const": "off",
      // Focus only on critical errors
      "no-undef": "off", // Turn off since Next.js handles React imports
      "no-unused-vars": "off", // Use TypeScript version instead
      "no-unreachable": "error"
    }
  }
];

export default eslintConfig;
