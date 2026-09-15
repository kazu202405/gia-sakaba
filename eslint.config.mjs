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
    // ブラウザ標準ダイアログの禁止（全プロジェクト共通ルール）。
    // OSごとに見た目が変わりアプリの外側で出るため、「操作の続き」ではなく
    // 「異常が起きた」と読まれる。文言も配置も調整できない。
    // 代わりに lib/ui-dialog.ts の uiConfirm / uiAlert / uiPrompt / uiToast を使う。
    rules: {
      "no-alert": "error",
      "no-restricted-globals": [
        "error",
        {
          name: "alert",
          message: "uiAlert / uiToast（@/lib/ui-dialog）を使ってください",
        },
        {
          name: "confirm",
          message: "uiConfirm（@/lib/ui-dialog）を使ってください",
        },
        {
          name: "prompt",
          message: "uiPrompt（@/lib/ui-dialog）を使ってください",
        },
      ],
    },
  },
]);

export default eslintConfig;
