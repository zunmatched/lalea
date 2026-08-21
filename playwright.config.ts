import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e", fullyParallel: false, retries: 0,
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  webServer: { command: "pnpm dev", url: "http://localhost:3000/api/health/live", reuseExistingServer: true },
  projects: [{ name: "mobile-chromium", use: { ...devices["Pixel 5"] } }],
});
