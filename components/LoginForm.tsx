"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
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
          {/* Microsoft Login */}
          <div>
            {session ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-green-600">✓</span>
                <span className="text-green-800">
                  Angemeldet als {session.user?.email}
                </span>
              </div>
            ) : (
              <button
                onClick={handleMicrosoftLogin}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <LogIn size={20} />
                Mit Microsoft anmelden
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center">
            ZEP-Verbindung ist bereits konfiguriert.
          </p>
        </div>
      </div>
    </div>
  );
}
