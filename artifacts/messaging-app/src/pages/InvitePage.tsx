import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Sparkles, ArrowRight, Loader2, Users, Image, Video, Smile } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useState } from "react";

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});

const features = [
  { icon: MessageSquare, label: "Real-time messaging", desc: "Instant delivery, always in sync" },
  { icon: Users, label: "Group chats", desc: "Bring your whole crew together" },
  { icon: Image, label: "Photos & GIFs", desc: "Share moments, memes and reactions" },
  { icon: Video, label: "Video sharing", desc: "YouTube, Vimeo or direct links" },
  { icon: Smile, label: "Emoji & reactions", desc: "Express yourself without words" },
];

export default function InvitePage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const from = params.get("from");
  const { signup, isSigningUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (values: z.infer<typeof signupSchema>) => {
    setError(null);
    try {
      await signup({ data: values });
    } catch (err: any) {
      setError(err?.data?.error || "Failed to create account. Please try again.");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background flex flex-col lg:flex-row">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-[100px]" />
      </div>

      {/* ── LEFT PANEL: intro ── */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex flex-col justify-center px-8 py-12 lg:px-16 lg:py-0 lg:w-1/2 lg:min-h-screen"
      >
        {/* Logo */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-xl shadow-primary/30">
              <MessageSquare className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center shadow-md">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>
          <span className="text-2xl font-display font-bold text-foreground tracking-tight">Connect</span>
        </div>

        {/* Invite badge */}
        {from && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium w-fit"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span><strong>{from}</strong> invited you to join</span>
          </motion.div>
        )}

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl lg:text-5xl font-display font-bold text-foreground leading-tight mb-4"
        >
          Chat with the people<br className="hidden sm:block" /> you care about
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="text-muted-foreground text-lg leading-relaxed mb-10 max-w-md"
        >
          Connect is a simple, beautiful messaging app for real conversations — photos, GIFs, videos, groups and more, all in one place. Free forever.
        </motion.p>

        {/* Feature list */}
        <motion.ul
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          className="space-y-4"
        >
          {features.map(({ icon: Icon, label, desc }) => (
            <li key={label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground">{label}</span>
                <span className="text-sm text-muted-foreground ml-2">{desc}</span>
              </div>
            </li>
          ))}
        </motion.ul>
      </motion.div>

      {/* ── RIGHT PANEL: signup form ── */}
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        className="relative z-10 flex flex-col justify-center items-center px-8 py-12 lg:w-1/2 lg:min-h-screen"
      >
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            {!showLogin ? (
              <motion.div
                key="signup"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-2xl font-display font-bold text-foreground mb-1">
                  Create your account
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Free forever · No credit card required
                </p>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl mb-4 border border-destructive/20 text-center"
                  >
                    {error}
                  </motion.div>
                )}

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        {...form.register("firstName")}
                        type="text"
                        placeholder="First name"
                        autoFocus
                        className="w-full px-4 py-3 bg-secondary/60 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                      />
                      {form.formState.errors.firstName && (
                        <p className="text-destructive text-xs mt-1 ml-1">{form.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    <div>
                      <input
                        {...form.register("lastName")}
                        type="text"
                        placeholder="Last name"
                        className="w-full px-4 py-3 bg-secondary/60 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                      />
                      {form.formState.errors.lastName && (
                        <p className="text-destructive text-xs mt-1 ml-1">{form.formState.errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <input
                      {...form.register("email")}
                      type="email"
                      placeholder="Email address"
                      className="w-full px-4 py-3 bg-secondary/60 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                    />
                    {form.formState.errors.email && (
                      <p className="text-destructive text-xs mt-1 ml-1">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <input
                      {...form.register("password")}
                      type="password"
                      placeholder="Password (min 6 characters)"
                      className="w-full px-4 py-3 bg-secondary/60 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                    />
                    {form.formState.errors.password && (
                      <p className="text-destructive text-xs mt-1 ml-1">{form.formState.errors.password.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSigningUp}
                    className="w-full py-3.5 mt-1 rounded-xl bg-gradient-to-r from-primary to-violet-500 text-white font-semibold shadow-lg shadow-primary/25 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isSigningUp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Join Connect
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    onClick={() => { setError(null); setShowLogin(true); }}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </p>
              </motion.div>
            ) : (
              <LoginInline onBack={() => { setError(null); setShowLogin(false); }} />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function LoginInline({ onBack }: { onBack: () => void }) {
  const { login, isLoggingIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const loginSchema = z.object({
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(1, "Password is required"),
  });

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setError(null);
    try {
      await login({ data: values });
    } catch (err: any) {
      setError(err?.data?.error || "Invalid credentials");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
    >
      <h2 className="text-2xl font-display font-bold text-foreground mb-1">Welcome back</h2>
      <p className="text-muted-foreground text-sm mb-6">Sign in to your Connect account</p>

      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl mb-4 border border-destructive/20 text-center"
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <input
            {...form.register("email")}
            type="email"
            placeholder="Email address"
            autoFocus
            className="w-full px-4 py-3 bg-secondary/60 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
          />
          {form.formState.errors.email && (
            <p className="text-destructive text-xs mt-1 ml-1">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div>
          <input
            {...form.register("password")}
            type="password"
            placeholder="Password"
            className="w-full px-4 py-3 bg-secondary/60 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
          />
          {form.formState.errors.password && (
            <p className="text-destructive text-xs mt-1 ml-1">{form.formState.errors.password.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoggingIn}
          className="w-full py-3.5 mt-1 rounded-xl bg-primary text-white font-semibold shadow-lg shadow-primary/25 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <button onClick={onBack} className="text-primary hover:underline font-medium">
          Create one free
        </button>
      </p>
    </motion.div>
  );
}
