import { Router, type IRouter } from "express";
import { like, or, ne } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { SearchUsersQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users/search", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const queryParams = SearchUsersQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  const { q } = queryParams.data;
  const currentUserId = req.user.id;
  const searchTerm = `%${q}%`;

  const users = await db
    .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(usersTable)
    .where(
      or(
        like(usersTable.firstName, searchTerm),
        like(usersTable.lastName, searchTerm),
        like(usersTable.email, searchTerm)
      )
    )
    .limit(20);

  res.json(
    users
      .filter((u) => u.id !== currentUserId)
      .map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName }))
  );
});

export default router;
