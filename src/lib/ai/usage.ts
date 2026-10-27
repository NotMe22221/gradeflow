// The live AI usage guard: per-session, per-IP and daily caps, an estimated
// daily spend cap, and the kill switch. Pure (storage is injected): safe for
// unit tests. The database store is src/lib/ai/usage-store.ts and the
// per-request wiring is src/lib/ai/guard.ts.
//
// Every paid provider call goes through UsageGuard.run(): it reserves the
// call's worst-case cost before anything is sent, then settles it with the
// token usage the provider reports. A call the caps don't allow is never sent.

import { createHmac } from "node:crypto";

import { costMicroUsd, formatUsd, type TokenUsage } from "@/lib/ai/pricing";

export type AiProvider = "anthropic" | "openai";
/** Which product feature made the call, for the ledger. */
export type AiFeature = "essay" | "scan" | "answer_key" | "brief" | "goal" | "try_it";

export type UsageLimits = {
  /** Live calls one browser session may make in any rolling hour. */
  perSessionPerHour: number;
  /** Live calls one client IP may make in any rolling hour (all its sessions). */
  perIpPerHour: number;
  /** Live calls the whole site may make per UTC day. */
  perDay: number;
  /** Estimated live AI spend the whole site may reach per UTC day, in micro-dollars. */
  spendPerDayMicroUsd: number;
};

export const DEFAULT_USAGE_LIMITS: UsageLimits = {
  perSessionPerHour: 20,
  perIpPerHour: 60,
  perDay: 400,
  spendPerDayMicroUsd: 2_000_000,
};

export const HOUR_MS = 60 * 60 * 1000;

type Env = Record<string, string | undefined>;

function readCount(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * The caps, from the environment (all optional; 0 allows no live calls):
 * AI_LIMIT_PER_SESSION_HOUR, AI_LIMIT_PER_IP_HOUR, AI_LIMIT_PER_DAY, and
 * AI_DAILY_BUDGET_USD (a decimal, for example 2 or 0.5).
 */
export function readUsageLimits(env: Env = process.env): UsageLimits {
  const budget = Number(env.AI_DAILY_BUDGET_USD);
  const hasBudget = env.AI_DAILY_BUDGET_USD?.trim() && Number.isFinite(budget) && budget >= 0;
  return {
    perSessionPerHour: readCount(env.AI_LIMIT_PER_SESSION_HOUR, DEFAULT_USAGE_LIMITS.perSessionPerHour),
    perIpPerHour: readCount(env.AI_LIMIT_PER_IP_HOUR, DEFAULT_USAGE_LIMITS.perIpPerHour),
    perDay: readCount(env.AI_LIMIT_PER_DAY, DEFAULT_USAGE_LIMITS.perDay),
    spendPerDayMicroUsd: hasBudget ? Math.round(budget * 1_000_000) : DEFAULT_USAGE_LIMITS.spendPerDayMicroUsd,
  };
}

/**
 * AI_KILL_SWITCH=1 (or true, on, yes) turns every live AI call off. Each
 * feature then runs its labelled demo engine, exactly as with no API key.
 */
export function aiKillSwitchOn(env: Env = process.env): boolean {
  return ["1", "true", "on", "yes"].includes(env.AI_KILL_SWITCH?.trim().toLowerCase() ?? "");
}

/** Whether a provider's live engine should run: its key is set and the kill switch is off. */
export function liveAiAllowed(apiKey: string | undefined, env: Env = process.env): boolean {
  return Boolean(apiKey) && !aiKillSwitchOn(env);
}

// --- Decisions ----------------------------------------------------------------

/** What the store found for one subject at reservation time. */
export type UsageSnapshot = {
  /** Live calls by this session in the last hour, and when the oldest of them was made. */
  sessionCalls: number;
  sessionOldest: Date | null;
  ipCalls: number;
  ipOldest: Date | null;
  /** Live calls and estimated spend site-wide since midnight UTC. */
  dayCalls: number;
  daySpendMicroUsd: number;
};

export type LimitReason = "kill_switch" | "session" | "ip" | "daily_calls" | "daily_spend";

export type UsageDenied = { ok: false; reason: LimitReason; retryAfterSeconds: number };
export type UsageDecision = { ok: true } | UsageDenied;

export function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function secondsUntilUtcMidnight(now: Date): number {
  return Math.max(1, Math.ceil((startOfUtcDay(now).getTime() + 24 * HOUR_MS - now.getTime()) / 1000));
}

function secondsUntilWindowFrees(oldest: Date | null, now: Date): number {
  if (!oldest) return HOUR_MS / 1000;
  return Math.max(1, Math.ceil((oldest.getTime() + HOUR_MS - now.getTime()) / 1000));
}

/**
 * Whether one more live call fits. Site-wide caps are checked first, since
 * nobody can make a call once they are reached. The spend cap counts the
 * call's worst case, so the estimated daily total can't pass the budget.
 */
export function decideReservation(
  snapshot: UsageSnapshot,
  limits: UsageLimits,
  reserveMicroUsd: number,
  now: Date
): UsageDecision {
  if (snapshot.daySpendMicroUsd + reserveMicroUsd > limits.spendPerDayMicroUsd) {
    return { ok: false, reason: "daily_spend", retryAfterSeconds: secondsUntilUtcMidnight(now) };
  }
  if (snapshot.dayCalls >= limits.perDay) {
    return { ok: false, reason: "daily_calls", retryAfterSeconds: secondsUntilUtcMidnight(now) };
  }
  if (snapshot.ipCalls >= limits.perIpPerHour) {
    return { ok: false, reason: "ip", retryAfterSeconds: secondsUntilWindowFrees(snapshot.ipOldest, now) };
  }
  if (snapshot.sessionCalls >= limits.perSessionPerHour) {
    return { ok: false, reason: "session", retryAfterSeconds: secondsUntilWindowFrees(snapshot.sessionOldest, now) };
  }
  return { ok: true };
}

/**
 * How many more live calls this subject can make right now: the tightest of
 * its session, IP and site-wide daily caps. (The spend cap depends on each
 * call's size, so it isn't counted here.)
 */
export function remainingCalls(snapshot: UsageSnapshot, limits: UsageLimits): number {
  return Math.max(
    0,
    Math.min(
      limits.perSessionPerHour - snapshot.sessionCalls,
      limits.perIpPerHour - snapshot.ipCalls,
      limits.perDay - snapshot.dayCalls
    )
  );
}

export function formatWait(seconds: number): string {
  if (seconds < 90) return "about a minute";
  if (seconds < 90 * 60) return `${Math.round(seconds / 60)} minutes`;
  const hours = Math.round(seconds / 3600);
  return hours === 1 ? "about an hour" : `about ${hours} hours`;
}

/** The message a person sees when a cap stops a live AI call. */
export function usageLimitMessage(reason: LimitReason, retryAfterSeconds: number, limits: UsageLimits): string {
  const wait = formatWait(retryAfterSeconds);
  switch (reason) {
    case "kill_switch":
      return "Live AI is switched off on this server (AI_KILL_SWITCH). Nothing was sent to an AI provider.";
    case "session":
      return `You've used this session's ${limits.perSessionPerHour} live AI calls for the hour. Try again in ${wait}.`;
    case "ip":
      return `Your network has used its ${limits.perIpPerHour} live AI calls for the hour. Try again in ${wait}.`;
    case "daily_calls":
      return `This site's ${limits.perDay} live AI calls for today are used up. They reset at midnight UTC, in ${wait}.`;
    case "daily_spend":
      return `This site's live AI budget for today (${formatUsd(limits.spendPerDayMicroUsd)}, estimated) is used up. It resets at midnight UTC, in ${wait}.`;
  }
}

/** A cap stopped a live AI call before it was sent. Routes answer 429 (503 for the kill switch). */
export class AiLimitError extends Error {
  readonly status: 429 | 503;

  constructor(
    readonly reason: LimitReason,
    readonly retryAfterSeconds: number,
    limits: UsageLimits
  ) {
    super(usageLimitMessage(reason, retryAfterSeconds, limits));
    this.name = "AiLimitError";
    this.status = reason === "kill_switch" ? 503 : 429;
  }
}

// --- Storage and the guard ------------------------------------------------------

/** Who is calling. Keys are HMACs (usageKey), never a raw cookie or IP address. */
export type UsageSubject = { sessionKey: string; ipKey: string; userId: string | null };

export type LiveCall = {
  provider: AiProvider;
  feature: AiFeature;
  model: string;
  /** The call's worst-case cost (pricing.ts worstCaseCostMicroUsd), held until it settles. */
  reserveMicroUsd: number;
};

export type Settlement = {
  status: "ok" | "failed";
  model: string;
  usage: TokenUsage | null;
  costMicroUsd: number;
};

export interface UsageStore {
  /**
   * Read the subject's usage, ask `decide`, and record a reservation only if
   * it allows the call. Must be atomic: two concurrent reservations can never
   * both pass a cap that only has room for one.
   */
  reserve(
    subject: UsageSubject,
    call: LiveCall,
    now: Date,
    decide: (snapshot: UsageSnapshot) => UsageDecision
  ): Promise<{ ok: true; id: string } | UsageDenied>;
  settle(id: string, settlement: Settlement, now: Date): Promise<void>;
}

/** What a provider call hands back: its value and the usage the provider reported. */
export type LiveResult<T> = { value: T; usage: TokenUsage | null; model?: string };

export interface UsageGuard {
  run<T>(call: LiveCall, send: () => Promise<LiveResult<T>>): Promise<T>;
}

export function createUsageGuard({
  store,
  subject,
  limits,
  killSwitch = false,
  now = () => new Date(),
}: {
  store: UsageStore;
  subject: () => Promise<UsageSubject>;
  limits: UsageLimits;
  killSwitch?: boolean;
  now?: () => Date;
}): UsageGuard {
  async function settle(id: string, settlement: Settlement) {
    try {
      await store.settle(id, settlement, now());
    } catch (error) {
      // The reservation keeps its worst-case cost, which errs on the safe side.
      console.error("[markwise] Could not settle a live AI call", {
        type: error instanceof Error ? error.name : typeof error,
      });
    }
  }

  return {
    async run(call, send) {
      // Defense in depth: callers pick the demo engine when the switch is on.
      if (killSwitch) throw new AiLimitError("kill_switch", 0, limits);

      const at = now();
      const reserved = await store.reserve(await subject(), call, at, (snapshot) =>
        decideReservation(snapshot, limits, call.reserveMicroUsd, at)
      );
      if (!reserved.ok) throw new AiLimitError(reserved.reason, reserved.retryAfterSeconds, limits);

      let result: Awaited<ReturnType<typeof send>>;
      try {
        result = await send();
      } catch (error) {
        // A failed call may still have been billed (a timeout, say): keep the worst case.
        await settle(reserved.id, { status: "failed", model: call.model, usage: null, costMicroUsd: call.reserveMicroUsd });
        throw error;
      }
      const model = result.model || call.model;
      await settle(reserved.id, {
        status: "ok",
        model,
        usage: result.usage,
        costMicroUsd: result.usage ? costMicroUsd(model, result.usage) : call.reserveMicroUsd,
      });
      return result.value;
    },
  };
}

// --- Subjects -------------------------------------------------------------------

/** A short keyed hash, so the ledger never stores a raw cookie or IP address. */
export function usageKey(secret: string, kind: "session" | "ip", value: string): string {
  return createHmac("sha256", secret).update(`${kind}:${value}`).digest("base64url").slice(0, 22);
}

/**
 * The client IP: the first X-Forwarded-For entry, else X-Real-IP. On Vercel
 * the platform sets these headers itself. A self-hosted server without a
 * proxy in front can't trust them: the session and daily caps still apply.
 */
export function clientIpFrom(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return headers.get("x-real-ip")?.trim() || "unknown";
}

// --- In-memory store --------------------------------------------------------------

export type MemoryUsageRow = LiveCall &
  UsageSubject & {
    id: string;
    status: "reserved" | Settlement["status"];
    costMicroUsd: number;
    usage: TokenUsage | null;
    createdAt: Date;
  };

/**
 * A single-process store with the same windows as the database store. For
 * unit tests and offline scripts (the evaluation harness), not for the app:
 * on a serverless host each instance would keep its own counts.
 */
export function createMemoryUsageStore(): UsageStore & { rows: MemoryUsageRow[] } {
  const rows: MemoryUsageRow[] = [];
  return {
    rows,
    async reserve(subject, call, now, decide) {
      const hourAgo = now.getTime() - HOUR_MS;
      const dayStart = startOfUtcDay(now).getTime();
      const inHour = rows.filter((row) => row.createdAt.getTime() > hourAgo);
      const session = inHour.filter((row) => row.sessionKey === subject.sessionKey);
      const ip = inHour.filter((row) => row.ipKey === subject.ipKey);
      const today = rows.filter((row) => row.createdAt.getTime() >= dayStart);
      const oldest = (list: MemoryUsageRow[]) =>
        list.length ? new Date(Math.min(...list.map((row) => row.createdAt.getTime()))) : null;

      const decision = decide({
        sessionCalls: session.length,
        sessionOldest: oldest(session),
        ipCalls: ip.length,
        ipOldest: oldest(ip),
        dayCalls: today.length,
        daySpendMicroUsd: today.reduce((sum, row) => sum + row.costMicroUsd, 0),
      });
      if (!decision.ok) return decision;

      const id = `call_${rows.length + 1}`;
      rows.push({
        ...call,
        ...subject,
        id,
        status: "reserved",
        costMicroUsd: call.reserveMicroUsd,
        usage: null,
        createdAt: now,
      });
      return { ok: true, id };
    },
    async settle(id, settlement) {
      const row = rows.find((candidate) => candidate.id === id);
      if (!row) return;
      row.status = settlement.status;
      row.model = settlement.model;
      row.usage = settlement.usage;
      row.costMicroUsd = settlement.costMicroUsd;
    },
  };
}
