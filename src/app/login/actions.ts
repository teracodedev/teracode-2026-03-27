"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

function safeCallbackUrl(raw: FormDataEntryValue | null): string {
  if (!raw || typeof raw !== "string") return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function redirectToLoginWithError(
  code: "credentials" | "invalid",
  callbackUrl: string
): never {
  const q = new URLSearchParams();
  q.set("error", code);
  q.set("callbackUrl", callbackUrl);
  redirect(`/login?${q.toString()}`);
}

export async function loginAction(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));

  if (typeof email !== "string" || typeof password !== "string") {
    redirectToLoginWithError("invalid", callbackUrl);
  }

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: callbackUrl,
    });

    console.log("[login] signIn result:", result);

    if (typeof result === "string") {
      let hasError = result.includes("error=");
      if (!hasError) {
        try {
          hasError = new URL(result, "http://n.local").searchParams.has("error");
        } catch {
          /* ignore */
        }
      }
      if (hasError) {
        console.log("[login] signIn returned error URL:", result);
        redirectToLoginWithError("credentials", callbackUrl);
      }
    }
  } catch (error) {
    if (error instanceof AuthError) {
      console.error("[login] AuthError type:", (error as AuthError).type, "message:", error.message);
      redirectToLoginWithError("credentials", callbackUrl);
    }
    console.log("[login] non-AuthError (likely redirect):", (error as Error)?.message);
    throw error;
  }

  redirect(callbackUrl);
}
