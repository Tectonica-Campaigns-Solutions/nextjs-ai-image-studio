import { adminLogin } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Lock } from "lucide-react";
import { getCurrentUserWithRole } from "@/app/(studio)/dashboard/utils/admin-utils";
import { redirect } from "next/navigation";

type AdminLoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const params = await searchParams;
  const error = params.error;

  const { user, isAdmin } = await getCurrentUserWithRole();
  if (user && isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/10 rounded-2xl shadow-sm shadow-on-surface/5 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-dashboard-primary text-dashboard-on-primary flex items-center justify-center mb-5 shadow-sm shadow-dashboard-primary/25">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface text-center mb-2">
            Dashboard Admin
          </h1>
          <p className="text-on-surface-variant text-sm text-center">
            Access restricted to platform administrators.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
            <p className="text-destructive text-sm text-center">
              {error === "invalid_credentials"
                ? "Invalid credentials. Please verify your email and password."
                : error === "not_admin"
                  ? "This user does not have admin permissions."
                  : "Error logging in. Please try again."}
            </p>
          </div>
        )}

        <form className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
            >
              Email
            </label>
            <Input
              type="email"
              id="email"
              name="email"
              className="dashboard-input h-11 rounded-xl !bg-surface-container-low !border-outline-variant/10 px-4 shadow-none focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
              placeholder="admin@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
            >
              Password
            </label>
            <Input
              type="password"
              id="password"
              name="password"
              className="dashboard-input h-11 rounded-xl !bg-surface-container-low !border-outline-variant/10 px-4 shadow-none focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
              placeholder="Enter your password"
              required
            />
          </div>

          <Button
            formAction={adminLogin}
            className="w-full h-11 rounded-xl bg-dashboard-primary text-dashboard-on-primary border border-dashboard-primary/10 font-semibold hover:opacity-90 shadow-sm shadow-dashboard-primary/20"
          >
            <Lock className="size-4 mr-2" />
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
