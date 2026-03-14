import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { MessageSquare, Sparkles, ArrowRight, Users } from "lucide-react";

export default function InvitePage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const from = params.get("from");

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/20 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-violet-500/15 blur-[100px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[80px] animate-[pulse_12s_ease-in-out_infinite_4s]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg w-full"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, type: "spring" }}
          className="mb-8 relative"
        >
          <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-2xl shadow-primary/40">
            <MessageSquare className="w-12 h-12 text-white" strokeWidth={1.5} />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </motion.div>

        {/* Invite callout */}
        {from && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-6 flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span><strong>{from}</strong> invited you to join</span>
          </motion.div>
        )}

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-5xl font-display font-bold tracking-tight text-foreground mb-4"
        >
          Connect
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          className="text-lg text-muted-foreground mb-10 max-w-sm leading-relaxed"
        >
          A simple, beautiful place to chat with the people you care about. Photos, GIFs, videos — all in one place.
        </motion.p>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {["💬 Real-time chat", "📷 Photos & GIFs", "🎬 Videos", "🔔 Notifications"].map((f) => (
            <span
              key={f}
              className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm border border-border"
            >
              {f}
            </span>
          ))}
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52 }}
          className="flex flex-col sm:flex-row gap-3 w-full max-w-sm"
        >
          <button
            onClick={() => navigate("/login?signup=1")}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-violet-500 text-white font-semibold text-base shadow-lg shadow-primary/30 hover:opacity-90 active:scale-95 transition-all"
          >
            Create free account
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate("/login")}
            className="flex-1 px-6 py-3.5 rounded-2xl border border-border bg-card text-foreground font-semibold text-base hover:bg-secondary active:scale-95 transition-all"
          >
            Sign in
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="mt-8 text-xs text-muted-foreground"
        >
          Free forever · No credit card required
        </motion.p>
      </motion.div>
    </div>
  );
}
