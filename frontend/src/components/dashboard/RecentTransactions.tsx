import { Transaction } from '../../types';
import { formatCurrency } from '../../utils/format';

interface Props {
  transactions: Transaction[];
}

export default function RecentTransactions({ transactions }: Props) {
  return (
    <div className="card p-4">
      <h3 className="text-base font-semibold mb-4">Recent Transactions</h3>
      <div className="space-y-2">
        {transactions.map((txn) => (
          <div
            key={txn.id}
            className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-slate-700 last:border-0"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{txn.payee}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {txn.category_name || 'Uncategorized'} &middot; {txn.date}
              </p>
            </div>
            <p
              className={`text-sm font-semibold ${
                txn.amount >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatCurrency(txn.amount)}
            </p>
          </div>
        ))}
        {transactions.length === 0 && (
          <p className="text-gray-400 text-center py-4">No transactions yet.</p>
        )}
      </div>
    </div>
  );
}
