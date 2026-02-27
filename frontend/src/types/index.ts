export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface Account {
  id: number;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment';
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  icon: string;
  color: string;
  is_income: boolean;
  created_at: string;
  children: Category[];
}

export interface Transaction {
  id: number;
  account_id: number;
  category_id: number | null;
  date: string;
  payee: string;
  amount: number;
  notes: string;
  is_transfer: boolean;
  transfer_account_id: number | null;
  recurring_id: number | null;
  created_at: string;
  account_name?: string;
  category_name?: string;
}

export interface Budget {
  id: number;
  category_id: number;
  month: string;
  assigned: number;
  spent: number;
  remaining: number;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  created_at: string;
}

export interface RecurringTransaction {
  id: number;
  account_id: number;
  category_id: number | null;
  payee: string;
  amount: number;
  frequency: string;
  start_date: string;
  end_date: string | null;
  next_due: string;
  is_active: boolean;
  created_at: string;
  account_name?: string;
  category_name?: string;
}

export interface SpendingByCategory {
  category: string;
  color: string;
  icon: string;
  amount: number;
}

export interface IncomeVsExpense {
  month: string;
  income: number;
  expense: number;
}

export interface NetWorthPoint {
  month: string;
  net_worth: number;
}
