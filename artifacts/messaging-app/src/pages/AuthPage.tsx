import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(
    !new URLSearchParams(window.location.search).get("signup")
  );
  const { login, signup, isLoggingIn, isSigningUp, isAuthenticated } = useAuth();
  const [location, navigate] = useLocation();

  // Only redirect when used as the standalone /login page, not when embedded inside ProtectedRoute
  useEffect(() => {
    if (isAuthenticated && location === "/login") navigate("/");
  }, [isAuthenticated, location, navigate]);

  const [error, setError] = useState<string | null>(null);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
  });

  const onLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    setError(null);
    try {
      await login({ data: values });
    } catch (err: any) {
      setError(err?.data?.error || "Invalid credentials");
    }
  };

  const onSignupSubmit = async (values: z.infer<typeof signupSchema>) => {
    setError(null);
    try {
      await signup({ data: values });
    } catch (err: any) {
      setError(err?.data?.error || "Failed to create account");
    }
  };

  const isLoading = isLoggingIn || isSigningUp;

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background">
      {/* Immersive Background */}
      <img
        src={`${import.meta.env.BASE_URL}images/login-bg.png`}
        alt="Abstract background"
        className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen scale-105 transform origin-center animate-[pulse_10s_ease-in-out_infinite]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[420px] p-8 glass-panel rounded-[2rem] shadow-2xl mx-4 border border-white/10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 bg-gradient-to-tr from-primary to-violet-400 rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-center mb-6 transform rotate-3">
            <MessageSquare className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            {isLogin ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-muted-foreground text-center">
            {isLogin ? "Enter your details to access your chats." : "Sign up to start connecting instantly."}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: "auto" }} 
            className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-6 border border-destructive/20 text-center"
          >
            {error}
          </motion.div>
        )}

        <div className="relative">
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                className="space-y-4"
              >
                <div>
                  <input
                    {...loginForm.register("email")}
                    type="email"
                    placeholder="Email address"
                    className="w-full px-4 py-3.5 bg-secondary/50 border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-destructive text-xs mt-1 ml-1">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div>
                  <input
                    {...loginForm.register("password")}
                    type="password"
                    placeholder="Password"
                    className="w-full px-4 py-3.5 bg-secondary/50 border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-destructive text-xs mt-1 ml-1">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/25 transition-all flex items-center justify-center group disabled:opacity-70"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      Sign In <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={signupForm.handleSubmit(onSignupSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      {...signupForm.register("firstName")}
                      type="text"
                      placeholder="First name"
                      className="w-full px-4 py-3.5 bg-secondary/50 border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                    {signupForm.formState.errors.firstName && (
                      <p className="text-destructive text-xs mt-1 ml-1">{signupForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <input
                      {...signupForm.register("lastName")}
                      type="text"
                      placeholder="Last name"
                      className="w-full px-4 py-3.5 bg-secondary/50 border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                    {signupForm.formState.errors.lastName && (
                      <p className="text-destructive text-xs mt-1 ml-1">{signupForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                <div>
                  <input
                    {...signupForm.register("email")}
                    type="email"
                    placeholder="Email address"
                    className="w-full px-4 py-3.5 bg-secondary/50 border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  {signupForm.formState.errors.email && (
                    <p className="text-destructive text-xs mt-1 ml-1">{signupForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div>
                  <input
                    {...signupForm.register("password")}
                    type="password"
                    placeholder="Password (min 6 chars)"
                    className="w-full px-4 py-3.5 bg-secondary/50 border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  {signupForm.formState.errors.password && (
                    <p className="text-destructive text-xs mt-1 ml-1">{signupForm.formState.errors.password.message}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 mt-2 bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 text-white rounded-xl font-semibold shadow-lg shadow-primary/25 transition-all flex items-center justify-center group disabled:opacity-70"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      Create Account <Sparkles className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setError(null);
              setIsLogin(!isLogin);
            }}
            className="text-muted-foreground hover:text-white text-sm transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
