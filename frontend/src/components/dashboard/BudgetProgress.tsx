import { Budget } from '../../types';
import { formatCurrency } from '../../utils/format';

interface Props {
  budgets: Budget[];
}

export default function BudgetProgress({ budgets }: Props) {
  if (budgets.length === 0) return null;

  return (
    <div className="card p-4">
      <h3 className="text-base font-semibold mb-4">Budget Progress</h3>
      <div className="space-y-3">
        {budgets.slice(0, 8).map((b) => {
          const pct = b.assigned > 0 ? Math.min((b.spent / b.assigned) * 100, 100) : 0;
          const color =
            pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500';
          return (
            <div key={b.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{b.category_name}</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {formatCurrency(b.spent)} / {formatCurrency(b.assigned)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className={`${color} h-2 rounded-full transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
