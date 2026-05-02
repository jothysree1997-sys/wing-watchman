import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Cloud, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/dashboard/providers")({
  component: Providers,
});

const APIS = [
  { endpoint: "schedules", name: "Schedules API", path: "GET /schedules", desc: "Used during pre-departure phases. Smart-filtered against requested flight." },
  { endpoint: "flight", name: "Flight API", path: "GET /flight", desc: "Used for live status: departure detection and arrival tracking." },
];

function Providers() {
  const [stats, setStats] = useState<Record<string, { total: number; success: number; failed: number }>>({});

  async function load() {
    const { data } = await supabase.from("api_call_logs").select("endpoint, success");
    const map: any = {};
    (data ?? []).forEach((r) => {
      const k = r.endpoint;
      map[k] ??= { total: 0, success: 0, failed: 0 };
      map[k].total++;
      if (r.success) map[k].success++; else map[k].failed++;
    });
    setStats(map);
  }
  useEffect(() => {
    load();
    const ch = supabase.channel("prov")
      .on("postgres_changes", { event: "*", schema: "public", table: "api_call_logs" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Providers</h1>
        <p className="text-muted-foreground">Data providers used for flight tracking.</p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-sky/10">
          <CardTitle className="flex items-center gap-2"><Cloud className="h-5 w-5 text-primary" /> AirLabs.co</CardTitle>
          <CardDescription>2 APIs in use · Smart filtering enabled for /schedules</CardDescription>
        </CardHeader>
        <CardContent className="p-6 grid gap-4 md:grid-cols-2">
          {APIS.map((a) => {
            const s = stats[a.endpoint] ?? { total: 0, success: 0, failed: 0 };
            return (
              <div key={a.endpoint} className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-xs font-mono text-muted-foreground">{a.path}</div>
                  </div>
                  <div className="text-2xl font-bold tabular-nums">{s.total}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{a.desc}</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="rounded-lg border p-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <div>
                      <div className="text-xs text-muted-foreground">Success</div>
                      <div className="font-semibold tabular-nums">{s.success}</div>
                    </div>
                  </div>
                  <div className="rounded-lg border p-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                      <div className="font-semibold tabular-nums">{s.failed}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
