import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, ArrowRight, Loader2 } from "lucide-react";

type AuthForm = z.infer<typeof insertUserSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [, setLocation] = useLocation();
  const { login, register, user } = useAuth();

  const form = useForm<AuthForm>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { username: "", password: "" },
  });

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const onSubmit = async (data: AuthForm) => {
    if (isLogin) {
      await login.mutateAsync(data);
    } else {
      await register.mutateAsync(data);
    }
  };

  const isPending = login.isPending || register.isPending;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Decorative Premium Area */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary overflow-hidden items-center justify-center p-12">
        {/* landing page hero abstract dark premium texture */}
        <img
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
          alt="Premium Architecture"
          className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-secondary/90 z-10" />

        <div className="relative z-20 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center space-x-4 mb-8"
          >
            <div className="h-16 w-16 bg-accent rounded-2xl flex items-center justify-center shadow-xl shadow-accent/20">
              <Shield className="h-8 w-8 text-accent-foreground" />
            </div>
            <h1 className="text-white text-5xl font-display font-bold tracking-tight">Vault.</h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-primary-foreground/80 text-xl leading-relaxed"
          >
            The enterprise-grade document management system for your most sensitive files. End-to-end security, seamless access.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 flex items-center space-x-6 text-sm text-primary-foreground/60 font-medium"
          >
            <div className="flex items-center"><Lock className="h-4 w-4 mr-2" /> AES-256 Encryption</div>
            <div className="flex items-center"><Shield className="h-4 w-4 mr-2" /> SOC2 Compliant</div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-3xl premium-shadow border border-slate-100 p-8 sm:p-10"
        >
          <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-slate-900 mb-2">
              {isLogin ? "Welcome back" : "Create your vault"}
            </h2>
            <p className="text-slate-500">
              {isLogin ? "Enter your credentials to access your files." : "Sign up to start securely storing your documents."}
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700 font-semibold">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                className="h-12 rounded-xl border-slate-200 focus-visible:ring-accent focus-visible:border-accent text-lg"
                {...form.register("username")}
              />
              {form.formState.errors.username && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700 font-semibold">Password</Label>
                {isLogin && <span className="text-sm text-accent font-medium cursor-pointer hover:underline">Forgot?</span>}
              </div>
              <Input
                id="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="h-12 rounded-xl border-slate-200 focus-visible:ring-accent focus-visible:border-accent text-lg"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 group"
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="ml-2 h-5 w-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-500">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  form.reset();
                }}
                className="text-accent font-semibold hover:underline transition-all"
              >
                {isLogin ? "Create one" : "Sign in"}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
