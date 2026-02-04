"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import Image from "next/image";

export default function LoginForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasTriggeredLogin = useRef(false);

  // Prüfen ob ein Fehler vorliegt oder manuell ausgeloggt wurde
  const hasError = searchParams.get("error") !== null;
  const hasLoggedOut = searchParams.get("logout") !== null;

  // Manuellen Login anzeigen wenn Fehler vorliegt oder ausgeloggt wurde
  const showManualLogin = hasError || hasLoggedOut;

  useEffect(() => {
    // Bereits eingeloggt -> zum Dashboard
    if (status === "authenticated" && session) {
      router.push("/dashboard");
      return;
    }

    // Nicht eingeloggt und kein Fehler/Logout -> automatisch Azure Login auslösen
    if (status === "unauthenticated" && !hasTriggeredLogin.current && !hasError && !hasLoggedOut) {
      hasTriggeredLogin.current = true;
      signIn("azure-ad", { callbackUrl: "/dashboard" });
    }
  }, [status, session, router, hasError, hasLoggedOut]);

  const handleMicrosoftLogin = () => {
    signIn("azure-ad", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <Image src="/logo.png" alt="Logo" width={64} height={64} className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">
            <span className="font-montserrat">Outlook ZEP</span>{" "}
            <span className="font-inter font-light">Sync</span>
          </h1>
          <p className="mt-2 text-gray-600">
            Übertrage deine Termine zur Zeiterfassung
          </p>
        </div>

        <div className="space-y-6">
          {showManualLogin ? (
            <>
              {hasError && !hasLoggedOut && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center text-sm text-red-700">
                  Anmeldung fehlgeschlagen. Bitte mit einem @contiva.com Konto anmelden.
                </div>
              )}
              <button
                onClick={handleMicrosoftLogin}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <LogIn size={20} />
                Mit Microsoft anmelden
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 p-3 text-gray-600">
              <Loader2 size={20} className="animate-spin" />
              <span>Weiterleitung zur Anmeldung...</span>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            Nur für contiva.com Konten
          </p>
        </div>
      </div>
    </div>
  );
}
