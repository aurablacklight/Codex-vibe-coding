import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listByMonth = query({
  args: { month: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_userId_month", (q) =>
        q.eq("userId", userId).eq("month", args.month),
      )
      .collect();

    // Calculate spent for each budget
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const monthTxns = transactions.filter((t) =>
      t.date.startsWith(args.month),
    );

    return budgets.map((budget) => {
      const spent = monthTxns
        .filter((t) => t.categoryId === budget.categoryId && t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      return { ...budget, spent };
    });
  },
});

export const upsert = mutation({
  args: {
    categoryId: v.id("categories"),
    month: v.string(),
    assigned: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check for existing budget
    const existing = await ctx.db
      .query("budgets")
      .withIndex("by_unique", (q) =>
        q
          .eq("userId", userId)
          .eq("categoryId", args.categoryId)
          .eq("month", args.month),
      )
      .first();

    if (existing) {
      return ctx.db.patch(existing._id, { assigned: args.assigned });
    }

    return ctx.db.insert("budgets", {
      userId,
      categoryId: args.categoryId,
      month: args.month,
      assigned: args.assigned,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("budgets"),
    assigned: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const budget = await ctx.db.get(args.id);
    if (!budget || budget.userId !== userId) throw new Error("Not found");
    return ctx.db.patch(args.id, { assigned: args.assigned });
  },
});
