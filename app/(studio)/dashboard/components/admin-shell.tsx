"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isAuthPage =
    pathname?.startsWith("/dashboard/login") ||
    pathname?.startsWith("/dashboard/accept-invitation");

  if (isAuthPage) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/dashboard/login");
  };

  return (
    <div
      className={cn(
        "min-h-dvh flex flex-col bg-background",
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      <header
        className={cn(
          "sticky top-0 z-50 flex h-14 items-center gap-6 border-b border-border bg-white px-6",
          "pt-[env(safe-area-inset-top)] pl-[calc(1.5rem+env(safe-area-inset-left))] pr-[calc(1.5rem+env(safe-area-inset-right))]"
        )}
      >
        <nav className="flex items-center gap-1" aria-label="Admin navigation">
          <Link
            href="/dashboard/clients"
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname?.startsWith("/dashboard/clients")
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <Users className="size-4" aria-hidden />
            Clients
          </Link>
          <Link
            href="/dashboard/admins"
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname?.startsWith("/dashboard/admins")
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <Shield className="size-4" aria-hidden />
            Admins
          </Link>
        </nav>
        <div className="ml-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Log out"
          >
            <LogOut className="size-4" aria-hidden />
          </Button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
