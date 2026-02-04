"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";
import { setupPasswordAction } from "@/app/(studio)/dashboard/actions/auth";

interface AcceptInvitationFormProps {
  userEmail: string | null;
}

export function AcceptInvitationForm({ userEmail }: AcceptInvitationFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password.trim()) {
      setError("Password is required");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSaving(true);
    const result = await setupPasswordAction({
      password,
      confirmPassword,
    });
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f1f2] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="bg-white rounded-3xl border-0 shadow-drop-shadow">
          <CardContent className="p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-[#5661f6] rounded-full flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="[font-family:'Manrope',Helvetica] font-extrabold text-[#3b4451] text-[28px] tracking-[0] leading-[34px] text-center mb-2">
                Set Password
              </h1>
              <p className="[font-family:'Manrope',Helvetica] text-[#929292] text-sm text-center">
                {userEmail
                  ? `Welcome ${userEmail}. Set your password to complete your registration.`
                  : "Set your password to complete your registration as an admin."}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-sm text-center [font-family:'Manrope',Helvetica]">
                  {error}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label
                  className="[font-family:'Manrope',Helvetica] font-semibold text-[#3b4451] text-sm tracking-[-0.08px] leading-5"
                  htmlFor="password"
                >
                  Password
                </Label>
                <Input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-[50px] rounded-full border-slate-300 [font-family:'Manrope',Helvetica] font-medium text-gray-60 text-base tracking-[-0.11px] px-4 focus-visible:ring-2 focus-visible:ring-[#5661f6] focus-visible:ring-offset-0 focus-visible:border-[#5661f6]"
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label
                  className="[font-family:'Manrope',Helvetica] font-semibold text-[#3b4451] text-sm tracking-[-0.08px] leading-5"
                  htmlFor="confirmPassword"
                >
                  Confirm Password
                </Label>
                <Input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-[50px] rounded-full border-slate-300 [font-family:'Manrope',Helvetica] font-medium text-gray-60 text-base tracking-[-0.11px] px-4 focus-visible:ring-2 focus-visible:ring-[#5661f6] focus-visible:ring-offset-0 focus-visible:border-[#5661f6]"
                  required
                  autoComplete="new-password"
                />
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-[#5661f6] hover:bg-[#5661f6]/90 rounded-full h-[50px] [font-family:'Manrope',Helvetica] font-semibold text-white text-base tracking-[0] leading-[22px] transition-all duration-200 hover:shadow-lg cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting password...
                  </>
                ) : (
                  "Set Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
