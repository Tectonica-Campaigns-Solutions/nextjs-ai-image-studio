import { adminLogin } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "../utils/admin-utils";
import { redirect } from "next/navigation";

type AdminLoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const params = await searchParams;
  const error = params.error;

  // If the user is already authenticated and is admin, redirect to the panel
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const admin = await isAdmin();
    if (admin) {
      redirect("/admin/clients");
    }
  }

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
                Admin Panel
              </h1>
              <p className="[font-family:'Manrope',Helvetica] text-[#929292] text-sm text-center">
                Exclusive access for administrators
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-sm text-center [font-family:'Manrope',Helvetica]">
                  {error === "invalid_credentials"
                    ? "Invalid credentials. Please verify your email and password."
                    : error === "not_admin"
                      ? "This user does not have admin permissions."
                      : "Error logging in. Please try again."}
                </p>
              </div>
            )}

            <form className="space-y-6">
              <div className="space-y-2">
                <label className="[font-family:'Manrope',Helvetica] font-semibold text-[#3b4451] text-sm tracking-[-0.08px] leading-5">
                  Email
                </label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  // placeholder="admin@email.com"
                  className="h-[50px] rounded-full border-slate-300 [font-family:'Manrope',Helvetica] font-medium text-gray-60 text-base tracking-[-0.11px] px-4 focus-visible:ring-2 focus-visible:ring-[#5661f6] focus-visible:ring-offset-0 focus-visible:border-[#5661f6]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="[font-family:'Manrope',Helvetica] font-semibold text-[#3b4451] text-sm tracking-[-0.08px] leading-5">
                  Password
                </label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  // placeholder="••••••••"
                  className="h-[50px] rounded-full border-slate-300 [font-family:'Manrope',Helvetica] font-medium text-gray-60 text-base tracking-[-0.11px] px-4 focus-visible:ring-2 focus-visible:ring-[#5661f6] focus-visible:ring-offset-0 focus-visible:border-[#5661f6]"
                  required
                />
              </div>

              <Button
                formAction={adminLogin}
                className="w-full bg-[#5661f6] hover:bg-[#5661f6]/90 rounded-full h-[50px] [font-family:'Manrope',Helvetica] font-semibold text-white text-base tracking-[0] leading-[22px] transition-all duration-200 hover:shadow-lg cursor-pointer"
              >
                Access Admin Panel
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
