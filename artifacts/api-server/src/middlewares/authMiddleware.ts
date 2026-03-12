import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
    isAuthenticated(): this is Request & { user: NonNullable<Request["user"]> };
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  req.isAuthenticated = function () {
    return !!this.user;
  };

  const userId = req.session?.userId;
  if (userId) {
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .then((rows) => rows[0]);

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    }
  }

  next();
}
