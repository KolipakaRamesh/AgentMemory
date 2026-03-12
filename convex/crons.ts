import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Hourly: expire old sessions
crons.hourly("expire-sessions", { minuteUTC: 0 }, internal.sessions.expireOld);

// Daily: rate limit table cleanup
crons.daily(
  "cleanup-rate-limits",
  { hourUTC: 2, minuteUTC: 0 },
  internal.rateLimits.cleanup
);

export default crons;
