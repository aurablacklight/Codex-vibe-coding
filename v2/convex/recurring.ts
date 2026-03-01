import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { cronJobs } from "convex/server";

export const list = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("recurringTransactions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    accountId: v.id("accounts"),
    categoryId: v.optional(v.id("categories")),
    payee: v.string(),
    amount: v.number(),
    frequency: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("monthly"),
      v.literal("yearly"),
    ),
    startDate: v.string(),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return ctx.db.insert("recurringTransactions", {
      userId,
      accountId: args.accountId,
      categoryId: args.categoryId,
      payee: args.payee,
      amount: args.amount,
      frequency: args.frequency,
      startDate: args.startDate,
      endDate: args.endDate,
      nextDue: args.startDate,
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("recurringTransactions"),
    payee: v.optional(v.string()),
    amount: v.optional(v.number()),
    frequency: v.optional(
      v.union(
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("biweekly"),
        v.literal("monthly"),
        v.literal("yearly"),
      ),
    ),
    endDate: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const rec = await ctx.db.get(args.id);
    if (!rec || rec.userId !== userId) throw new Error("Not found");
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    return ctx.db.patch(id, filtered);
  },
});

export const remove = mutation({
  args: { id: v.id("recurringTransactions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const rec = await ctx.db.get(args.id);
    if (!rec || rec.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});

function getNextDue(currentDue: string, frequency: string): string {
  const date = new Date(currentDue);
  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "biweekly":
      date.setDate(date.getDate() + 14);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date.toISOString().split("T")[0];
}

export const processRecurring = internalMutation({
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];
    const allRecurring = await ctx.db.query("recurringTransactions").collect();
    const due = allRecurring.filter(
      (r) => r.isActive && r.nextDue <= today && (!r.endDate || r.endDate >= today),
    );

    for (const rec of due) {
      // Create transaction
      await ctx.db.insert("transactions", {
        userId: rec.userId,
        accountId: rec.accountId,
        categoryId: rec.categoryId,
        date: rec.nextDue,
        payee: rec.payee,
        amount: rec.amount,
        notes: "Auto-generated from recurring",
        isTransfer: false,
        recurringId: rec._id,
      });

      // Update account balance
      const account = await ctx.db.get(rec.accountId);
      if (account) {
        await ctx.db.patch(rec.accountId, {
          balance: account.balance + rec.amount,
        });
      }

      // Advance next due date
      const nextDue = getNextDue(rec.nextDue, rec.frequency);
      if (rec.endDate && nextDue > rec.endDate) {
        await ctx.db.patch(rec._id, { isActive: false, nextDue });
      } else {
        await ctx.db.patch(rec._id, { nextDue });
      }
    }
  },
});
