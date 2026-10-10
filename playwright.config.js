import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./testes/navegacao",
  outputDir: "./relatorios/navegacao",
  reporter: [
    ["list"],
    ["html", { outputFolder: "relatorios/html", open: "never" }],
  ],
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
  projects: [
    { name: "computador", use: { ...devices["Desktop Chrome"] } },
    {
      name: "celular",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
