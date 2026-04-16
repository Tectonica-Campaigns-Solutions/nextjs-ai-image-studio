"use client";

import { useFormStatus } from "react-dom";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginSubmitButton({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      formAction={action}
      disabled={pending}
      aria-disabled={pending}
      aria-busy={pending}
      className="w-full h-11 rounded-xl bg-dashboard-primary text-dashboard-on-primary border border-dashboard-primary/10 font-semibold hover:opacity-90 shadow-sm shadow-dashboard-primary/20 hover:bg-dashboard-primary/90 hover:text-dashboard-on-primary disabled:opacity-70"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 mr-2 animate-spin" />
          Signing in...
        </>
      ) : (
        <>
          <Lock className="size-4 mr-2" />
          Sign in
        </>
      )}
    </Button>
  );
}

