import { Router } from "express";
import { db } from "./db.ts";
import { authenticateToken, authorizeRoles } from "./auth.ts";

export const financeRouter = Router();

// Get all transactions (Filtered by role/user)
financeRouter.get("/transactions", authenticateToken, (req: any, res) => {
  try {
    let transactions;
    if (req.user.role === "admin" || req.user.role === "analyst") {
      transactions = db.prepare("SELECT t.*, u.username FROM transactions t JOIN users u ON t.user_id = u.id ORDER BY date DESC").all();
    } else {
      transactions = db.prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC").all(req.user.id);
    }
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// Create transaction (Admin only for others, or self)
financeRouter.post("/transactions", authenticateToken, authorizeRoles("admin", "analyst"), (req: any, res) => {
  const { amount, type, category, date, description, user_id } = req.body;
  const targetUserId = user_id || req.user.id;

  try {
    const result = db.prepare(
      "INSERT INTO transactions (user_id, amount, type, category, date, description) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(targetUserId, amount, type, category, date, description);

    res.status(201).json({ id: result.lastInsertRowid, message: "Transaction created" });
  } catch (error) {
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

// Update transaction
financeRouter.put("/transactions/:id", authenticateToken, authorizeRoles("admin"), (req, res) => {
  const { id } = req.params;
  const { amount, type, category, date, description } = req.body;

  try {
    db.prepare(
      "UPDATE transactions SET amount = ?, type = ?, category = ?, date = ?, description = ? WHERE id = ?"
    ).run(amount, type, category, date, description, id);
    res.json({ message: "Transaction updated" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update transaction" });
  }
});

// Delete transaction
financeRouter.delete("/transactions/:id", authenticateToken, authorizeRoles("admin"), (req, res) => {
  const { id } = req.params;
  try {
    db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
    res.json({ message: "Transaction deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

// Summary Analytics
financeRouter.get("/summary", authenticateToken, (req: any, res) => {
  try {
    const userId = req.user.id;
    const isAdminOrAnalyst = req.user.role === "admin" || req.user.role === "analyst";

    const queryBase = isAdminOrAnalyst ? "" : "WHERE user_id = " + userId;

    const summary = db.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpenses,
        COUNT(*) as transactionCount
      FROM transactions
      ${queryBase}
    `).get();

    const categorySummary = db.prepare(`
      SELECT category, SUM(amount) as total, type
      FROM transactions
      ${queryBase}
      GROUP BY category, type
    `).all();

    const recentActivity = db.prepare(`
      SELECT t.*, u.username 
      FROM transactions t 
      JOIN users u ON t.user_id = u.id 
      ${isAdminOrAnalyst ? "" : "WHERE t.user_id = " + userId}
      ORDER BY t.created_at DESC LIMIT 5
    `).all();

    res.json({
      ...summary,
      netBalance: (summary.totalIncome || 0) - (summary.totalExpenses || 0),
      categorySummary,
      recentActivity
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});
