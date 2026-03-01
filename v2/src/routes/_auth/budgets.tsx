import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "~convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_auth/budgets")({
  component: BudgetsPage,
});

function BudgetsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const budgets = useQuery(api.budgets.listByMonth, { month: monthStr });
  const categories = useQuery(api.categories.list);
  const upsertBudget = useMutation(api.budgets.upsert);

  const prevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const expenseCategories = categories?.filter((c) => !c.isIncome) ?? [];
  const budgetMap = new Map(budgets?.map((b) => [b.categoryId, b]) ?? []);

  const totalAssigned = budgets?.reduce((s, b) => s + b.assigned, 0) ?? 0;
  const totalSpent = budgets?.reduce((s, b) => s + b.spent, 0) ?? 0;

  const handleBudgetChange = async (
    categoryId: string,
    value: string,
  ) => {
    const amount = parseFloat(value);
    if (isNaN(amount)) return;
    try {
      await upsertBudget({
        categoryId: categoryId as any,
        month: monthStr,
        assigned: amount,
      });
    } catch {
      // silent fail for rapid typing
    }
  };

  const monthLabel = new Date(year, month - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Budgets</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[160px] text-center font-medium">
            {monthLabel}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Budgeted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalAssigned)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(totalSpent)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                totalAssigned - totalSpent >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatCurrency(totalAssigned - totalSpent)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget rows */}
      <Card>
        <CardContent className="pt-6">
          {expenseCategories.length === 0 ? (
            <p className="text-muted-foreground">
              No expense categories yet. Add some in Settings.
            </p>
          ) : (
            <div className="space-y-4">
              {expenseCategories.map((cat) => {
                const budget = budgetMap.get(cat._id);
                const assigned = budget?.assigned ?? 0;
                const spent = budget?.spent ?? 0;
                const pct = assigned > 0 ? Math.min((spent / assigned) * 100, 100) : 0;

                return (
                  <div key={cat._id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-medium">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(spent)} / {formatCurrency(assigned)}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24"
                          defaultValue={assigned || ""}
                          placeholder="0.00"
                          onBlur={(e) =>
                            handleBudgetChange(cat._id, e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <Progress
                      value={pct}
                      className={pct > 90 ? "[&>div]:bg-red-500" : ""}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
