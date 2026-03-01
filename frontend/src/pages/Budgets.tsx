import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Budget, Category } from '../types';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function flattenCategories(cats: Category[]): Category[] {
  const result: Category[] = [];
  for (const cat of cats) {
    result.push(cat);
    if (cat.children) result.push(...flattenCategories(cat.children));
  }
  return result;
}

export default function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [flatCats, setFlatCats] = useState<Category[]>([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatId, setNewCatId] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const fetchBudgets = () => {
    setLoading(true);
    Promise.all([
      api.get(`/budgets/${month}`),
      api.get('/categories', { params: { flat: true } }),
    ]).then(([budRes, catRes]) => {
      setBudgets(budRes.data);
      setCategories(catRes.data);
      setFlatCats(Array.isArray(catRes.data) ? flattenCategories(catRes.data) : catRes.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchBudgets(); }, [month]);

  const prevMonth = () => {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() - 1);
    setMonth(d.toISOString().slice(0, 7));
  };

  const nextMonth = () => {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() + 1);
    setMonth(d.toISOString().slice(0, 7));
  };

  const startEdit = (b: Budget) => {
    setEditingId(b.id);
    setEditValue(b.assigned.toString());
  };

  const saveEdit = async (b: Budget) => {
    const newAssigned = parseFloat(editValue) || 0;
    await api.post('/budgets', {
      category_id: b.category_id,
      month: month,
      assigned: newAssigned,
    });
    setEditingId(null);
    fetchBudgets();
  };

  const addBudget = async () => {
    if (!newCatId || !newAmount) return;
    await api.post('/budgets', {
      category_id: parseInt(newCatId),
      month: month,
      assigned: parseFloat(newAmount),
    });
    setAddingCategory(false);
    setNewCatId('');
    setNewAmount('');
    fetchBudgets();
  };

  const totalAssigned = budgets.reduce((sum, b) => sum + b.assigned, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = budgets.reduce((sum, b) => sum + b.remaining, 0);

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="btn-secondary px-3 py-1">&larr;</button>
        <h2 className="text-xl font-bold">{monthLabel}</h2>
        <button onClick={nextMonth} className="btn-secondary px-3 py-1">&rarr;</button>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Budgeted</p>
          <p className="text-xl font-bold text-brand-600 dark:text-brand-400">{formatCurrency(totalAssigned)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Spent</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
          <p className={`text-xl font-bold ${totalRemaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(totalRemaining)}
          </p>
        </div>
      </div>

      {/* Budget Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700 text-left">
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Category</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Budgeted</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Spent</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Remaining</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 w-48">Progress</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((b) => {
              const pct = b.assigned > 0 ? Math.min((b.spent / b.assigned) * 100, 100) : 0;
              const barColor = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500';

              return (
                <tr key={b.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.category_color || '#6366f1' }} />
                      <span className="font-medium">{b.category_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === b.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(b)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(b)}
                        className="input-field w-24 text-right text-sm py-1"
                        autoFocus
                      />
                    ) : (
                      <button onClick={() => startEdit(b)} className="hover:text-brand-600 cursor-pointer">
                        {formatCurrency(b.assigned)}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{formatCurrency(b.spent)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${b.remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(b.remaining)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                      <div className={`${barColor} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {budgets.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p>No budgets for this month. Add categories below!</p>
          </div>
        )}
      </div>

      {/* Add Budget */}
      {addingCategory ? (
        <div className="card p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Category</label>
              <select value={newCatId} onChange={(e) => setNewCatId(e.target.value)} className="input-field">
                <option value="">Select category</option>
                {flatCats.filter(c => !c.is_income && !budgets.some(b => b.category_id === c.id)).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium mb-1">Amount</label>
              <input type="number" step="0.01" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="input-field" />
            </div>
            <button onClick={addBudget} className="btn-primary">Add</button>
            <button onClick={() => setAddingCategory(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingCategory(true)} className="btn-secondary w-full">+ Add Budget Category</button>
      )}
    </div>
  );
}
