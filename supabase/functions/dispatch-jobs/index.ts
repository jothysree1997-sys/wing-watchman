// Worker: pulls due scheduled_jobs, calls AirLabs, advances state machine.
// Invoked every minute by pg_cron via pg_net.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AIRLABS_KEY = Deno.env.get("AIRLABS_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const TERMINAL = ["COMPLETED", "CANCELLED", "FAILED"];

async function airlabs(endpoint: string, params: Record<string, string>) {
  const url = new URL(`https://airlabs.co/api/v9/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("api_key", AIRLABS_KEY);
  const start = Date.now();
  try {
    const res = await fetch(url.toString());
    const json = await res.json().catch(() => ({}));
    return {
      ok: res.ok && !json?.error,
      status: res.status,
      json,
      duration: Date.now() - start,
      error: json?.error?.message ?? null,
    };
  } catch (e) {
    return { ok: false, status: 0, json: null, duration: Date.now() - start, error: String(e) };
  }
}

function parseAirlabsTime(t: string | null | undefined): string | null {
  if (!t) return null;
  // "2026-05-01 14:15" => UTC ISO
  return new Date(t.replace(" ", "T") + "Z").toISOString();
}

// Smart filter for /schedules
function pickFlight(list: any[], target: { dep_iata: string; arr_iata: string; flight_iata: string; dep_time_utc: string }) {
  if (!Array.isArray(list)) return null;
  const targetTs = new Date(target.dep_time_utc).getTime();
  // exact flight_iata + same date first
  const sameFlight = list.filter((f) => f.flight_iata === target.flight_iata);
  const candidates = sameFlight.length ? sameFlight : list.filter(
    (f) => f.dep_iata === target.dep_iata && f.arr_iata === target.arr_iata
  );
  let best: any = null;
  let bestDelta = Infinity;
  for (const f of candidates) {
    const t = parseAirlabsTime(f.dep_time_utc);
    if (!t) continue;
    const delta = Math.abs(new Date(t).getTime() - targetTs);
    // within 6 hours
    if (delta < bestDelta && delta < 6 * 3600 * 1000) {
      best = f;
      bestDelta = delta;
    }
  }
  return best;
}

async function logCall(subId: string, jobId: string | null, endpoint: string, params: any, r: any) {
  await supabase.from("api_call_logs").insert({
    subscription_id: subId,
    job_id: jobId,
    endpoint,
    request_params: params,
    http_status: r.status,
    success: r.ok,
    response: r.json,
    error: r.error,
    duration_ms: r.duration,
  });
  // bump counters
  const { data: sub } = await supabase.from("subscriptions").select("api_call_count, failed_api_count").eq("id", subId).single();
  if (sub) {
    await supabase.from("subscriptions").update({
      api_call_count: sub.api_call_count + 1,
      failed_api_count: sub.failed_api_count + (r.ok ? 0 : 1),
    }).eq("id", subId);
  }
}

async function scheduleJob(subId: string, jobType: string, phase: string, runAt: Date, payload: any = {}) {
  await supabase.from("scheduled_jobs").insert({
    subscription_id: subId,
    job_type: jobType,
    phase,
    run_at: runAt.toISOString(),
    payload,
  });
  await supabase.from("subscriptions").update({ next_job_time: runAt.toISOString() }).eq("id", subId);
}

async function finalizeJob(jobId: string, result: any, errored = false) {
  await supabase.from("scheduled_jobs").update({
    status: errored ? "failed" : "done",
    result,
    finished_at: new Date().toISOString(),
  }).eq("id", jobId);
}

async function processJob(job: any) {
  const { data: sub } = await supabase.from("subscriptions").select("*").eq("id", job.subscription_id).single();
  if (!sub) return finalizeJob(job.id, { skipped: "no sub" });
  if (TERMINAL.includes(sub.status)) return finalizeJob(job.id, { skipped: "terminal" });
  if (sub.api_call_count >= 10) {
    await supabase.from("subscriptions").update({ status: "FAILED", phase: "MAX_CALLS" }).eq("id", sub.id);
    return finalizeJob(job.id, { skipped: "max calls" });
  }

  await supabase.from("scheduled_jobs").update({ status: "running", started_at: new Date().toISOString(), attempt: job.attempt + 1 }).eq("id", job.id);

  const phase = job.phase as string;
  const now = new Date();
  const depUtc = new Date(sub.dep_estimated_utc ?? sub.dep_time_utc);

  // Always try /flight first if we have flight_iata for live status, except first START_TRACKING which uses /schedules
  let r: any;
  let endpoint: string;
  let params: any;

  if (phase === "START_TRACKING" || phase === "PRE_DEPARTURE") {
    endpoint = "schedules";
    params = { dep_iata: sub.dep_iata, arr_iata: sub.arr_iata };
    r = await airlabs(endpoint, params);
  } else {
    endpoint = "flight";
    params = { flight_iata: sub.flight_iata };
    r = await airlabs(endpoint, params);
  }

  await logCall(sub.id, job.id, endpoint, params, r);

  // API failure with retries
  if (!r.ok) {
    if (job.attempt + 1 < job.max_attempts) {
      await scheduleJob(sub.id, job.job_type, phase, new Date(now.getTime() + 5 * 60 * 1000), job.payload);
      return finalizeJob(job.id, { retry: true });
    }
    // count as failed phase attempt; for START phase keep retrying schedule
    if (phase === "START_TRACKING") {
      await handleStartTrackingNoData(sub, depUtc, now);
      return finalizeJob(job.id, { rescheduled_no_data: true });
    }
    return finalizeJob(job.id, { error: r.error }, true);
  }

  // Extract flight info
  let flight: any = null;
  if (endpoint === "schedules") {
    const arr = r.json?.response ?? [];
    flight = pickFlight(arr, sub);
    if (!flight) {
      // No data
      if (phase === "START_TRACKING") {
        await handleStartTrackingNoData(sub, depUtc, now);
        return finalizeJob(job.id, { no_data: true });
      }
    }
  } else {
    flight = r.json?.response ?? null;
  }

  if (flight) {
    const update: any = {
      last_response: flight,
      last_status_text: flight.status,
      dep_estimated_utc: parseAirlabsTime(flight.dep_estimated_utc) ?? sub.dep_estimated_utc,
      arr_estimated_utc: parseAirlabsTime(flight.arr_estimated_utc) ?? sub.arr_estimated_utc,
      dep_actual_utc: parseAirlabsTime(flight.dep_actual_utc) ?? sub.dep_actual_utc,
      arr_actual_utc: parseAirlabsTime(flight.arr_actual_utc) ?? sub.arr_actual_utc,
      arr_time_utc: parseAirlabsTime(flight.arr_time_utc) ?? sub.arr_time_utc,
    };

    const fStatus = (flight.status || "").toLowerCase();
    if (fStatus === "cancelled") {
      update.status = "CANCELLED";
      update.phase = "CANCELLED";
      await supabase.from("subscriptions").update(update).eq("id", sub.id);
      return finalizeJob(job.id, { cancelled: true });
    }
    if (fStatus === "landed") {
      update.status = "COMPLETED";
      update.phase = "COMPLETED";
      await supabase.from("subscriptions").update(update).eq("id", sub.id);
      return finalizeJob(job.id, { landed: true });
    }

    await supabase.from("subscriptions").update(update).eq("id", sub.id);

    // Schedule next phase
    const depEst = update.dep_estimated_utc ? new Date(update.dep_estimated_utc) : depUtc;
    const arrEst = update.arr_estimated_utc ? new Date(update.arr_estimated_utc) : (sub.arr_time_utc ? new Date(sub.arr_time_utc) : new Date(depEst.getTime() + 2 * 3600 * 1000));

    if (phase === "START_TRACKING") {
      const next = new Date(depEst.getTime() - 2 * 3600 * 1000);
      await supabase.from("subscriptions").update({ phase: "PRE_DEPARTURE" }).eq("id", sub.id);
      await scheduleJob(sub.id, "CHECK_SCHEDULE", "PRE_DEPARTURE", next < now ? new Date(now.getTime() + 60_000) : next);
    } else if (phase === "PRE_DEPARTURE") {
      const next = new Date(depEst.getTime() - 10 * 60 * 1000);
      await supabase.from("subscriptions").update({ phase: "FINAL_PRE_DEPARTURE" }).eq("id", sub.id);
      await scheduleJob(sub.id, "CHECK_DEPARTURE", "FINAL_PRE_DEPARTURE", next < now ? new Date(now.getTime() + 60_000) : next);
    } else if (phase === "FINAL_PRE_DEPARTURE") {
      const next = new Date(depEst.getTime() + 10 * 60 * 1000);
      await supabase.from("subscriptions").update({ phase: "DEPARTURE_TRACKING", retry_count: 0 }).eq("id", sub.id);
      await scheduleJob(sub.id, "CHECK_DEPARTURE", "DEPARTURE_TRACKING", next < now ? new Date(now.getTime() + 60_000) : next);
    } else if (phase === "DEPARTURE_TRACKING") {
      if (flight.dep_actual_utc) {
        await supabase.from("subscriptions").update({ phase: "ARRIVAL_TRACKING", retry_count: 0 }).eq("id", sub.id);
        const next = new Date(arrEst.getTime() + 5 * 60 * 1000);
        await scheduleJob(sub.id, "CHECK_ARRIVAL", "ARRIVAL_TRACKING", next < now ? new Date(now.getTime() + 60_000) : next);
      } else {
        const rc = sub.retry_count + 1;
        if (rc >= 3) {
          await supabase.from("subscriptions").update({ status: "FAILED", phase: "DEPARTURE_NOT_DETECTED" }).eq("id", sub.id);
        } else {
          await supabase.from("subscriptions").update({ retry_count: rc }).eq("id", sub.id);
          await scheduleJob(sub.id, "CHECK_DEPARTURE", "DEPARTURE_TRACKING", new Date(now.getTime() + 30 * 60 * 1000));
        }
      }
    } else if (phase === "ARRIVAL_TRACKING") {
      if (flight.arr_actual_utc || fStatus === "landed") {
        await supabase.from("subscriptions").update({ status: "COMPLETED", phase: "COMPLETED" }).eq("id", sub.id);
      } else {
        const rc = sub.retry_count + 1;
        if (rc >= 3) {
          await supabase.from("subscriptions").update({ status: "FAILED", phase: "ARRIVAL_NOT_DETECTED" }).eq("id", sub.id);
        } else {
          const wait = rc === 1 ? 10 : 30;
          await supabase.from("subscriptions").update({ retry_count: rc }).eq("id", sub.id);
          await scheduleJob(sub.id, "CHECK_ARRIVAL", "ARRIVAL_TRACKING", new Date(now.getTime() + wait * 60 * 1000));
        }
      }
    }
  }

  return finalizeJob(job.id, { ok: true });
}

async function handleStartTrackingNoData(sub: any, depUtc: Date, now: Date) {
  // Retry schedule: +30m, +1h, then T-2h. retry_count tracks no-data attempts.
  const rc = sub.retry_count + 1;
  await supabase.from("subscriptions").update({ retry_count: rc }).eq("id", sub.id);
  const tMinus2h = new Date(depUtc.getTime() - 2 * 3600 * 1000);
  if (now >= tMinus2h) {
    await supabase.from("subscriptions").update({ status: "CANCELLED", phase: "NO_DATA" }).eq("id", sub.id);
    return;
  }
  let next: Date;
  if (rc === 1) next = new Date(now.getTime() + 30 * 60 * 1000);
  else if (rc === 2) next = new Date(now.getTime() + 60 * 60 * 1000);
  else next = tMinus2h;
  if (next > tMinus2h) next = tMinus2h;
  await scheduleJob(sub.id, "START_TRACKING", "START_TRACKING", next);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Pick due jobs (limit 25)
  const { data: jobs, error } = await supabase
    .from("scheduled_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("run_at", new Date().toISOString())
    .order("run_at", { ascending: true })
    .limit(25);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

  let processed = 0;
  for (const job of jobs ?? []) {
    try {
      await processJob(job);
      processed++;
    } catch (e) {
      await supabase.from("scheduled_jobs").update({ status: "failed", error: String(e), finished_at: new Date().toISOString() }).eq("id", job.id);
    }
  }

  return new Response(JSON.stringify({ processed, total: jobs?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
