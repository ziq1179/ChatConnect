import { rm } from "node:fs/promises";
import { build } from "esbuild";

await build({
  entryPoints: ["api/index.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: "api/index.cjs",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  logLevel: "info",
});

// On Vercel, remove the TS entry so the platform bundles api/index.cjs
// (a plain CJS file) instead of running tsc over the workspace sources.
if (process.env.VERCEL) {
  await rm("api/index.ts", { force: true });
}

console.log("Bundled serverless function -> api/index.cjs");