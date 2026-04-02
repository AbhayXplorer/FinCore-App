import { Router } from "express";
import { db } from "./db.ts";
import { authenticateToken, authorizeRoles } from "./auth.ts";

export const userRouter = Router();

// Get all users (Admin only)
userRouter.get("/", authenticateToken, authorizeRoles("admin"), (req, res) => {
  try {
    const users = db.prepare("SELECT id, username, email, role, status, created_at FROM users").all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Update user status/role (Admin only)
userRouter.put("/:id", authenticateToken, authorizeRoles("admin"), (req, res) => {
  const { id } = req.params;
  const { role, status } = req.body;

  try {
    db.prepare("UPDATE users SET role = ?, status = ? WHERE id = ?").run(role, status, id);
    res.json({ message: "User updated" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update user" });
  }
});
