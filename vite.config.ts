/// <reference types="vitest/config" />

import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), ...(process.env.VITEST ? [] : [reactRouter()])],
  test: {
    environment: "jsdom",
    setupFiles: ["./app/test/setup.ts"],
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: ["app/**/*.{ts,tsx}"],
      exclude: [
        "app/**/*.test.{ts,tsx}",
        "app/test/**",
        "app/+types/**",
        "app/root.tsx",
        "app/routes.ts",
      ],
    },
  },
})
