import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TERMINAL_STATUSES = ["CANCELLED", "COMPLETED", "FAILED"];

export const Route = createFileRoute("/api/public/hooks/cleanup-subscriptions")({
  server: {
    handlers: {
      POST: async () => {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Find terminal subscriptions older than 24h (by updated_at)
        const { data: subs, error: selErr } = await supabaseAdmin
          .from("subscriptions")
          .select("id,status,updated_at")
          .in("status", TERMINAL_STATUSES)
          .lte("updated_at", cutoff);

        if (selErr) {
          return new Response(JSON.stringify({ error: selErr.message }), { status: 500 });
        }

        const ids = (subs ?? []).map((s) => s.id);
        if (ids.length === 0) {
          return new Response(JSON.stringify({ ok: true, deleted: 0 }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        // Delete related rows first (no FK cascade defined)
        const [{ error: jobsErr }, { error: logsErr }] = await Promise.all([
          supabaseAdmin.from("scheduled_jobs").delete().in("subscription_id", ids),
          supabaseAdmin.from("api_call_logs").delete().in("subscription_id", ids),
        ]);
        if (jobsErr || logsErr) {
          return new Response(
            JSON.stringify({ error: jobsErr?.message ?? logsErr?.message }),
            { status: 500 },
          );
        }

        const { error: delErr } = await supabaseAdmin
          .from("subscriptions")
          .delete()
          .in("id", ids);
        if (delErr) {
          return new Response(JSON.stringify({ error: delErr.message }), { status: 500 });
        }

        return new Response(
          JSON.stringify({ ok: true, deleted: ids.length, ids }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
