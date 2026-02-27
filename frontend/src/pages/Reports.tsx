import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { SpendingByCategory, IncomeVsExpense, NetWorthPoint } from '../types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
  LineChart, Line,
} from 'recharts';

const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

type TabType = 'spending' | 'income-expense' | 'net-worth' | 'trends' | 'payees';

export default function Reports() {
  const [tab, setTab] = useState<TabType>('spending');
  const [spending, setSpending] = useState<SpendingByCategory[]>([]);
  const [incomeVsExpense, setIncomeVsExpense] = useState<IncomeVsExpense[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorthPoint[]>([]);
  const [trends, setTrends] = useState<{ month: string; amount: number }[]>([]);
  const [topPayees, setTopPayees] = useState<{ payee: string; amount: number; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetchers: Record<TabType, () => Promise<void>> = {
      spending: () => api.get('/reports/spending-by-category').then(r => setSpending(r.data)),
      'income-expense': () => api.get('/reports/income-vs-expense', { params: { months: 12 } }).then(r => setIncomeVsExpense(r.data)),
      'net-worth': () => api.get('/reports/net-worth').then(r => setNetWorth(r.data)),
      trends: () => api.get('/reports/trends', { params: { months: 12 } }).then(r => setTrends(r.data)),
      payees: () => api.get('/reports/top-payees', { params: { limit: 15 } }).then(r => setTopPayees(r.data)),
    };
    fetchers[tab]().catch(console.error).finally(() => setLoading(false));
  }, [tab]);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'spending', label: 'By Category' },
    { key: 'income-expense', label: 'Income vs Expense' },
    { key: 'net-worth', label: 'Net Worth' },
    { key: 'trends', label: 'Spending Trends' },
    { key: 'payees', label: 'Top Payees' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-slate-700">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      ) : (
        <div className="card p-6">
          {/* Spending by Category */}
          {tab === 'spending' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Spending by Category (Current Month)</h3>
              {spending.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie data={spending} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={2}>
                        {spending.map((entry, i) => (
                          <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {spending.sort((a, b) => b.amount - a.amount).map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color || COLORS[i % COLORS.length] }} />
                          <span className="text-sm font-medium">{s.category}</span>
                        </div>
                        <span className="text-sm font-semibold">{formatCurrency(s.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">No spending data for this period.</p>
              )}
            </div>
          )}

          {/* Income vs Expense */}
          {tab === 'income-expense' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Income vs Expenses (Last 12 Months)</h3>
              {incomeVsExpense.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={incomeVsExpense}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-400 py-8">No data yet.</p>
              )}
            </div>
          )}

          {/* Net Worth */}
          {tab === 'net-worth' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Net Worth Over Time</h3>
              {netWorth.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={netWorth}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Area type="monotone" dataKey="net_worth" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} name="Net Worth" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-400 py-8">No data yet.</p>
              )}
            </div>
          )}

          {/* Spending Trends */}
          {tab === 'trends' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Spending Trends (Last 12 Months)</h3>
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Line type="monotone" dataKey="amount" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Spending" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-400 py-8">No data yet.</p>
              )}
            </div>
          )}

          {/* Top Payees */}
          {tab === 'payees' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Top Payees (Current Month)</h3>
              {topPayees.length > 0 ? (
                <div className="space-y-3">
                  {topPayees.map((p, i) => {
                    const maxAmount = topPayees[0]?.amount || 1;
                    const pct = (p.amount / maxAmount) * 100;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{p.payee}</span>
                          <span>
                            {formatCurrency(p.amount)}
                            <span className="text-gray-400 ml-1">({p.count}x)</span>
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-brand-500 h-2 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">No data yet.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
