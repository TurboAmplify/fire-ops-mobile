import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

import { useAppBackground } from "@/hooks/useAppBackground";

const emailSchema = z.string().trim().email("Enter a valid email").max(255, "Email too long");
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password too long");

export default function Login() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { src: heroBg } = useAppBackground();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [hasInviteCode, setHasInviteCode] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        throw result.error instanceof Error ? result.error : new Error(String(result.error));
      }
      // If redirected, the browser will navigate away; nothing else to do
    } catch (err: any) {
      toast({
        title: "Sign in with Apple failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
      setAppleLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    // ProtectedRoute on "/" will route platform admins onward to /super-admin.
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs before hitting auth
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        throw new Error(emailResult.error.issues[0]?.message ?? "Invalid email");
      }
      const cleanEmail = emailResult.data;

      if (mode !== "forgot") {
        const passwordResult = passwordSchema.safeParse(password);
        if (!passwordResult.success) {
          throw new Error(passwordResult.error.issues[0]?.message ?? "Invalid password");
        }
      }

      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Check your email", description: "Password reset link sent." });
        setMode("login");
      } else if (mode === "signup") {
        // If they have an invite code, normalize and validate it before creating the account
        const normalizedCode = hasInviteCode
          ? inviteCode.toUpperCase().replace(/[^A-Z0-9]/g, "")
          : "";
        if (hasInviteCode && normalizedCode.length < 6) {
          throw new Error("Enter the invite code your team admin gave you.");
        }

        const { data: signUpData, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;

        // If signup auto-confirms (no email verification), session is present and
        // we can immediately accept the invite. Otherwise, the code is preserved
        // server-side and the user can finish via the email confirmation link.
        if (hasInviteCode && signUpData.session) {
          const { error: rpcError } = await supabase.rpc(
            "accept_invite_by_code" as any,
            { _code: normalizedCode } as any,
          );
          if (rpcError) throw rpcError;
          toast({
            title: "Welcome aboard",
            description: "You've joined your team.",
          });
          // ProtectedRoute will route to the org dashboard now that membership exists
          return;
        }

        toast({
          title: "Account created",
          description: hasInviteCode
            ? "Verify your email, then sign in to join your team."
            : "Check your email to verify your account before signing in.",
        });
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Cinematic hero header */}
      <div className="relative overflow-hidden safe-area-top">
        <img
          src={heroBg}
          alt=""
          className="w-full h-48 object-cover"
          width={1280}
          height={640}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" style={{ backgroundSize: '100% 120%' }} />
        <div className="absolute bottom-4 left-0 right-0 px-6 flex flex-col items-center">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">FireOps HQ</h1>
          <p className="text-sm text-white/50 mt-0.5">Wildfire Operations Management</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 -mt-1 rounded-t-3xl bg-background px-6 pt-6 pb-8 relative z-10">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold">
              {mode === "login" && "Welcome back"}
              {mode === "signup" && "Create your account"}
              {mode === "forgot" && "Reset password"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "login" && "Sign in to continue"}
              {mode === "signup" && "Get started with FireOps"}
              {mode === "forgot" && "We'll send you a reset link"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="h-12 rounded-xl bg-secondary border-border text-[15px] placeholder:text-muted-foreground/50"
              />
            </div>

            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="h-12 rounded-xl bg-secondary border-border text-[15px] placeholder:text-muted-foreground/50"
                />
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setHasInviteCode((v) => !v)}
                  className="text-xs font-medium text-primary"
                >
                  {hasInviteCode ? "I'm starting a new team instead" : "I have an invite code"}
                </button>
                {hasInviteCode && (
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-code" className="text-xs font-medium text-muted-foreground">
                      Invite Code
                    </Label>
                    <Input
                      id="invite-code"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="e.g. K7M2X9PQ"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={12}
                      className="h-12 rounded-xl bg-secondary border-border text-[15px] tracking-widest font-mono placeholder:text-muted-foreground/50 placeholder:font-sans placeholder:tracking-normal"
                    />
                    <p className="text-xs text-muted-foreground">
                      Ask your team admin for this code.
                    </p>
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-[15px] font-bold fire-gradient border-0 text-white touch-target"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "login" && "Sign In"}
              {mode === "signup" && "Create Account"}
              {mode === "forgot" && "Send Reset Link"}
            </Button>
          </form>

          <div className="space-y-3 text-center text-sm">
            {mode === "login" && (
              <>
                <button
                  onClick={() => setMode("forgot")}
                  className="text-muted-foreground active:text-foreground"
                >
                  Forgot password?
                </button>
                <p className="text-muted-foreground">
                  No account?{" "}
                  <button
                    onClick={() => setMode("signup")}
                    className="text-primary font-semibold"
                  >
                    Sign up
                  </button>
                </p>
              </>
            )}
            {(mode === "signup" || mode === "forgot") && (
              <p className="text-muted-foreground">
                Back to{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-primary font-semibold"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
