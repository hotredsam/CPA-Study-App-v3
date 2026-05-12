import { Suspense } from "react";
import { DEFAULT_ALLOWED_EMAIL, isGoogleAuthConfigured } from "@/lib/auth/google";
import { LoginClient } from "./LoginClient";

export const metadata = { title: "Sign in - CPA Study Servant" };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient configured={isGoogleAuthConfigured()} allowedEmail={DEFAULT_ALLOWED_EMAIL} />
    </Suspense>
  );
}
