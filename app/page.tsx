import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-500">Laden...</div>
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
