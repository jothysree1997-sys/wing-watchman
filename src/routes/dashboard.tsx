import { createFileRoute, Outlet, Link, useNavigate, useLocation, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plane, LayoutDashboard, PlusCircle, ListChecks, Cloud, LogOut } from "lucide-react";
import { isLoggedIn, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem("chatb_auth") !== "1") throw redirect({ to: "/login" });
    }
  },
  component: DashboardLayout,
});

const tabs = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/new", label: "New Subscription", icon: PlusCircle },
  { to: "/dashboard/subscriptions", label: "Subscriptions", icon: ListChecks },
  { to: "/dashboard/providers", label: "Providers", icon: Cloud },
];

function DashboardLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-sky flex items-center justify-center text-primary-foreground">
              <Plane className="h-4 w-4" />
            </div>
            <span className="font-display font-bold">ChatB Flight Alert</span>
          </Link>
          <nav className="flex gap-1 ml-4 overflow-x-auto">
            {tabs.map((t) => {
              const active = t.exact ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground/80"
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={() => { logout(); nav({ to: "/login" }); }}>
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
