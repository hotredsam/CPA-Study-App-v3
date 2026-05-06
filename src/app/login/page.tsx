import { Suspense } from "react";
import { isAuthConfigured } from "@/lib/auth/session";
import { LoginClient } from "./LoginClient";

export const metadata = { title: "Sign in - CPA Study Servant" };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient configured={isAuthConfigured()} />
    </Suspense>
  );
}
