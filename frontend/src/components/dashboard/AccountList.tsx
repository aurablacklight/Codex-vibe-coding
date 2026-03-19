import { Account } from '../../types';
import { formatCurrency } from '../../utils/format';

const ICONS: Record<string, string> = {
  checking: '🏦',
  savings: '🐷',
  credit_card: '💳',
  cash: '💵',
  investment: '📊',
};

interface Props {
  accounts: Account[];
}

export default function AccountList({ accounts }: Props) {
  return (
    <div className="card p-4">
      <h3 className="text-base font-semibold mb-4">Accounts</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50"
          >
            <div className="text-2xl">{ICONS[acc.type] ?? '📊'}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{acc.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {acc.type.replace('_', ' ')}
              </p>
            </div>
            <p
              className={`text-sm font-semibold ${
                acc.balance >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatCurrency(acc.balance)}
            </p>
          </div>
        ))}
        {accounts.length === 0 && (
          <p className="text-gray-400 col-span-full text-center py-4">
            No accounts yet. Add one to get started!
          </p>
        )}
      </div>
    </div>
  );
}
