"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, Users, Shield, LayoutDashboard, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/clients", label: "Clients", icon: Users, exact: false },
  { href: "/dashboard/admins", label: "Admins", icon: Shield, exact: false },
];

function buildBreadcrumbs(pathname: string) {
  const crumbs: { label: string; href?: string }[] = [
    { label: "Dashboard", href: "/dashboard" },
  ];

  if (pathname.startsWith("/dashboard/clients")) {
    crumbs.push({ label: "Clients", href: "/dashboard/clients" });
    const match = pathname.match(/^\/dashboard\/clients\/([^/]+)/);
    if (match) {
      crumbs.push({ label: "Detail" });
    }
  } else if (pathname.startsWith("/dashboard/admins")) {
    crumbs.push({ label: "Admins", href: "/dashboard/admins" });
    const match = pathname.match(/^\/dashboard\/admins\/([^/]+)/);
    if (match) {
      crumbs.push({ label: "Detail" });
    }
  }

  return crumbs;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isAuthPage =
    pathname?.startsWith("/dashboard/login") ||
    pathname?.startsWith("/dashboard/accept-invitation");

  // Para pantallas exportadas de Dashboard (sidebar/top-nav incluidos),
  // evitamos renderizar tu AdminShell para no duplicar navegación.
  const isDashboardExportPage =
    pathname === "/dashboard" ||
    pathname?.startsWith("/dashboard/clients") ||
    pathname?.startsWith("/dashboard/admins") ||
    pathname?.startsWith("/dashboard/assets") ||
    pathname?.startsWith("/dashboard/frames-fonts") ||
    pathname?.startsWith("/dashboard/canvas-sessions");

  if (isAuthPage || isDashboardExportPage) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/dashboard/login");
  };

  const breadcrumbs = buildBreadcrumbs(pathname ?? "/dashboard");

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border">
        <SidebarHeader className="p-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold text-foreground group-data-[collapsible=icon]:justify-center"
          >
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <PanelLeft className="size-4" />
            </div>
            <span className="group-data-[collapsible=icon]:hidden">
              Admin Panel
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname?.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={!!isActive}>
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout}>
                <LogOut className="size-4" />
                <span>Log out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header
          className={cn(
            "sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background px-4",
            "pt-[env(safe-area-inset-top)]"
          )}
        >
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.label}>
                    {i > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href!}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main
          className={cn(
            "flex-1",
            "pb-[env(safe-area-inset-bottom)]"
          )}
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
