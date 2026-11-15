import { defineConfig } from "@playwright/test";

const liveUrl = process.env.FIRELENS_TEST_URL;

export default defineConfig({
  testDir: "./e2e",
  workers: 2,
  use: { baseURL: liveUrl ?? "http://127.0.0.1:4173", browserName: "chromium" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  webServer: liveUrl ? undefined : {
    command: "python3 -m http.server 4173 --bind 127.0.0.1 --directory out",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
