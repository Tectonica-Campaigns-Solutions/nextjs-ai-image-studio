"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 text-center">
        <AlertCircle className="size-12 text-destructive mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2 text-balance">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground mb-6 text-pretty">
          An error occurred. Please try again.
        </p>
        <Button onClick={() => reset()}>Try again</Button>
      </Card>
    </div>
  );
}
