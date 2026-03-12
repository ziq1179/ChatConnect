import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-zinc-950">
      {/* Background Image - Absolute fill */}
      <img
        src={`${import.meta.env.BASE_URL}images/login-bg.png`}
        alt="Abstract background"
        className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen"
      />
      
      {/* Overlay gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent dark:from-zinc-950 dark:via-zinc-950/80"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md p-8 md:p-12 glass-panel rounded-[2.5rem] shadow-2xl flex flex-col items-center text-center mx-4"
      >
        <div className="h-20 w-20 bg-primary rounded-3xl shadow-lg shadow-primary/30 flex items-center justify-center mb-8 rotate-3 hover:rotate-0 transition-transform duration-500">
          <MessageSquare className="h-10 w-10 text-primary-foreground" />
        </div>
        
        <h1 className="text-4xl font-extrabold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
          Connect Instantly
        </h1>
        <p className="text-muted-foreground mb-10 text-lg">
          Experience seamless, beautiful messaging with your team.
        </p>

        <Button 
          onClick={login} 
          size="lg" 
          className="w-full rounded-2xl h-14 text-lg font-bold shadow-xl shadow-primary/25 group"
        >
          Sign in to continue
          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </motion.div>
    </div>
  );
}
