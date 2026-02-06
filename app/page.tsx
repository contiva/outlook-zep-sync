import { Suspense } from "react";
import Image from "next/image";
import LoginForm from "@/components/LoginForm";

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <Image src="/logo.png" alt="Logo" width={64} height={64} className="h-16 w-auto mx-auto mb-4" priority />
          <h1 className="text-3xl font-bold text-gray-900">
            <span className="font-montserrat">Outlook ZEP</span>{" "}
            <span className="font-inter font-light">Sync</span>
          </h1>
          <p className="mt-2 text-gray-600">
            Übertrage deine Termine zur Zeiterfassung
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 p-3 text-gray-500">
          <div className="h-5 w-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          <span>Wird geladen...</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
