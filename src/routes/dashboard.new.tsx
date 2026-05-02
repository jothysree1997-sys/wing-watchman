import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getTz, AIRPORT_TZ, localToUtcIso } from "@/lib/airports";
import { toast } from "sonner";
import { Plane } from "lucide-react";

export const Route = createFileRoute("/dashboard/new")({
  component: NewSubscription,
});

function NewSubscription() {
  const nav = useNavigate();
  const [airline, setAirline] = useState("");
  const [num, setNum] = useState("");
  const [dep, setDep] = useState("");
  const [arr, setArr] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!airline || !num || !dep || !arr || !date || !time) {
      toast.error("Please fill all fields");
      return;
    }
    setBusy(true);
    try {
      const tz = getTz(dep);
      const local = `${date}T${time}`;
      const depUtcIso = localToUtcIso(local, tz);
      const flight_iata = `${airline.toUpperCase()}${num}`;

      // Duplicate check
      const { data: dup } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("flight_iata", flight_iata)
        .gte("dep_time_utc", new Date(new Date(depUtcIso).getTime() - 12 * 3600 * 1000).toISOString())
        .lte("dep_time_utc", new Date(new Date(depUtcIso).getTime() + 12 * 3600 * 1000).toISOString())
        .limit(1);
      if (dup && dup.length) {
        toast.error("Already subscribed to this flight");
        setBusy(false);
        return;
      }

      const depUtc = new Date(depUtcIso);
      const now = new Date();
      const tMinus7h = new Date(depUtc.getTime() - 7 * 3600 * 1000);
      const startAt = now >= tMinus7h ? new Date(now.getTime() + 5_000) : tMinus7h;

      const { data: sub, error } = await supabase
        .from("subscriptions")
        .insert({
          airline_iata: airline.toUpperCase(),
          flight_number: num,
          flight_iata,
          dep_iata: dep.toUpperCase(),
          arr_iata: arr.toUpperCase(),
          dep_city: AIRPORT_TZ[dep.toUpperCase()]?.city,
          arr_city: AIRPORT_TZ[arr.toUpperCase()]?.city,
          dep_local_datetime: local,
          timezone: tz,
          dep_time_utc: depUtcIso,
          status: "SUBSCRIBED",
          phase: "SCHEDULED",
          next_job_time: startAt.toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: jerr } = await supabase.from("scheduled_jobs").insert({
        subscription_id: sub!.id,
        job_type: "START_TRACKING",
        phase: "START_TRACKING",
        run_at: startAt.toISOString(),
      });
      if (jerr) throw jerr;

      toast.success("Subscribed! Tracking job scheduled.");
      nav({ to: "/dashboard/subscriptions" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to subscribe");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">New subscription</h1>
      <p className="text-muted-foreground mb-6">
        We start API tracking 7 hours before departure (in airport local time). Earlier subscriptions are scheduled.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plane className="h-4 w-4 text-primary" /> Flight details</CardTitle>
          <CardDescription>All times in <span className="font-semibold">departure airport's local timezone</span>.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Airline IATA</Label>
              <Input maxLength={3} placeholder="6E" value={airline} onChange={(e) => setAirline(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-2">
              <Label>Flight number</Label>
              <Input placeholder="855" value={num} onChange={(e) => setNum(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Departure airport (IATA)</Label>
              <Input maxLength={3} placeholder="BLR" value={dep} onChange={(e) => setDep(e.target.value.toUpperCase())} />
              {dep && <p className="text-xs text-muted-foreground">Timezone: {getTz(dep)}</p>}
            </div>
            <div className="space-y-2">
              <Label>Arrival airport (IATA)</Label>
              <Input maxLength={3} placeholder="HYD" value={arr} onChange={(e) => setArr(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-2">
              <Label>Departure date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Departure time (local)</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={busy}>{busy ? "Scheduling…" : "Subscribe"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
