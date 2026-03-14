import path from "path";
import { fileURLToPath } from "url";
import { build as esbuild } from "esbuild";
import { rm, readFile, cp } from "fs/promises";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times without risking some
// packages that are not bundle compatible
const allowlist = [
  "@google/generative-ai",
  "axios",
  "bcryptjs",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  const distDir = path.resolve(__dirname, "dist");
  await rm(distDir, { recursive: true, force: true });

  console.log("pushing database schema...");
  execSync("pnpm --filter @workspace/db run push-force", {
    cwd: path.resolve(__dirname, "..", ".."),
    stdio: "inherit",
  });

  console.log("building frontend...");
  const frontendDir = path.resolve(__dirname, "..", "messaging-app");
  execSync("pnpm --filter @workspace/messaging-app run build", {
    cwd: path.resolve(__dirname, "..", ".."),
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "production",
      BASE_PATH: "/",
      PORT: "3000",
    },
  });

  console.log("copying frontend to dist/public...");
  const frontendDist = path.resolve(frontendDir, "dist", "public");
  const serverPublic = path.resolve(distDir, "public");
  await cp(frontendDist, serverPublic, { recursive: true });

  console.log("building server...");
  const pkgPath = path.resolve(__dirname, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter(
    (dep) =>
      !allowlist.includes(dep) &&
      !(pkg.dependencies?.[dep]?.startsWith("workspace:")),
  );

  await esbuild({
    entryPoints: [path.resolve(__dirname, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.resolve(distDir, "index.cjs"),
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("done! dist/index.cjs + dist/public/");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
