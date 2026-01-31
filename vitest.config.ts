/**
 * Vitest Configuration for Security Tests
 */

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "security",
    include: ["__tests__/security/**/*.test.ts"],
    environment: "node",
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ["__tests__/security/setup.ts"],
    reporters: ["default", "verbose"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/lib/sanitize.ts", "src/lib/csrf.ts", "src/lib/encryption.ts", "src/lib/rate-limit*.ts"],
      exclude: ["node_modules", "__tests__"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
