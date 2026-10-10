import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  publicDir: "publico",
  build: { outDir: "distribuicao" },
  test: { include: ["testes/unidade/**/*.test.js"] },
});
