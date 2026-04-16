"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

export function PasswordField() {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        id="password"
        name="password"
        className="dashboard-input h-11 rounded-xl !bg-surface-container-low !border-outline-variant/10 px-4 pr-12 shadow-none focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
        placeholder="Enter your password"
        required
        autoComplete="current-password"
      />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-on-surface-variant hover:text-on-surface"
        onClick={() => setShow((v) => !v)}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

