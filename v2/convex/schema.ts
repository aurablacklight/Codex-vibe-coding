import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  accounts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    type: v.union(
      v.literal("checking"),
      v.literal("savings"),
      v.literal("credit_card"),
      v.literal("cash"),
      v.literal("investment"),
    ),
    balance: v.number(),
    currency: v.string(),
    isActive: v.boolean(),
  }).index("by_userId", ["userId"]),

  categories: defineTable({
    userId: v.id("users"),
    name: v.string(),
    parentId: v.optional(v.id("categories")),
    icon: v.string(),
    color: v.string(),
    isIncome: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_parent", ["userId", "parentId"]),

  transactions: defineTable({
    userId: v.id("users"),
    accountId: v.id("accounts"),
    categoryId: v.optional(v.id("categories")),
    date: v.string(),
    payee: v.string(),
    amount: v.number(),
    notes: v.string(),
    isTransfer: v.boolean(),
    transferAccountId: v.optional(v.id("accounts")),
    recurringId: v.optional(v.id("recurringTransactions")),
  })
    .index("by_userId", ["userId"])
    .index("by_account", ["accountId"])
    .index("by_userId_date", ["userId", "date"])
    .index("by_category", ["userId", "categoryId"])
    .index("by_recurring", ["recurringId"]),

  budgets: defineTable({
    userId: v.id("users"),
    categoryId: v.id("categories"),
    month: v.string(),
    assigned: v.number(),
  })
    .index("by_userId_month", ["userId", "month"])
    .index("by_unique", ["userId", "categoryId", "month"]),

  recurringTransactions: defineTable({
    userId: v.id("users"),
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
    nextDue: v.string(),
    isActive: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_due", ["userId", "isActive", "nextDue"]),
});
