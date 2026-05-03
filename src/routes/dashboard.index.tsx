import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ArrowDownToLine, ArrowUpFromLine, Clock, AlertTriangle, Gauge, Database, ShieldAlert, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/dashboard/")({
  component: Overview,
});

type Stats = {
  active: number;
  getDay: number; getWeek: number; getMonth: number;
  postDay: number; postWeek: number; postMonth: number;
  upcoming: number;
  failed: number;
  avgLatency: number;
  p95Latency: number;
  successRate: number;
  callsLastHour: number;
  totalLogs: number;
  // Lovable Cloud (Supabase) usage
  totalSubscriptions: number;
  totalJobs: number;
  totalRows: number;
  realtimeChannels: number;
};

const MONTHLY_QUOTA = 1000;
const RATE_LIMIT_PER_MIN = 60;
// Lovable Cloud free-tier soft limits (display only)
const CLOUD_DB_ROWS_LIMIT = 500_000;
const CLOUD_EGRESS_GB = 5;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b last:border-0 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function Overview() {
  const [s, setS] = useState<Stats | null>(null);

  async function load() {
    const now = new Date();
    const day = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const week = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
    const month = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

    const [{ count: active }, logs, { count: upcoming }, { count: failed }, { count: totalSubs }, { count: totalJobs }, { count: totalLogsAll }] = await Promise.all([
      supabase.from("subscriptions").select("*", { count: "exact", head: true }).not("status", "in", "(COMPLETED,CANCELLED,FAILED)"),
      supabase.from("api_call_logs").select("endpoint, success, created_at, duration_ms").gte("created_at", month),
      supabase.from("scheduled_jobs").select("*", { count: "exact", head: true }).eq("status", "pending").gte("run_at", now.toISOString()),
      supabase.from("api_call_logs").select("*", { count: "exact", head: true }).eq("success", false).gte("created_at", month),
      supabase.from("subscriptions").select("*", { count: "exact", head: true }),
      supabase.from("scheduled_jobs").select("*", { count: "exact", head: true }),
      supabase.from("api_call_logs").select("*", { count: "exact", head: true }),
    ]);

    const rows = (logs.data ?? []) as Array<{ endpoint: string; success: boolean; created_at: string; duration_ms: number | null }>;
    const inRange = (iso: string, since: string) => iso >= since;
    const get = rows.filter((r) => r.endpoint === "schedules");
    const post = rows.filter((r) => r.endpoint === "flight");
    const cnt = (arr: any[], since: string) => arr.filter((r) => inRange(r.created_at, since)).length;

    const durations = rows.map((r) => r.duration_ms ?? 0).filter((n) => n > 0).sort((a, b) => a - b);
    const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const p95 = durations.length ? durations[Math.floor(durations.length * 0.95)] ?? durations[durations.length - 1] : 0;
    const succ = rows.length ? Math.round(((rows.length - (failed ?? 0)) / rows.length) * 1000) / 10 : 100;
    const hourAgo = new Date(now.getTime() - 3600 * 1000).toISOString();
    const callsLastHour = cnt(rows, hourAgo);

    setS({
      active: active ?? 0,
      getDay: cnt(get, day), getWeek: cnt(get, week), getMonth: cnt(get, month),
      postDay: cnt(post, day), postWeek: cnt(post, week), postMonth: cnt(post, month),
      upcoming: upcoming ?? 0,
      failed: failed ?? 0,
      avgLatency: avg,
      p95Latency: p95,
      successRate: succ,
      callsLastHour,
      totalLogs: rows.length,
      totalSubscriptions: totalSubs ?? 0,
      totalJobs: totalJobs ?? 0,
      totalRows: (totalSubs ?? 0) + (totalJobs ?? 0) + (totalLogsAll ?? 0),
      realtimeChannels: 3,
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

      <div>
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" /> Backend Performance & Usage
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Zap} label="Avg latency" value={s ? `${s.avgLatency} ms` : "—"} accent="primary" />
          <Stat icon={Gauge} label="P95 latency" value={s ? `${s.p95Latency} ms` : "—"} accent="sky" />
          <Stat icon={Activity} label="Success rate (30d)" value={s ? `${s.successRate}%` : "—"} accent="success" />
          <Stat icon={Database} label="Calls last hour" value={s?.callsLastHour ?? "—"} accent="primary" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" /> Monthly API quota
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Used (30d)</span>
                <span className="font-semibold tabular-nums">
                  {s?.totalLogs ?? 0} / {MONTHLY_QUOTA}
                </span>
              </div>
              <Progress value={s ? Math.min(100, (s.totalLogs / MONTHLY_QUOTA) * 100) : 0} />
              <p className="text-xs text-muted-foreground">
                AirLabs plan limit. Calls are split across Schedules and Flight endpoints.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" /> Rate limits & constraints
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1.5">
              <Row label="API rate limit" value={`~${RATE_LIMIT_PER_MIN} req/min`} />
              <Row label="Tracking window" value="T-7h → arrival" />
              <Row label="Job dispatch interval" value="Every 1 min (cron)" />
              <Row label="Max subscription rows / query" value="1000" />
              <Row label="Webhook timeout" value="30 s" />
              <Row label="Provider" value="AirLabs.co (single)" />
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" /> Lovable Cloud (Backend) Usage
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Database} label="Subscriptions rows" value={s?.totalSubscriptions ?? "—"} accent="primary" />
          <Stat icon={Clock} label="Scheduled jobs rows" value={s?.totalJobs ?? "—"} accent="sky" />
          <Stat icon={Activity} label="API log rows (all-time)" value={s?.totalLogs ?? "—"} accent="success" />
          <Stat icon={Zap} label="Realtime channels" value={s?.realtimeChannels ?? "—"} accent="primary" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" /> Database rows used
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total rows across tables</span>
                <span className="font-semibold tabular-nums">
                  {s?.totalRows ?? 0} / {CLOUD_DB_ROWS_LIMIT.toLocaleString()}
                </span>
              </div>
              <Progress value={s ? Math.min(100, (s.totalRows / CLOUD_DB_ROWS_LIMIT) * 100) : 0} />
              <p className="text-xs text-muted-foreground">
                Lovable Cloud free-tier soft cap. Live data; tables: subscriptions, scheduled_jobs, api_call_logs.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" /> Cloud limits & constraints
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1.5">
              <Row label="Provider" value="Lovable Cloud (Postgres)" />
              <Row label="Default query row limit" value="1000" />
              <Row label="Egress (free tier)" value={`${CLOUD_EGRESS_GB} GB / month`} />
              <Row label="Realtime channels" value="Up to 200 concurrent" />
              <Row label="Auth users (free tier)" value="50,000 MAU" />
              <Row label="Storage (free tier)" value="1 GB" />
              <Row label="Edge function timeout" value="150 s" />
            </CardContent>
          </Card>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          For exact billing & live quotas, open <strong>Lovable Cloud → Overview</strong> from the project sidebar.
        </p>
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

