import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ArrowDownToLine, ArrowUpFromLine, Clock, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: Overview,
});

type Stats = {
  active: number;
  getDay: number; getWeek: number; getMonth: number;
  postDay: number; postWeek: number; postMonth: number;
  upcoming: number;
  failed: number;
};

function Overview() {
  const [s, setS] = useState<Stats | null>(null);

  async function load() {
    const now = new Date();
    const day = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const week = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
    const month = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

    const [{ count: active }, logs, { count: upcoming }, { count: failed }] = await Promise.all([
      supabase.from("subscriptions").select("*", { count: "exact", head: true }).not("status", "in", "(COMPLETED,CANCELLED,FAILED)"),
      supabase.from("api_call_logs").select("endpoint, success, created_at").gte("created_at", month),
      supabase.from("scheduled_jobs").select("*", { count: "exact", head: true }).eq("status", "pending").gte("run_at", now.toISOString()),
      supabase.from("api_call_logs").select("*", { count: "exact", head: true }).eq("success", false).gte("created_at", month),
    ]);

    const rows = logs.data ?? [];
    const isGet = (e: string) => e === "schedules" || e === "flight"; // all AirLabs are GET; "post" tracked similarly
    const inRange = (iso: string, since: string) => iso >= since;
    // Treat schedules as GET-style data fetch and flight as POST-style live polling for the user's UI buckets.
    const get = rows.filter((r) => r.endpoint === "schedules");
    const post = rows.filter((r) => r.endpoint === "flight");
    const cnt = (arr: any[], since: string) => arr.filter((r) => inRange(r.created_at, since)).length;

    setS({
      active: active ?? 0,
      getDay: cnt(get, day), getWeek: cnt(get, week), getMonth: cnt(get, month),
      postDay: cnt(post, day), postWeek: cnt(post, week), postMonth: cnt(post, month),
      upcoming: upcoming ?? 0,
      failed: failed ?? 0,
    });
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("ovw")
      .on("postgres_changes", { event: "*", schema: "public", table: "api_call_logs" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "scheduled_jobs" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-muted-foreground">Real-time tracking activity across all subscriptions.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Activity} label="Active subscriptions" value={s?.active ?? "—"} accent="primary" />
        <Stat icon={Clock} label="Upcoming scheduled calls" value={s?.upcoming ?? "—"} accent="sky" />
        <Stat icon={AlertTriangle} label="Failed API calls (30d)" value={s?.failed ?? "—"} accent="destructive" />
        <Stat icon={Activity} label="Total tracked today" value={(s ? s.getDay + s.postDay : "—") as any} accent="success" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Bucket title="Schedules API (GET)" icon={ArrowDownToLine} d={s?.getDay} w={s?.getWeek} m={s?.getMonth} />
        <Bucket title="Flight API (POST)" icon={ArrowUpFromLine} d={s?.postDay} w={s?.postWeek} m={s?.postMonth} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: any) {
  const map: any = {
    primary: "from-primary/15 to-primary/5 text-primary",
    sky: "from-sky/15 to-sky/5 text-sky",
    success: "from-success/15 to-success/5 text-success",
    destructive: "from-destructive/15 to-destructive/5 text-destructive",
  };
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${map[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="mt-3 text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

function Bucket({ title, icon: Icon, d, w, m }: any) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "Daily", v: d }, { l: "Weekly", v: w }, { l: "Monthly", v: m },
          ].map((x) => (
            <div key={x.l} className="rounded-lg border p-3">
              <div className="text-2xl font-bold">{x.v ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{x.l}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
