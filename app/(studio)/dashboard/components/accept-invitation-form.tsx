"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2, Lock } from "lucide-react";
import { setupPasswordAction } from "@/app/(studio)/dashboard/actions/auth";

interface AcceptInvitationFormProps {
  userEmail: string | null;
}

export function AcceptInvitationForm({ userEmail }: AcceptInvitationFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log("[AcceptInvitationForm] Render", { userEmail: userEmail ?? "(null)" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[AcceptInvitationForm] handleSubmit");
    setError(null);
    if (!password.trim()) {
      console.log("[AcceptInvitationForm] Validation: password required");
      setError("Password is required");
      return;
    }
    if (password !== confirmPassword) {
      console.log("[AcceptInvitationForm] Validation: passwords do not match");
      setError("Passwords do not match");
      return;
    }
    setSaving(true);
    console.log("[AcceptInvitationForm] Calling setupPasswordAction");
    const result = await setupPasswordAction({
      password,
      confirmPassword,
    });
    setSaving(false);
    console.log("[AcceptInvitationForm] setupPasswordAction result:", result?.error ? { error: result.error } : "ok");
    if (result?.error) {
      setError(result.error);
      return;
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/10 rounded-2xl shadow-sm shadow-on-surface/5 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-dashboard-primary text-dashboard-on-primary flex items-center justify-center mb-5 shadow-sm shadow-dashboard-primary/25">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface text-center mb-2">
            Set Password
          </h1>
          <p className="text-on-surface-variant text-sm text-center">
            {userEmail
              ? `Welcome ${userEmail}. Set your password to complete your registration.`
              : "Set your password to complete your registration as an admin."}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            <p className="text-destructive text-sm text-center">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label
              className="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
              htmlFor="password"
            >
              Password
            </Label>
            <Input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="dashboard-input h-11 rounded-xl !bg-surface-container-low !border-outline-variant/10 px-4 shadow-none focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label
              className="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
              htmlFor="confirmPassword"
            >
              Confirm Password
            </Label>
            <Input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="dashboard-input h-11 rounded-xl !bg-surface-container-low !border-outline-variant/10 px-4 shadow-none focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
              required
              autoComplete="new-password"
            />
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full h-11 rounded-xl bg-dashboard-primary text-dashboard-on-primary border border-dashboard-primary/10 font-semibold hover:opacity-90 shadow-sm shadow-dashboard-primary/20"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Setting password...
              </>
            ) : (
              <>
                <Lock className="size-4 mr-2" />
                Set Password
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
