import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Account, Transaction, SpendingByCategory, IncomeVsExpense, Budget } from '../types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [spending, setSpending] = useState<SpendingByCategory[]>([]);
  const [incomeVsExpense, setIncomeVsExpense] = useState<IncomeVsExpense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7);
    Promise.all([
      api.get('/accounts'),
      api.get('/transactions', { params: { limit: 10 } }),
      api.get('/reports/spending-by-category'),
      api.get('/reports/income-vs-expense'),
      api.get(`/budgets/${month}`),
    ]).then(([accRes, txnRes, spendRes, iveRes, budRes]) => {
      setAccounts(accRes.data);
      setTransactions(txnRes.data);
      setSpending(spendRes.data);
      setIncomeVsExpense(iveRes.data);
      setBudgets(budRes.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const monthIncome = incomeVsExpense.length > 0 ? incomeVsExpense[incomeVsExpense.length - 1]?.income || 0 : 0;
  const monthExpense = incomeVsExpense.length > 0 ? incomeVsExpense[incomeVsExpense.length - 1]?.expense || 0 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Balance</p>
          <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(totalBalance)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Income</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(monthIncome)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Expenses</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(monthExpense)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Net This Month</p>
          <p className={`text-2xl font-bold ${monthIncome - monthExpense >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(monthIncome - monthExpense)}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category Pie Chart */}
        <div className="card p-4">
          <h3 className="text-base font-semibold mb-4">Spending by Category</h3>
          {spending.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={spending}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {spending.map((entry, i) => (
                    <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">No spending data yet</div>
          )}
        </div>

        {/* Income vs Expense Bar Chart */}
        <div className="card p-4">
          <h3 className="text-base font-semibold mb-4">Income vs Expenses</h3>
          {incomeVsExpense.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={incomeVsExpense}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">No data yet</div>
          )}
        </div>
      </div>

      {/* Budget Progress */}
      {budgets.length > 0 && (
        <div className="card p-4">
          <h3 className="text-base font-semibold mb-4">Budget Progress</h3>
          <div className="space-y-3">
            {budgets.slice(0, 8).map((b) => {
              const pct = b.assigned > 0 ? Math.min((b.spent / b.assigned) * 100, 100) : 0;
              const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500';
              return (
                <div key={b.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{b.category_name}</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {formatCurrency(b.spent)} / {formatCurrency(b.assigned)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Account Balances */}
      <div className="card p-4">
        <h3 className="text-base font-semibold mb-4">Accounts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
              <div className="text-2xl">
                {acc.type === 'checking' ? '🏦' : acc.type === 'savings' ? '🐷' : acc.type === 'credit_card' ? '💳' : acc.type === 'cash' ? '💵' : '📊'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{acc.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{acc.type.replace('_', ' ')}</p>
              </div>
              <p className={`text-sm font-semibold ${acc.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(acc.balance)}
              </p>
            </div>
          ))}
          {accounts.length === 0 && (
            <p className="text-gray-400 col-span-full text-center py-4">No accounts yet. Add one to get started!</p>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card p-4">
        <h3 className="text-base font-semibold mb-4">Recent Transactions</h3>
        <div className="space-y-2">
          {transactions.map((txn) => (
            <div key={txn.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{txn.payee}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {txn.category_name || 'Uncategorized'} &middot; {txn.date}
                </p>
              </div>
              <p className={`text-sm font-semibold ${txn.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(txn.amount)}
              </p>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="text-gray-400 text-center py-4">No transactions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
