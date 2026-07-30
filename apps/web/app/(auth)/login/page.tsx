import { Suspense } from "react";
import LoginForm from "./login-form";

/**
 * useSearchParams() (used inside LoginForm to read ?redirectTo=) requires a
 * Suspense boundary in Next.js 15 — without this, `next build` fails outright
 * ("should be wrapped in a suspense boundary"). Caught by actually running
 * `next build`, not just `tsc --noEmit` — see CHANGELOG.md Phase 2 audit.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
