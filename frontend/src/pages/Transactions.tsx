import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { Transaction, Account, Category } from '../types';
import Modal from '../components/Modal';

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

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [flatCats, setFlatCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Filters
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Form
  const [form, setForm] = useState({
    account_id: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    payee: '',
    amount: '',
    notes: '',
  });

  // Import
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<string[][]>([]);
  const [importMapping, setImportMapping] = useState({ date: '', payee: '', amount: '', notes: '' });
  const [importAccountId, setImportAccountId] = useState('');
  const [importStep, setImportStep] = useState(1);

  const fetchData = useCallback(() => {
    const params: any = { limit: 200 };
    if (filterAccount) params.account_id = filterAccount;
    if (filterCategory) params.category_id = filterCategory;
    if (filterSearch) params.search = filterSearch;
    if (filterStartDate) params.start_date = filterStartDate;
    if (filterEndDate) params.end_date = filterEndDate;

    Promise.all([
      api.get('/transactions', { params }),
      api.get('/accounts'),
      api.get('/categories', { params: { flat: true } }),
    ]).then(([txnRes, accRes, catRes]) => {
      setTransactions(txnRes.data);
      setAccounts(accRes.data);
      setCategories(catRes.data);
      setFlatCats(Array.isArray(catRes.data) ? flattenCategories(catRes.data) : catRes.data);
    }).finally(() => setLoading(false));
  }, [filterAccount, filterCategory, filterSearch, filterStartDate, filterEndDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditingTxn(null);
    setForm({
      account_id: accounts[0]?.id?.toString() || '',
      category_id: '',
      date: new Date().toISOString().split('T')[0],
      payee: '',
      amount: '',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEdit = (txn: Transaction) => {
    setEditingTxn(txn);
    setForm({
      account_id: txn.account_id.toString(),
      category_id: txn.category_id?.toString() || '',
      date: txn.date,
      payee: txn.payee,
      amount: txn.amount.toString(),
      notes: txn.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      account_id: parseInt(form.account_id),
      category_id: form.category_id ? parseInt(form.category_id) : null,
      date: form.date,
      payee: form.payee,
      amount: parseFloat(form.amount),
      notes: form.notes,
    };
    if (editingTxn) {
      await api.put(`/transactions/${editingTxn.id}`, data);
    } else {
      await api.post('/transactions', data);
    }
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this transaction?')) return;
    await api.delete(`/transactions/${id}`);
    fetchData();
  };

  const handleImportUpload = async () => {
    if (!importFile) return;
    const formData = new FormData();
    formData.append('file', importFile);
    const res = await api.post('/transactions/import/preview', formData);
    setImportHeaders(res.data.headers);
    setImportPreview(res.data.preview_rows);

    // Auto-map common columns
    const headers = res.data.headers.map((h: string) => h.toLowerCase());
    setImportMapping({
      date: res.data.headers[headers.findIndex((h: string) => h.includes('date'))] || '',
      payee: res.data.headers[headers.findIndex((h: string) => h.includes('desc') || h.includes('payee') || h.includes('name'))] || '',
      amount: res.data.headers[headers.findIndex((h: string) => h.includes('amount') || h.includes('sum'))] || '',
      notes: res.data.headers[headers.findIndex((h: string) => h.includes('memo') || h.includes('note'))] || '',
    });
    setImportStep(2);
  };

  const handleImportExecute = async () => {
    if (!importFile || !importAccountId) return;
    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('account_id', importAccountId);
    formData.append('column_mapping', JSON.stringify(importMapping));
    const res = await api.post('/transactions/import', formData);
    alert(`Imported ${res.data.imported} transactions!`);
    setImportModalOpen(false);
    setImportStep(1);
    setImportFile(null);
    fetchData();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search payee..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="input-field max-w-xs"
        />
        <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} className="input-field max-w-[180px]">
          <option value="">All Accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input-field max-w-[180px]">
          <option value="">All Categories</option>
          {flatCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="input-field max-w-[160px]" />
        <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="input-field max-w-[160px]" />
        <div className="ml-auto flex gap-2">
          <button onClick={() => setImportModalOpen(true)} className="btn-secondary">Import CSV</button>
          <button onClick={openCreate} className="btn-primary">+ Add</button>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700 text-left">
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Payee</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Category</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Account</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Amount</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr key={txn.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 whitespace-nowrap">{txn.date}</td>
                  <td className="px-4 py-3 font-medium">{txn.payee}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{txn.category_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{txn.account_name}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${txn.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(txn.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(txn)} className="text-gray-400 hover:text-brand-600 mr-2">Edit</button>
                    <button onClick={() => handleDelete(txn.id)} className="text-gray-400 hover:text-red-600">Del</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">💳</p>
              <p>No transactions found. Add your first transaction!</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingTxn ? 'Edit Transaction' : 'New Transaction'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payee</label>
            <input type="text" value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} className="input-field" placeholder="e.g., Grocery Store" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount (negative for expenses)</label>
            <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Account</label>
            <select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="input-field" required>
              <option value="">Select account</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input-field">
              <option value="">Uncategorized</option>
              {flatCats.map(c => <option key={c.id} value={c.id}>{c.parent_id ? '  ↳ ' : ''}{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" placeholder="Optional" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingTxn ? 'Save' : 'Add'}</button>
          </div>
        </form>
      </Modal>

      {/* Import CSV Modal */}
      <Modal open={importModalOpen} onClose={() => { setImportModalOpen(false); setImportStep(1); setImportFile(null); }} title="Import CSV">
        {importStep === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="input-field"
              />
            </div>
            <button onClick={handleImportUpload} disabled={!importFile} className="btn-primary w-full">
              Upload & Preview
            </button>
          </div>
        )}
        {importStep === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Import to Account</label>
              <select value={importAccountId} onChange={(e) => setImportAccountId(e.target.value)} className="input-field" required>
                <option value="">Select account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(['date', 'payee', 'amount', 'notes'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium mb-1 capitalize">{field} Column</label>
                  <select
                    value={importMapping[field]}
                    onChange={(e) => setImportMapping({ ...importMapping, [field]: e.target.value })}
                    className="input-field"
                  >
                    <option value="">— None —</option>
                    {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {importPreview.length > 0 && (
              <div className="overflow-x-auto">
                <p className="text-xs text-gray-500 mb-1">Preview (first {importPreview.length} rows):</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr>{importHeaders.map(h => <th key={h} className="px-2 py-1 text-left bg-gray-50 dark:bg-slate-700">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row, i) => (
                      <tr key={i}>{row.map((cell, j) => <td key={j} className="px-2 py-1 border-t border-gray-100 dark:border-slate-600">{cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={handleImportExecute} disabled={!importAccountId || !importMapping.date || !importMapping.amount} className="btn-primary w-full">
              Import Transactions
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
