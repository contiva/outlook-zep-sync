"use client";

import { signIn, useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Key } from "lucide-react";

export default function LoginForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const [zepToken, setZepToken] = useState("");

  const handleMicrosoftLogin = () => {
    signIn("azure-ad");
  };

  const handleConnect = () => {
    if (session && zepToken) {
      // ZEP Token im localStorage speichern
      localStorage.setItem("zepToken", zepToken);
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Outlook → ZEP
          </h1>
          <p className="mt-2 text-gray-600">
            Übertrage deine Termine zur Zeiterfassung
          </p>
        </div>

        <div className="space-y-6">
          {/* Microsoft Login */}
          <div>
            <h2 className="text-sm font-medium text-gray-700 mb-2">
              1. Microsoft-Konto
            </h2>
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

          {/* ZEP Token */}
          <div>
            <h2 className="text-sm font-medium text-gray-700 mb-2">
              2. ZEP API Token
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  API Token (aus ZEP → Einstellungen → API)
                </label>
                <div className="relative">
                  <Key
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="password"
                    value={zepToken}
                    onChange={(e) => setZepToken(e.target.value)}
                    placeholder="Dein ZEP API Token"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                ZEP URL ist vorkonfiguriert für Contiva.
              </p>
            </div>
          </div>

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={!session || !zepToken}
            className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Verbinden
          </button>
        </div>
      </div>
    </div>
  );
}
