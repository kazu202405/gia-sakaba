import { defineConfig } from "vitest/config";
import path from "node:path";

// "@/..." を tsconfig と同じくプロジェクトルートに解決する。
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
  },
});
