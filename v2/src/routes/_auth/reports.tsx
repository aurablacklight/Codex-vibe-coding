import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "~convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_auth/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const spendingByCategory = useQuery(api.reports.spendingByCategory, {});
  const incomeVsExpense = useQuery(api.reports.incomeVsExpense, { months: 6 });
  const netWorth = useQuery(api.reports.netWorth);
  const topPayees = useQuery(api.reports.topPayees, {});

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>

      <Tabs defaultValue="spending">
        <TabsList>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="income-expense">Income vs Expense</TabsTrigger>
          <TabsTrigger value="net-worth">Net Worth</TabsTrigger>
          <TabsTrigger value="payees">Top Payees</TabsTrigger>
        </TabsList>

        <TabsContent value="spending">
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {!spendingByCategory || spendingByCategory.length === 0 ? (
                <p className="text-muted-foreground">No spending data yet.</p>
              ) : (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendingByCategory}
                        dataKey="total"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={150}
                        label={({ name, total }) =>
                          `${name}: ${formatCurrency(total)}`
                        }
                      >
                        {spendingByCategory.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income-expense">
          <Card>
            <CardHeader>
              <CardTitle>Income vs Expenses (6 months)</CardTitle>
            </CardHeader>
            <CardContent>
              {!incomeVsExpense || incomeVsExpense.length === 0 ? (
                <p className="text-muted-foreground">No data yet.</p>
              ) : (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incomeVsExpense}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      <Bar dataKey="income" fill="#22c55e" name="Income" />
                      <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="net-worth">
          <Card>
            <CardHeader>
              <CardTitle>Net Worth Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {!netWorth || netWorth.length === 0 ? (
                <p className="text-muted-foreground">No data yet.</p>
              ) : (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={netWorth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Area
                        type="monotone"
                        dataKey="netWorth"
                        stroke="#6366f1"
                        fill="#6366f180"
                        name="Net Worth"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payees">
          <Card>
            <CardHeader>
              <CardTitle>Top Payees</CardTitle>
            </CardHeader>
            <CardContent>
              {!topPayees || topPayees.length === 0 ? (
                <p className="text-muted-foreground">No data yet.</p>
              ) : (
                <div className="space-y-3">
                  {topPayees.map((p, i) => (
                    <div
                      key={p.payee}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          #{i + 1}
                        </span>
                        <span className="font-medium">{p.payee}</span>
                      </div>
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(p.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
