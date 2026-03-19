import { Account, IncomeVsExpense } from '../../types';
import { formatCurrency } from '../../utils/format';

interface Props {
  accounts: Account[];
  incomeVsExpense: IncomeVsExpense[];
}

export default function SummaryCards({ accounts, incomeVsExpense }: Props) {
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const currentMonth = incomeVsExpense[incomeVsExpense.length - 1];
  const monthIncome = currentMonth?.income ?? 0;
  const monthExpense = currentMonth?.expense ?? 0;
  const netThisMonth = monthIncome - monthExpense;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="card p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Total Balance</p>
        <p
          className={`text-2xl font-bold ${
            totalBalance >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {formatCurrency(totalBalance)}
        </p>
      </div>
      <div className="card p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Income</p>
        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
          {formatCurrency(monthIncome)}
        </p>
      </div>
      <div className="card p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Expenses</p>
        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
          {formatCurrency(monthExpense)}
        </p>
      </div>
      <div className="card p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Net This Month</p>
        <p
          className={`text-2xl font-bold ${
            netThisMonth >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {formatCurrency(netThisMonth)}
        </p>
      </div>
    </div>
  );
}
