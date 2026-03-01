import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "~convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Wallet, TrendingDown, TrendingUp, PiggyBank } from "lucide-react";

export const Route = createFileRoute("/_auth/")({
  component: DashboardPage,
});

function DashboardPage() {
  const accounts = useQuery(api.accounts.list);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const budgets = useQuery(api.budgets.listByMonth, { month: currentMonth });
  const transactions = useQuery(api.transactions.list, {
    startDate: `${currentMonth}-01`,
    endDate: `${currentMonth}-31`,
  });

  const totalBalance = accounts?.reduce((sum, a) => (a.isActive ? sum + a.balance : sum), 0) ?? 0;

  const monthlyIncome =
    transactions?.filter((t) => t.amount > 0 && !t.isTransfer).reduce((s, t) => s + t.amount, 0) ?? 0;

  const monthlyExpenses =
    transactions?.filter((t) => t.amount < 0 && !t.isTransfer).reduce((s, t) => s + Math.abs(t.amount), 0) ?? 0;

  const totalBudgeted = budgets?.reduce((s, b) => s + b.assigned, 0) ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Balance"
          value={formatCurrency(totalBalance)}
          icon={Wallet}
        />
        <SummaryCard
          title="Monthly Income"
          value={formatCurrency(monthlyIncome)}
          icon={TrendingUp}
          className="text-green-600 dark:text-green-400"
        />
        <SummaryCard
          title="Monthly Expenses"
          value={formatCurrency(monthlyExpenses)}
          icon={TrendingDown}
          className="text-red-600 dark:text-red-400"
        />
        <SummaryCard
          title="Total Budgeted"
          value={formatCurrency(totalBudgeted)}
          icon={PiggyBank}
        />
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <p className="text-muted-foreground">
              No transactions this month. Add some to get started!
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx._id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{tx.payee}</p>
                    <p className="text-sm text-muted-foreground">{tx.date}</p>
                  </div>
                  <span
                    className={
                      tx.amount >= 0
                        ? "font-semibold text-green-600 dark:text-green-400"
                        : "font-semibold text-red-600 dark:text-red-400"
                    }
                  >
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  className,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${className ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
