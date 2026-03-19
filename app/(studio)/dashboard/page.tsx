import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { getDashboardOverviewData } from "@/app/(studio)/dashboard/data/overview";
import {
  Users,
  Image as ImageIcon,
  Type,
  Layout,
  Plus,
  Shield,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const auth = await requireAdmin();
  if (!auth.success) {
    redirect("/dashboard/login?error=admin_required");
  }

  const data = await getDashboardOverviewData();
  if (!data) {
    redirect("/dashboard/login?error=admin_required");
  }

  const { stats, recentClients } = data;

  const kpis = [
    {
      label: "Total Clients",
      value: stats.totalClients,
      detail: `${stats.activeClients} active`,
      icon: Users,
      href: "/dashboard/clients",
    },
    {
      label: "Assets",
      value: stats.totalAssets,
      detail: "logos & frames",
      icon: ImageIcon,
      href: "/dashboard/clients",
    },
    {
      label: "Fonts",
      value: stats.totalFonts,
      detail: "registered",
      icon: Type,
      href: "/dashboard/clients",
    },
    {
      label: "Canvas Sessions",
      value: stats.totalCanvasSessions,
      detail: "saved",
      icon: Layout,
      href: "/dashboard/clients",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1 text-balance">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground text-pretty">
              Overview of your AI Image Studio
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/dashboard/admins">
                <Shield className="size-4" aria-hidden />
                New Admin
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/clients">
                <Plus className="size-4" aria-hidden />
                New Client
              </Link>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map((kpi) => (
            <Link key={kpi.label} href={kpi.href}>
              <Card className="p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    <kpi.icon className="size-5 text-muted-foreground" aria-hidden />
                  </div>
                </div>
                <p className="text-2xl font-semibold text-foreground tabular-nums">
                  {kpi.value}
                </p>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.detail}</p>
              </Card>
            </Link>
          ))}
        </div>

        {/* Recent Clients */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground text-balance">
              Recent Clients
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/clients">
                View all
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>

          {recentClients.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                <Users className="size-7 text-muted-foreground" aria-hidden />
              </div>
              <p className="text-sm text-muted-foreground mb-4 text-pretty">
                No clients yet. Create your first one to get started.
              </p>
              <Button asChild>
                <Link href="/dashboard/clients">
                  <Plus className="size-4" aria-hidden />
                  New Client
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/dashboard/clients/${client.id}`}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0 group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate group-hover:underline">
                      {client.name}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      Created{" "}
                      {new Date(client.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge
                    variant={client.is_active ? "secondary" : "outline"}
                    className={cn(
                      "ml-3",
                      client.is_active &&
                        "bg-green-100 text-green-800 border-transparent dark:bg-green-900/30 dark:text-green-200"
                    )}
                  >
                    {client.is_active ? "Active" : "Inactive"}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
    </div>
  );
}
