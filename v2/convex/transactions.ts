import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    accountId: v.optional(v.id("accounts")),
    categoryId: v.optional(v.id("categories")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let q;
    if (args.accountId) {
      q = ctx.db
        .query("transactions")
        .withIndex("by_account", (q) => q.eq("accountId", args.accountId!));
    } else if (args.categoryId) {
      q = ctx.db
        .query("transactions")
        .withIndex("by_category", (q) =>
          q.eq("userId", userId).eq("categoryId", args.categoryId!),
        );
    } else {
      q = ctx.db
        .query("transactions")
        .withIndex("by_userId", (q) => q.eq("userId", userId));
    }

    let results = await q.collect();

    // Filter by date range
    if (args.startDate) {
      results = results.filter((t) => t.date >= args.startDate!);
    }
    if (args.endDate) {
      results = results.filter((t) => t.date <= args.endDate!);
    }

    // Filter by search (payee or notes)
    if (args.search) {
      const s = args.search.toLowerCase();
      results = results.filter(
        (t) =>
          t.payee.toLowerCase().includes(s) ||
          t.notes.toLowerCase().includes(s),
      );
    }

    // Sort by date descending
    results.sort((a, b) => (b.date > a.date ? 1 : -1));

    // Limit
    if (args.limit) {
      results = results.slice(0, args.limit);
    }

    return results;
  },
});

export const create = mutation({
  args: {
    accountId: v.id("accounts"),
    categoryId: v.optional(v.id("categories")),
    date: v.string(),
    payee: v.string(),
    amount: v.number(),
    notes: v.optional(v.string()),
    isTransfer: v.optional(v.boolean()),
    transferAccountId: v.optional(v.id("accounts")),
    recurringId: v.optional(v.id("recurringTransactions")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const txId = await ctx.db.insert("transactions", {
      userId,
      accountId: args.accountId,
      categoryId: args.categoryId,
      date: args.date,
      payee: args.payee,
      amount: args.amount,
      notes: args.notes ?? "",
      isTransfer: args.isTransfer ?? false,
      transferAccountId: args.transferAccountId,
      recurringId: args.recurringId,
    });

    // Update account balance
    const account = await ctx.db.get(args.accountId);
    if (account) {
      await ctx.db.patch(args.accountId, {
        balance: account.balance + args.amount,
      });
    }

    // If transfer, create opposite transaction and update other account
    if (args.isTransfer && args.transferAccountId) {
      const otherAccount = await ctx.db.get(args.transferAccountId);
      if (otherAccount) {
        await ctx.db.insert("transactions", {
          userId,
          accountId: args.transferAccountId,
          categoryId: args.categoryId,
          date: args.date,
          payee: args.payee,
          amount: -args.amount,
          notes: args.notes ?? "",
          isTransfer: true,
          transferAccountId: args.accountId,
        });
        await ctx.db.patch(args.transferAccountId, {
          balance: otherAccount.balance - args.amount,
        });
      }
    }

    return txId;
  },
});

export const update = mutation({
  args: {
    id: v.id("transactions"),
    accountId: v.optional(v.id("accounts")),
    categoryId: v.optional(v.id("categories")),
    date: v.optional(v.string()),
    payee: v.optional(v.string()),
    amount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const tx = await ctx.db.get(args.id);
    if (!tx || tx.userId !== userId) throw new Error("Not found");

    // If amount changed, update account balance
    if (args.amount !== undefined && args.amount !== tx.amount) {
      const account = await ctx.db.get(tx.accountId);
      if (account) {
        await ctx.db.patch(tx.accountId, {
          balance: account.balance - tx.amount + args.amount,
        });
      }
    }

    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    return ctx.db.patch(id, filtered);
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const tx = await ctx.db.get(args.id);
    if (!tx || tx.userId !== userId) throw new Error("Not found");

    // Update account balance
    const account = await ctx.db.get(tx.accountId);
    if (account) {
      await ctx.db.patch(tx.accountId, {
        balance: account.balance - tx.amount,
      });
    }

    await ctx.db.delete(args.id);
  },
});
