import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";

export function AdminShellSkeleton() {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border">
        <SidebarHeader className="p-4">
          <Skeleton className="size-7 rounded-md" />
        </SidebarHeader>
        <SidebarContent>
          <Skeleton className="h-4 w-24 mb-4" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </SidebarContent>
        <SidebarFooter className="p-2">
          <Skeleton className="h-9 w-full" />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background px-4">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-4 w-32" />
        </header>
        <main className="flex-1 p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-full max-w-md mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
