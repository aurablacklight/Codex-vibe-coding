import { SpendingByCategory } from '../../types';
import { formatCurrency } from '../../utils/format';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

const COLORS = [
  '#6366f1',
  '#f59e0b',
  '#ef4444',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

interface Props {
  data: SpendingByCategory[];
}

export default function SpendingPieChart({ data }: Props) {
  return (
    <div className="card p-4">
      <h3 className="text-base font-semibold mb-4">Spending by Category</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={data[i].color || COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          No spending data yet
        </div>
      )}
    </div>
  );
}
