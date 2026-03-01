import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const spendingByCategory = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let transactions = await ctx.db
      .query("transactions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    if (args.startDate) transactions = transactions.filter((t) => t.date >= args.startDate!);
    if (args.endDate) transactions = transactions.filter((t) => t.date <= args.endDate!);

    // Only expenses
    transactions = transactions.filter((t) => t.amount < 0 && !t.isTransfer);

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const catMap = new Map(categories.map((c) => [c._id, c]));
    const grouped = new Map<string, { name: string; color: string; total: number }>();

    for (const tx of transactions) {
      const cat = tx.categoryId ? catMap.get(tx.categoryId) : null;
      const key = cat?._id ?? "uncategorized";
      const existing = grouped.get(key) ?? {
        name: cat?.name ?? "Uncategorized",
        color: cat?.color ?? "#94a3b8",
        total: 0,
      };
      existing.total += Math.abs(tx.amount);
      grouped.set(key, existing);
    }

    return [...grouped.values()].sort((a, b) => b.total - a.total);
  },
});

export const incomeVsExpense = query({
  args: { months: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const numMonths = args.months ?? 6;
    const now = new Date();
    const result = [];

    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      const transactions = await ctx.db
        .query("transactions")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();

      const monthTxns = transactions.filter(
        (t) => t.date.startsWith(month) && !t.isTransfer,
      );

      const income = monthTxns
        .filter((t) => t.amount > 0)
        .reduce((s, t) => s + t.amount, 0);
      const expenses = monthTxns
        .filter((t) => t.amount < 0)
        .reduce((s, t) => s + Math.abs(t.amount), 0);

      result.push({ month, income, expenses });
    }

    return result;
  },
});

export const netWorth = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Sort transactions by date
    transactions.sort((a, b) => (a.date > b.date ? 1 : -1));

    // Calculate running total by month
    const monthlyTotals = new Map<string, number>();
    let runningTotal = 0;

    for (const tx of transactions) {
      runningTotal += tx.amount;
      const month = tx.date.substring(0, 7);
      monthlyTotals.set(month, runningTotal);
    }

    return [...monthlyTotals.entries()].map(([month, total]) => ({
      month,
      netWorth: total,
    }));
  },
});

export const topPayees = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let transactions = await ctx.db
      .query("transactions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    if (args.startDate) transactions = transactions.filter((t) => t.date >= args.startDate!);
    if (args.endDate) transactions = transactions.filter((t) => t.date <= args.endDate!);

    transactions = transactions.filter((t) => t.amount < 0 && !t.isTransfer);

    const payeeMap = new Map<string, number>();
    for (const tx of transactions) {
      payeeMap.set(tx.payee, (payeeMap.get(tx.payee) ?? 0) + Math.abs(tx.amount));
    }

    return [...payeeMap.entries()]
      .map(([payee, total]) => ({ payee, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, args.limit ?? 10);
  },
});
