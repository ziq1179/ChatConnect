import { build } from "esbuild";

const entry = "functions/index.ts";
const outfile = "api/index.js";

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  logLevel: "info",
  sourcemap: false,
  banner: {
    js: `import { createRequire } from "node:module";\nconst require = createRequire(import.meta.url);`,
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});