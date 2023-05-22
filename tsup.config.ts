import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["deployments/index.ts"],
  outDir: "dist",
  splitting: false,
  sourcemap: false,
  clean: true,
  dts: true,
  format: ["esm", "cjs"],
  minify: false,
});
