export type Role = "admin" | "analyst" | "viewer";
export type TransactionType = "income" | "expense";

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  status: "active" | "inactive";
  created_at: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  username?: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  description: string;
  created_at: string;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
  categorySummary: {
    category: string;
    total: number;
    type: TransactionType;
  }[];
  recentActivity: Transaction[];
}
