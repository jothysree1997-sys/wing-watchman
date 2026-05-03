import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInTz, getTz } from "@/lib/airports";
import { Plane, ArrowRight, ChevronRight } from "lucide-react";
import { Fragment } from "react";

export const Route = createFileRoute("/dashboard/subscriptions")({
  component: Subs,
});

const statusTone: Record<string, string> = {
  SUBSCRIBED: "bg-sky/15 text-sky border-sky/30",
  TRACKING_STARTED: "bg-primary/15 text-primary border-primary/30",
  COMPLETED: "bg-success/15 text-success border-success/30",
  CANCELLED: "bg-muted text-muted-foreground",
  FAILED: "bg-destructive/15 text-destructive border-destructive/30",
};

function Subs() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState<any | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    const { data } = await supabase.from("subscriptions").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => {
    load();
    const ch = supabase.channel("subs-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function openDetails(sub: any) {
    setOpen(sub);
    const [{ data: js }, { data: ls }] = await Promise.all([
      supabase.from("scheduled_jobs").select("*").eq("subscription_id", sub.id).order("run_at", { ascending: true }),
      supabase.from("api_call_logs").select("*").eq("subscription_id", sub.id).order("created_at", { ascending: false }),
    ]);
    setJobs(js ?? []);
    setLogs(ls ?? []);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground">Click any row to view scheduled API calls and history.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Flight</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Arrival</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">API calls</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No subscriptions yet.</TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-accent/50" onClick={() => openDetails(r)}>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="font-medium flex items-center gap-2"><Plane className="h-3.5 w-3.5 text-primary" />{r.flight_iata}</TableCell>
                  <TableCell className="text-sm">{r.dep_iata} <ArrowRight className="inline h-3 w-3" /> {r.arr_iata}</TableCell>
                  <TableCell className="text-sm">{formatInTz(r.dep_time_utc, getTz(r.dep_iata))} <span className="text-[10px] text-muted-foreground">({getTz(r.dep_iata)})</span></TableCell>
                  <TableCell className="text-sm">{r.arr_time_utc ? <>{formatInTz(r.arr_time_utc, getTz(r.arr_iata))} <span className="text-[10px] text-muted-foreground">({getTz(r.arr_iata)})</span></> : "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={statusTone[r.status] ?? ""}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{r.api_call_count}/10</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-primary" /> {open.flight_iata} — {open.dep_iata} → {open.arr_iata}
                </DialogTitle>
                <DialogDescription>
                  {formatInTz(open.dep_time_utc, open.timezone)} ({open.timezone})
                </DialogDescription>
              </DialogHeader>

              {(() => {
                const depTz = getTz(open.dep_iata);
                const arrTz = getTz(open.arr_iata);
                const fmtBoth = (iso?: string | null) => {
                  if (!iso) return "—";
                  return (
                    <div className="space-y-0.5">
                      <div>{formatInTz(iso, depTz)} <span className="text-[10px] text-muted-foreground">{depTz}</span></div>
                      <div>{formatInTz(iso, arrTz)} <span className="text-[10px] text-muted-foreground">{arrTz}</span></div>
                    </div>
                  );
                };
                return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Status" v={<Badge variant="outline" className={statusTone[open.status] ?? ""}>{open.status_normalized ?? open.status}</Badge>} />
                <Field label="Phase" v={open.phase} />
                <Field label="API calls" v={`${open.api_call_count} / 10`} />
                <Field label="Failed calls" v={open.failed_api_count} />

                <Field label="Scheduled departure" v={fmtBoth(open.dep_time_utc)} />
                <Field label="Estimated departure" v={fmtBoth(open.dep_estimated_utc)} />
                <Field label="Actual departure" v={fmtBoth(open.dep_actual_utc)} />
                <Field label="Departure delay" v={open.dep_delayed != null ? `${open.dep_delayed} min` : "—"} />

                <Field label="Scheduled arrival" v={fmtBoth(open.arr_time_utc)} />
                <Field label="Estimated arrival" v={fmtBoth(open.arr_estimated_utc)} />
                <Field label="Actual arrival" v={fmtBoth(open.arr_actual_utc)} />
                <Field label="Arrival delay" v={open.arr_delayed != null ? `${open.arr_delayed} min` : "—"} />

                <Field label="Dep terminal" v={open.dep_terminal ?? "—"} />
                <Field label="Dep gate" v={open.dep_gate ?? "—"} />
                <Field label="Arr terminal" v={open.arr_terminal ?? "—"} />
                <Field label="Arr gate" v={open.arr_gate ?? "—"} />
                <Field label="Baggage belt" v={open.arr_baggage ?? "—"} />
                <Field label="Duration" v={open.duration ? `${open.duration} min` : "—"} />
              </div>
                );
              })()}

              <div>
                <h3 className="font-semibold mt-2 mb-2">Scheduled API calls</h3>
                <div className="rounded border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phase</TableHead>
                        <TableHead>Run at (local)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Attempt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">None</TableCell></TableRow>}
                      {jobs.map((j) => (
                        <TableRow key={j.id}>
                          <TableCell className="text-sm">{j.phase}</TableCell>
                          <TableCell className="text-sm">{formatInTz(j.run_at, open.timezone)}</TableCell>
                          <TableCell><Badge variant="outline">{j.status}</Badge></TableCell>
                          <TableCell>{j.attempt}/{j.max_attempts}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mt-2 mb-2">API call history</h3>
                <div className="rounded border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>When</TableHead>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>HTTP</TableHead>
                        <TableHead>Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">None yet</TableCell></TableRow>}
                      {logs.map((l) => {
                        const isOpen = !!expanded[l.id];
                        return (
                          <Fragment key={l.id}>
                            <TableRow className="cursor-pointer" onClick={() => setExpanded((s) => ({ ...s, [l.id]: !s[l.id] }))}>
                              <TableCell><ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} /></TableCell>
                              <TableCell className="text-xs">{new Date(l.created_at).toLocaleString()}</TableCell>
                              <TableCell className="font-mono text-xs">/{l.endpoint}</TableCell>
                              <TableCell className="text-xs">{l.http_status}</TableCell>
                              <TableCell>
                                {l.success
                                  ? <Badge className="bg-success text-success-foreground">success</Badge>
                                  : <Badge variant="destructive">{l.error?.slice(0, 40) ?? "failed"}</Badge>}
                              </TableCell>
                            </TableRow>
                            {isOpen && (
                              <TableRow>
                                <TableCell colSpan={5} className="bg-muted/40">
                                  <div className="space-y-2">
                                    <div>
                                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Request params</div>
                                      <pre className="text-xs bg-background border rounded p-2 overflow-auto max-h-48">{JSON.stringify(l.request_params, null, 2)}</pre>
                                    </div>
                                    <div>
                                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Response</div>
                                      <pre className="text-xs bg-background border rounded p-2 overflow-auto max-h-96">{JSON.stringify(l.response, null, 2)}</pre>
                                    </div>
                                    {l.error && (
                                      <div>
                                        <div className="text-[10px] uppercase tracking-wider text-destructive mb-1">Error</div>
                                        <pre className="text-xs bg-background border rounded p-2 overflow-auto max-h-32">{l.error}</pre>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, v }: any) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm mt-1">{v}</div>
    </div>
  );
}
