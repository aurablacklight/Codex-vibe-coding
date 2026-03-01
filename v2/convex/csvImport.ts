import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

export const parseCSV = action({
  args: { csvContent: v.string() },
  handler: async (_ctx, args) => {
    const lines = args.csvContent.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV must have at least a header row and one data row");
    }

    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1, 6).map((line) => parseCSVLine(line)); // Preview first 5 rows

    // Auto-detect column mappings
    const mapping: Record<string, number> = {};
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].toLowerCase().trim();
      if (h.includes("date")) mapping.date = i;
      else if (h.includes("payee") || h.includes("description") || h.includes("merchant") || h.includes("name"))
        mapping.payee = i;
      else if (h.includes("amount") || h.includes("value") || h.includes("sum"))
        mapping.amount = i;
      else if (h.includes("note") || h.includes("memo") || h.includes("comment"))
        mapping.notes = i;
    }

    return {
      headers,
      preview: rows,
      totalRows: lines.length - 1,
      suggestedMapping: mapping,
    };
  },
});

export const importTransactions = mutation({
  args: {
    rows: v.array(
      v.object({
        date: v.string(),
        payee: v.string(),
        amount: v.number(),
        notes: v.optional(v.string()),
      }),
    ),
    accountId: v.id("accounts"),
    categoryId: v.optional(v.id("categories")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let importedCount = 0;
    for (const row of args.rows) {
      await ctx.db.insert("transactions", {
        userId,
        accountId: args.accountId,
        categoryId: args.categoryId,
        date: row.date,
        payee: row.payee,
        amount: row.amount,
        notes: row.notes ?? "",
        isTransfer: false,
      });

      // Update account balance
      const account = await ctx.db.get(args.accountId);
      if (account) {
        await ctx.db.patch(args.accountId, {
          balance: account.balance + row.amount,
        });
      }

      importedCount++;
    }

    return { importedCount };
  },
});

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
