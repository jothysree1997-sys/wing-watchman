import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getTz, AIRPORT_TZ, localToUtcIso } from "@/lib/airports";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const Schema = z.object({
  airline_iata: z.string().min(1).max(3),
  flight_number: z.string().min(1).max(6),
  dep_iata: z.string().length(3),
  arr_iata: z.string().length(3),
  dep_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD (local)
  dep_time: z.string().regex(/^\d{2}:\d{2}$/),       // HH:mm (local)
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

export const Route = createFileRoute("/api/public/subscriptions")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        const parsed = Schema.safeParse(payload);
        if (!parsed.success) {
          return json({ error: "Validation failed", issues: parsed.error.flatten() }, 400);
        }
        const d = parsed.data;
        const airline = d.airline_iata.toUpperCase();
        const dep = d.dep_iata.toUpperCase();
        const arr = d.arr_iata.toUpperCase();
        const flight_iata = `${airline}${d.flight_number}`;
        const tz = getTz(dep);
        const local = `${d.dep_date}T${d.dep_time}`;
        let depUtcIso: string;
        try {
          depUtcIso = localToUtcIso(local, tz);
        } catch {
          return json({ error: "Invalid date/time" }, 400);
        }

        // Duplicate check: same flight, same route, same date (±12h window on dep time)
        const { data: dup } = await supabaseAdmin
          .from("subscriptions")
          .select("*")
          .eq("flight_iata", flight_iata)
          .eq("dep_iata", dep)
          .eq("arr_iata", arr)
          .gte("dep_time_utc", new Date(new Date(depUtcIso).getTime() - 12 * 3600 * 1000).toISOString())
          .lte("dep_time_utc", new Date(new Date(depUtcIso).getTime() + 12 * 3600 * 1000).toISOString())
          .order("created_at", { ascending: false })
          .limit(1);
        if (dup && dup.length) {
          return json({
            ok: true,
            duplicate: true,
            message: "Subscription already exists for this flight, route and date",
            subscription: dup[0],
          }, 200);
        }

        const depUtc = new Date(depUtcIso);
        const now = new Date();
        const tMinus7h = new Date(depUtc.getTime() - 7 * 3600 * 1000);
        const startAt = now >= tMinus7h ? new Date(now.getTime() + 5_000) : tMinus7h;

        const { data: sub, error } = await supabaseAdmin
          .from("subscriptions")
          .insert({
            airline_iata: airline,
            flight_number: d.flight_number,
            flight_iata,
            dep_iata: dep,
            arr_iata: arr,
            dep_city: AIRPORT_TZ[dep]?.city,
            arr_city: AIRPORT_TZ[arr]?.city,
            dep_local_datetime: local,
            timezone: tz,
            dep_time_utc: depUtcIso,
            status: "SUBSCRIBED",
            phase: "SCHEDULED",
            next_job_time: startAt.toISOString(),
          })
          .select("*")
          .single();
        if (error) return json({ error: error.message }, 500);

        const { error: jerr } = await supabaseAdmin.from("scheduled_jobs").insert({
          subscription_id: sub.id,
          job_type: "START_TRACKING",
          phase: "START_TRACKING",
          run_at: startAt.toISOString(),
        });
        if (jerr) return json({ error: jerr.message, subscription: sub }, 500);

        return json({
          ok: true,
          subscription: sub,
          tracking_starts_at: startAt.toISOString(),
        }, 201);
      },
    },
  },
});
