import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Account, Transaction, SpendingByCategory, IncomeVsExpense, Budget } from '../types';
import SummaryCards from '../components/dashboard/SummaryCards';
import SpendingPieChart from '../components/dashboard/SpendingPieChart';
import IncomeExpenseChart from '../components/dashboard/IncomeExpenseChart';
import BudgetProgress from '../components/dashboard/BudgetProgress';
import AccountList from '../components/dashboard/AccountList';
import RecentTransactions from '../components/dashboard/RecentTransactions';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
    </div>
  );
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
    ])
      .then(([accRes, txnRes, spendRes, iveRes, budRes]) => {
        setAccounts(accRes.data);
        setTransactions(txnRes.data);
        setSpending(spendRes.data);
        setIncomeVsExpense(iveRes.data);
        setBudgets(budRes.data);
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <SummaryCards accounts={accounts} incomeVsExpense={incomeVsExpense} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingPieChart data={spending} />
        <IncomeExpenseChart data={incomeVsExpense} />
      </div>

      <BudgetProgress budgets={budgets} />
      <AccountList accounts={accounts} />
      <RecentTransactions transactions={transactions} />
    </div>
  );
}
