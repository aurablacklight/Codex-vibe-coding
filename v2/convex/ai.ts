import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

const SYSTEM_PROMPT = `You are a helpful personal finance assistant. You analyze spending patterns,
provide budget recommendations, and help users understand their financial health.
Be specific with numbers and actionable with advice. Use markdown formatting.`;

export const gatherFinancialContext = internalQuery({
  args: { userId: v.id("users"), months: v.number() },
  handler: async (ctx, args) => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - args.months);
    const cutoff = cutoffDate.toISOString().split("T")[0];

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const recentTxns = transactions.filter((t) => t.date >= cutoff);

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const catMap = new Map(categories.map((c) => [c._id, c.name]));

    const totalIncome = recentTxns
      .filter((t) => t.amount > 0 && !t.isTransfer)
      .reduce((s, t) => s + t.amount, 0);

    const totalExpenses = recentTxns
      .filter((t) => t.amount < 0 && !t.isTransfer)
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    // Group spending by category
    const categorySpending = new Map<string, number>();
    for (const tx of recentTxns.filter((t) => t.amount < 0 && !t.isTransfer)) {
      const catName = tx.categoryId ? catMap.get(tx.categoryId) ?? "Uncategorized" : "Uncategorized";
      categorySpending.set(catName, (categorySpending.get(catName) ?? 0) + Math.abs(tx.amount));
    }

    const totalBalance = accounts
      .filter((a) => a.isActive)
      .reduce((s, a) => s + a.balance, 0);

    return {
      months: args.months,
      totalIncome,
      totalExpenses,
      totalBalance,
      accountCount: accounts.filter((a) => a.isActive).length,
      transactionCount: recentTxns.length,
      categorySpending: Object.fromEntries(categorySpending),
      topExpenses: recentTxns
        .filter((t) => t.amount < 0)
        .sort((a, b) => a.amount - b.amount)
        .slice(0, 10)
        .map((t) => ({
          payee: t.payee,
          amount: Math.abs(t.amount),
          date: t.date,
          category: t.categoryId ? catMap.get(t.categoryId) ?? "Uncategorized" : "Uncategorized",
        })),
    };
  },
});

async function callOllama(prompt: string, systemPrompt?: string) {
  const ollamaUrl = process.env.OLLAMA_BASE_URL ?? "http://host.gateway.docker.internal:11434";
  const model = process.env.OLLAMA_MODEL ?? "llama3.2";

  const response = await fetch(`${ollamaUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt ?? SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export const analyze = action({
  args: { months: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Find user by token identifier
    const users = await ctx.runQuery(internal.ai.findUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!users) throw new Error("User not found");

    const context = await ctx.runQuery(internal.ai.gatherFinancialContext, {
      userId: users,
      months: args.months ?? 3,
    });

    const prompt = `Analyze this financial data for the past ${context.months} months:

Total Income: $${context.totalIncome.toFixed(2)}
Total Expenses: $${context.totalExpenses.toFixed(2)}
Net: $${(context.totalIncome - context.totalExpenses).toFixed(2)}
Total Balance across ${context.accountCount} accounts: $${context.totalBalance.toFixed(2)}
Total Transactions: ${context.transactionCount}

Spending by Category:
${Object.entries(context.categorySpending)
  .sort(([, a], [, b]) => (b as number) - (a as number))
  .map(([cat, amt]) => `- ${cat}: $${(amt as number).toFixed(2)}`)
  .join("\n")}

Provide a comprehensive analysis including:
1. Overall financial health assessment
2. Key spending patterns and trends
3. Areas of concern
4. Specific actionable recommendations`;

    const analysis = await callOllama(prompt);
    return { analysis, context };
  },
});

export const forecast = action({
  args: {
    months: v.optional(v.number()),
    forecastMonths: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const users = await ctx.runQuery(internal.ai.findUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!users) throw new Error("User not found");

    const context = await ctx.runQuery(internal.ai.gatherFinancialContext, {
      userId: users,
      months: args.months ?? 3,
    });

    const prompt = `Based on the past ${context.months} months of financial data:

Monthly avg income: $${(context.totalIncome / context.months).toFixed(2)}
Monthly avg expenses: $${(context.totalExpenses / context.months).toFixed(2)}
Current balance: $${context.totalBalance.toFixed(2)}

Spending by Category:
${Object.entries(context.categorySpending)
  .map(([cat, amt]) => `- ${cat}: $${((amt as number) / context.months).toFixed(2)}/month`)
  .join("\n")}

Forecast the next ${args.forecastMonths ?? 3} months. Include projected spending, savings, and net worth trajectory.`;

    const forecast = await callOllama(prompt);
    return { forecast, context };
  },
});

export const budgetAdvice = action({
  args: { months: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const users = await ctx.runQuery(internal.ai.findUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!users) throw new Error("User not found");

    const context = await ctx.runQuery(internal.ai.gatherFinancialContext, {
      userId: users,
      months: args.months ?? 3,
    });

    const prompt = `Based on spending data over ${context.months} months:

Monthly income: $${(context.totalIncome / context.months).toFixed(2)}
Monthly expenses: $${(context.totalExpenses / context.months).toFixed(2)}

Category spending (monthly avg):
${Object.entries(context.categorySpending)
  .sort(([, a], [, b]) => (b as number) - (a as number))
  .map(([cat, amt]) => `- ${cat}: $${((amt as number) / context.months).toFixed(2)}`)
  .join("\n")}

Suggest an optimized monthly budget allocation using the envelope/zero-based budgeting method. Include specific dollar amounts per category and savings goals.`;

    const advice = await callOllama(prompt);
    return { advice, context };
  },
});

export const ask = action({
  args: { question: v.string(), months: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const users = await ctx.runQuery(internal.ai.findUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!users) throw new Error("User not found");

    const context = await ctx.runQuery(internal.ai.gatherFinancialContext, {
      userId: users,
      months: args.months ?? 3,
    });

    const prompt = `Financial context (past ${context.months} months):
Income: $${context.totalIncome.toFixed(2)}, Expenses: $${context.totalExpenses.toFixed(2)}
Balance: $${context.totalBalance.toFixed(2)}

Category spending: ${JSON.stringify(context.categorySpending)}

User question: ${args.question}`;

    const answer = await callOllama(prompt);
    return { answer, context };
  },
});

export const findUserByToken = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("tokenIdentifier"), args.tokenIdentifier))
      .first();
    return user?._id ?? null;
  },
});

export const status = action({
  handler: async () => {
    const ollamaUrl = process.env.OLLAMA_BASE_URL ?? "http://host.gateway.docker.internal:11434";
    try {
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        return { connected: true, models: data.models ?? [] };
      }
      return { connected: false, models: [] };
    } catch {
      return { connected: false, models: [] };
    }
  },
});
