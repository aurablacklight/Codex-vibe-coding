import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Process recurring transactions every day at 6:00 AM UTC
crons.daily(
  "process recurring transactions",
  { hourUTC: 6, minuteUTC: 0 },
  internal.recurring.processRecurring,
);

export default crons;
