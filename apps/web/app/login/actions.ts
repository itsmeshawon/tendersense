"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SendMagicLinkState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

export type PasswordSignInState =
  | { status: "idle" }
  | { status: "error"; message: string };

export async function sendMagicLink(
  _prev: SendMagicLinkState,
  formData: FormData,
): Promise<SendMagicLinkState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return { status: "error", message: "Enter your email." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "That doesn't look like a valid email." };
  }

  const supabase = await createServerSupabaseClient();
  const hdrs = await headers();
  const origin =
    hdrs.get("origin") ??
    (hdrs.get("host") ? `https://${hdrs.get("host")}` : "http://localhost:3000");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }
  return { status: "sent", email };
}

/**
 * Password sign-in — alternative to magic-link. Accounts are pre-created
 * by an admin via the Supabase dashboard (which sets credentials directly
 * without going through email verification). Any email used here must be
 * on `allowed_signup_emails`.
 *
 * Redirects to /dashboard on success. On failure, returns state the
 * client renders as an error message.
 */
export async function signInWithPassword(
  _prev: PasswordSignInState,
  formData: FormData,
): Promise<PasswordSignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const secret = String(formData.get("password") ?? "");

  if (!email) return { status: "error", message: "Enter your email." };
  if (!secret) return { status: "error", message: "Enter your password." };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: secret,
  });

  if (error) {
    // Supabase returns "Invalid login credentials" for both wrong secret
    // and unknown user — a security feature, don't try to distinguish.
    return { status: "error", message: "Email or password is incorrect." };
  }
  redirect("/dashboard");
}
