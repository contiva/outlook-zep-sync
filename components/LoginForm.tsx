"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Calendar, Clock, Sparkles } from "lucide-react";
import Image from "next/image";

export default function LoginForm() {
  const { data: session } = useSession();
  const router = useRouter();

  // Automatisch zum Dashboard weiterleiten wenn eingeloggt
  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const handleMicrosoftLogin = () => {
    signIn("azure-ad", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-3xl" />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4e4e708_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e708_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      <div className="relative w-full max-w-md mx-4">
        {/* Main card */}
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl shadow-lg border border-border/50 overflow-hidden">
          {/* Header with gradient accent */}
          <div className="relative bg-gradient-to-br from-primary to-violet-600 px-8 py-12 text-center overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-[-50%] right-[-20%] w-48 h-48 rounded-full bg-white/10" />
            <div className="absolute bottom-[-30%] left-[-10%] w-32 h-32 rounded-full bg-white/10" />
            
            <div className="relative">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl mb-5 shadow-lg">
                <Image src="/logo.png" alt="Logo" width={40} height={40} className="h-10 w-auto" />
              </div>
              <h1 className="text-2xl font-semibold text-white tracking-tight">
                <span className="font-montserrat">Outlook ZEP</span>{" "}
                <span className="font-light opacity-90">Sync</span>
              </h1>
              <p className="mt-3 text-white/70 text-sm font-light">
                Termine automatisch zur Zeiterfassung übertragen
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Features */}
            <div className="flex items-center justify-center gap-8">
              <div className="flex items-center gap-2.5 text-sm text-muted">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar size={16} className="text-primary" />
                </div>
                <span>Outlook</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2.5 text-sm text-muted">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock size={16} className="text-primary" />
                </div>
                <span>ZEP</span>
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
            </div>

            {/* Login action */}
            {session ? (
              <div className="flex items-center gap-3 p-4 bg-success/5 border border-success/20 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Angemeldet</p>
                  <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleMicrosoftLogin}
                className="group w-full flex items-center justify-center gap-3 py-4 px-5 bg-foreground text-white rounded-xl hover:bg-foreground/90 shadow-sm hover:shadow-md font-medium transition-all duration-200"
              >
                <svg viewBox="0 0 21 21" className="w-5 h-5" fill="currentColor">
                  <rect x="1" y="1" width="9" height="9" />
                  <rect x="11" y="1" width="9" height="9" />
                  <rect x="1" y="11" width="9" height="9" />
                  <rect x="11" y="11" width="9" height="9" />
                </svg>
                Mit Microsoft anmelden
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          ZEP-Verbindung ist bereits konfiguriert
        </p>
      </div>
    </div>
  );
}
