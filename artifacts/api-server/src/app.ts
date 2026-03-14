import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import { authMiddleware } from "./middlewares/authMiddleware";
import router from "./routes";

const PgSession = connectPgSimple(session);

const app: Express = express();

// Trust Render's (and similar) reverse proxy so that
// req.secure is correct and Secure cookies work over HTTPS
app.set("trust proxy", 1);

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionSecret = process.env.SESSION_SECRET || "dev-secret-change-in-production";

app.use(
  session({
    store: new PgSession({ pool, createTableIfMissing: true }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

app.use(authMiddleware);
app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  // process.argv[1] = path to running script (e.g. dist/index.cjs)
  // works in both ESM and esbuild-bundled CJS without import.meta.url
  const scriptDir = path.dirname(process.argv[1]);
  const frontendDist = path.resolve(scriptDir, "public");
  app.use(express.static(frontendDist));
  // SPA catch-all: serve index.html for any unmatched GET request
  // Use middleware form (not app.get("*")) for Express 5 compatibility
  app.use((req, res, next) => {
    if (req.method === "GET") {
      res.sendFile(path.join(frontendDist, "index.html"));
    } else {
      next();
    }
  });
}

export default app;
