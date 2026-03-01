import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const DEFAULT_CATEGORIES = [
  { name: "Salary", icon: "briefcase", color: "#22c55e", isIncome: true },
  { name: "Freelance", icon: "laptop", color: "#10b981", isIncome: true },
  { name: "Investments", icon: "trending-up", color: "#06b6d4", isIncome: true },
  { name: "Housing", icon: "home", color: "#6366f1", isIncome: false },
  { name: "Transportation", icon: "car", color: "#8b5cf6", isIncome: false },
  { name: "Food & Dining", icon: "utensils", color: "#f59e0b", isIncome: false },
  { name: "Utilities", icon: "zap", color: "#ef4444", isIncome: false },
  { name: "Healthcare", icon: "heart", color: "#ec4899", isIncome: false },
  { name: "Entertainment", icon: "film", color: "#f97316", isIncome: false },
  { name: "Shopping", icon: "shopping-bag", color: "#14b8a6", isIncome: false },
  { name: "Insurance", icon: "shield", color: "#64748b", isIncome: false },
  { name: "Personal Care", icon: "smile", color: "#d946ef", isIncome: false },
  { name: "Education", icon: "book", color: "#0ea5e9", isIncome: false },
  { name: "Subscriptions", icon: "repeat", color: "#a855f7", isIncome: false },
  { name: "Gifts & Donations", icon: "gift", color: "#e11d48", isIncome: false },
];

export const seedData = internalMutation({
  handler: async (ctx) => {
    // Check if data already exists
    const existing = await ctx.db.query("categories").first();
    if (existing) {
      console.log("Seed data already exists, skipping");
      return;
    }

    // We need a user to attach data to — this is just for demo/testing
    // In production, seed data is created per-user on first login
    const users = await ctx.db.query("users").collect();
    if (users.length === 0) {
      console.log("No users found — register first, then run seed");
      return;
    }

    const userId = users[0]._id;

    // Create categories
    const categoryIds: Record<string, Id<"categories">> = {};
    for (const cat of DEFAULT_CATEGORIES) {
      const id = await ctx.db.insert("categories", {
        userId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        isIncome: cat.isIncome,
      });
      categoryIds[cat.name] = id;
    }

    // Create accounts
    const checkingId = await ctx.db.insert("accounts", {
      userId,
      name: "Main Checking",
      type: "checking",
      balance: 5200,
      currency: "USD",
      isActive: true,
    });

    const savingsId = await ctx.db.insert("accounts", {
      userId,
      name: "Emergency Fund",
      type: "savings",
      balance: 15000,
      currency: "USD",
      isActive: true,
    });

    const creditId = await ctx.db.insert("accounts", {
      userId,
      name: "Visa Card",
      type: "credit_card",
      balance: -1250,
      currency: "USD",
      isActive: true,
    });

    // Create sample transactions for current and previous month
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonth = now.getMonth() === 0
      ? `${now.getFullYear() - 1}-12`
      : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;

    const sampleTransactions = [
      { date: `${thisMonth}-01`, payee: "Employer Inc", amount: 4500, accountId: checkingId, categoryId: categoryIds["Salary"], notes: "Monthly salary" },
      { date: `${thisMonth}-03`, payee: "Rent Payment", amount: -1800, accountId: checkingId, categoryId: categoryIds["Housing"], notes: "Monthly rent" },
      { date: `${thisMonth}-05`, payee: "Grocery Store", amount: -125.50, accountId: creditId, categoryId: categoryIds["Food & Dining"], notes: "" },
      { date: `${thisMonth}-07`, payee: "Electric Company", amount: -95.20, accountId: checkingId, categoryId: categoryIds["Utilities"], notes: "Monthly electric" },
      { date: `${thisMonth}-08`, payee: "Netflix", amount: -15.99, accountId: creditId, categoryId: categoryIds["Subscriptions"], notes: "" },
      { date: `${thisMonth}-10`, payee: "Gas Station", amount: -45.00, accountId: creditId, categoryId: categoryIds["Transportation"], notes: "" },
      { date: `${thisMonth}-12`, payee: "Restaurant", amount: -62.30, accountId: creditId, categoryId: categoryIds["Food & Dining"], notes: "Dinner out" },
      { date: `${thisMonth}-15`, payee: "Freelance Client", amount: 800, accountId: checkingId, categoryId: categoryIds["Freelance"], notes: "Web project" },
      { date: `${lastMonth}-01`, payee: "Employer Inc", amount: 4500, accountId: checkingId, categoryId: categoryIds["Salary"], notes: "Monthly salary" },
      { date: `${lastMonth}-03`, payee: "Rent Payment", amount: -1800, accountId: checkingId, categoryId: categoryIds["Housing"], notes: "Monthly rent" },
      { date: `${lastMonth}-05`, payee: "Grocery Store", amount: -145.80, accountId: creditId, categoryId: categoryIds["Food & Dining"], notes: "" },
      { date: `${lastMonth}-10`, payee: "Internet Provider", amount: -79.99, accountId: checkingId, categoryId: categoryIds["Utilities"], notes: "" },
      { date: `${lastMonth}-15`, payee: "Amazon", amount: -89.99, accountId: creditId, categoryId: categoryIds["Shopping"], notes: "Electronics" },
      { date: `${lastMonth}-20`, payee: "Doctor Visit", amount: -150.00, accountId: checkingId, categoryId: categoryIds["Healthcare"], notes: "Annual checkup" },
    ];

    for (const tx of sampleTransactions) {
      await ctx.db.insert("transactions", {
        userId,
        accountId: tx.accountId,
        categoryId: tx.categoryId,
        date: tx.date,
        payee: tx.payee,
        amount: tx.amount,
        notes: tx.notes,
        isTransfer: false,
      });
    }

    // Create budgets for current month
    const budgetItems = [
      { category: "Housing", amount: 1800 },
      { category: "Food & Dining", amount: 400 },
      { category: "Transportation", amount: 200 },
      { category: "Utilities", amount: 200 },
      { category: "Entertainment", amount: 150 },
      { category: "Shopping", amount: 100 },
      { category: "Subscriptions", amount: 50 },
      { category: "Healthcare", amount: 100 },
    ];

    for (const item of budgetItems) {
      if (categoryIds[item.category]) {
        await ctx.db.insert("budgets", {
          userId,
          categoryId: categoryIds[item.category],
          month: thisMonth,
          assigned: item.amount,
        });
      }
    }

    console.log("Seed data created successfully!");
  },
});
