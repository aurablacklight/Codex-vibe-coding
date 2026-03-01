import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Account } from '../types';
import Modal from '../components/Modal';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking', icon: '🏦' },
  { value: 'savings', label: 'Savings', icon: '🐷' },
  { value: 'credit_card', label: 'Credit Card', icon: '💳' },
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'investment', label: 'Investment', icon: '📊' },
];

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form, setForm] = useState({ name: '', type: 'checking', balance: '0' });

  const fetchAccounts = () => {
    api.get('/accounts').then((res) => setAccounts(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAccounts(); }, []);

  const openCreate = () => {
    setEditingAccount(null);
    setForm({ name: '', type: 'checking', balance: '0' });
    setModalOpen(true);
  };

  const openEdit = (acc: Account) => {
    setEditingAccount(acc);
    setForm({ name: acc.name, type: acc.type, balance: String(acc.balance) });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name: form.name, type: form.type, balance: parseFloat(form.balance) || 0 };
    if (editingAccount) {
      await api.put(`/accounts/${editingAccount.id}`, data);
    } else {
      await api.post('/accounts', data);
    }
    setModalOpen(false);
    fetchAccounts();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    await api.delete(`/accounts/${id}`);
    fetchAccounts();
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total across all accounts</p>
          <p className={`text-3xl font-bold ${totalBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(totalBalance)}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ Add Account</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const typeInfo = ACCOUNT_TYPES.find(t => t.value === acc.type);
          return (
            <div key={acc.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="text-3xl">{typeInfo?.icon || '🏦'}</div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(acc)} className="text-gray-400 hover:text-brand-600 text-sm p-1">Edit</button>
                  <button onClick={() => handleDelete(acc.id)} className="text-gray-400 hover:text-red-600 text-sm p-1">Delete</button>
                </div>
              </div>
              <h3 className="font-semibold text-lg">{acc.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 capitalize">{acc.type.replace('_', ' ')}</p>
              <p className={`text-2xl font-bold ${acc.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(acc.balance)}
              </p>
            </div>
          );
        })}
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-5xl mb-4">🏦</p>
          <p className="text-gray-500 dark:text-gray-400 mb-4">No accounts yet. Create your first account to get started!</p>
          <button onClick={openCreate} className="btn-primary">Create Account</button>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingAccount ? 'Edit Account' : 'New Account'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Account Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field"
              placeholder="e.g., Main Checking"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Account Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="input-field"
            >
              {ACCOUNT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>
          {!editingAccount && (
            <div>
              <label className="block text-sm font-medium mb-1">Starting Balance</label>
              <input
                type="number"
                step="0.01"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
                className="input-field"
              />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingAccount ? 'Save' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
