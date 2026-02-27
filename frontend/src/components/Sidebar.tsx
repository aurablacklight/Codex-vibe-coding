import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/accounts', label: 'Accounts', icon: '🏦' },
  { path: '/transactions', label: 'Transactions', icon: '💳' },
  { path: '/budgets', label: 'Budgets', icon: '📋' },
  { path: '/reports', label: 'Reports', icon: '📈' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200 dark:border-slate-700">
        <span className="text-2xl">⚡</span>
        <h1 className="text-xl font-bold text-brand-600 dark:text-brand-400">BudgetBolt</h1>
        <button onClick={onClose} className="ml-auto lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400">
          ✕
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold text-sm">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{user?.username}</p>
          </div>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-red-500 transition-colors text-sm"
            title="Logout"
          >
            ↪
          </button>
        </div>
      </div>
    </div>
  );
}
