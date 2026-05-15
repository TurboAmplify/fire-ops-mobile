/**
 * Platform-aware Sign in with Apple.
 *
 * On iOS (Capacitor native build) we MUST use the OS-native Sign in with Apple
 * sheet. The web OAuth broker flow leaves the user on a blank screen because
 * Apple cannot redirect back into the WKWebView (`capacitor://localhost` is
 * not a registered universal link / scheme handler).
 *
 * On Android and the web we keep the existing Lovable Cloud OAuth broker flow.
 */
import { Capacitor } from "@capacitor/core";
import { SignInWithApple, SignInWithAppleResponse } from "@capacitor-community/apple-sign-in";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

function randomNonce(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signInWithApple(): Promise<void> {
  const platform = Capacitor.getPlatform();

  if (platform === "ios") {
    // Native flow — opens the system Apple ID sheet.
    const nonce = randomNonce();
    const res: SignInWithAppleResponse = await SignInWithApple.authorize({
      clientId: "com.fireopshq.app",
      // redirectURI is required by the plugin's typings but unused for the
      // native flow on iOS; Apple ignores it when running through ASAuthorization.
      redirectURI: "https://app.fireopshq.com/",
      scopes: "email name",
      state: randomNonce(16),
      nonce,
    });

    const idToken = res.response?.identityToken;
    if (!idToken) {
      throw new Error("Apple did not return an identity token.");
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: idToken,
      nonce,
    });
    if (error) throw error;
    return;
  }

  // Android + web: keep the existing Lovable Cloud OAuth broker.
  const result = await lovable.auth.signInWithOAuth("apple", {
    redirect_uri: window.location.origin,
  });
  if (result.error) {
    throw result.error instanceof Error ? result.error : new Error(String(result.error));
  }
  // If result.redirected, the browser is taking over — nothing else to do.
}
