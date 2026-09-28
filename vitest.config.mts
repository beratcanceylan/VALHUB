import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["packages/*/test/**/*.test.ts"],
          environment: "node",
          env: { NODE_ENV: "test" },
        },
      },
    ],
  },
});
