"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export default function PlaygroundLoginPage() {
  const router = useRouter();
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/playground-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });

      if (res.ok) {
        router.push("/");
      } else {
        const data = await res.json();
        setError(data.error ?? "Incorrect passphrase. Try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f1f2] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="bg-white rounded-3xl border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-[#5661f6] rounded-full flex items-center justify-center mb-6">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="font-extrabold text-[#3b4451] text-[28px] leading-[34px] text-center mb-2">
                API Playground
              </h1>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm text-center">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="passphrase"
                  className="font-semibold text-[#3b4451] text-sm block"
                >
                  Passphrase
                </label>
                <Input
                  id="passphrase"
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="h-[50px] rounded-full border-slate-300 font-medium text-base px-4 focus-visible:ring-2 focus-visible:ring-[#5661f6] focus-visible:ring-offset-0 focus-visible:border-[#5661f6]"
                  required
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-[50px] rounded-full bg-[#5661f6] hover:bg-[#4451e0] text-white font-semibold text-base"
              >
                {loading ? "Verifying..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
