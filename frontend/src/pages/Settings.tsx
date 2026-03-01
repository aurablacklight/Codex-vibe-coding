import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Modal from '../components/Modal';

function flattenCategories(cats: Category[]): Category[] {
  const result: Category[] = [];
  for (const cat of cats) {
    result.push(cat);
    if (cat.children) result.push(...flattenCategories(cat.children));
  }
  return result;
}

export default function Settings() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [flatCats, setFlatCats] = useState<Category[]>([]);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', color: '#6366f1', is_income: false, parent_id: '' });

  const fetchCategories = () => {
    api.get('/categories').then((res) => {
      setCategories(res.data);
      setFlatCats(flattenCategories(res.data));
    });
  };

  useEffect(() => { fetchCategories(); }, []);

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/categories', {
      name: catForm.name,
      color: catForm.color,
      is_income: catForm.is_income,
      parent_id: catForm.parent_id ? parseInt(catForm.parent_id) : null,
    });
    setCatModalOpen(false);
    setCatForm({ name: '', color: '#6366f1', is_income: false, parent_id: '' });
    fetchCategories();
  };

  const deleteCategory = async (id: number) => {
    if (!confirm('Delete this category?')) return;
    await api.delete(`/categories/${id}`);
    fetchCategories();
  };

  const exportData = async () => {
    try {
      const [accounts, transactions, budgets] = await Promise.all([
        api.get('/accounts'),
        api.get('/transactions', { params: { limit: 10000 } }),
        api.get(`/budgets/${new Date().toISOString().slice(0, 7)}`),
      ]);
      const data = {
        exported_at: new Date().toISOString(),
        accounts: accounts.data,
        transactions: transactions.data,
        budgets: budgets.data,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budgetbolt-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Profile</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Username</span>
            <span className="font-medium">{user?.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Appearance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Dark Mode</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Toggle between light and dark theme</p>
          </div>
          <button
            onClick={toggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${dark ? 'bg-brand-600' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${dark ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Categories</h3>
          <button onClick={() => setCatModalOpen(true)} className="btn-primary text-sm py-1 px-3">+ Add</button>
        </div>
        <div className="space-y-1">
          {categories.map((cat) => (
            <div key={cat.id}>
              <div className="flex items-center justify-between py-2 px-2 rounded hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="font-medium">{cat.name}</span>
                  {cat.is_income && <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">Income</span>}
                </div>
                <button onClick={() => deleteCategory(cat.id)} className="text-gray-400 hover:text-red-500 text-xs">Delete</button>
              </div>
              {cat.children?.map((child) => (
                <div key={child.id} className="flex items-center justify-between py-1.5 px-2 pl-8 rounded hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: child.color }} />
                    <span className="text-sm">{child.name}</span>
                  </div>
                  <button onClick={() => deleteCategory(child.id)} className="text-gray-400 hover:text-red-500 text-xs">Delete</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Data */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Data</h3>
        <button onClick={exportData} className="btn-secondary">Export All Data (JSON)</button>
      </div>

      {/* Add Category Modal */}
      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title="Add Category">
        <form onSubmit={addCategory} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input type="text" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Parent Category (optional)</label>
            <select value={catForm.parent_id} onChange={(e) => setCatForm({ ...catForm, parent_id: e.target.value })} className="input-field">
              <option value="">None (top-level)</option>
              {flatCats.filter(c => !c.parent_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <input type="color" value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })} className="w-12 h-8 rounded cursor-pointer" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={catForm.is_income} onChange={(e) => setCatForm({ ...catForm, is_income: e.target.checked })} className="rounded" />
            <span className="text-sm">This is an income category</span>
          </label>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setCatModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
