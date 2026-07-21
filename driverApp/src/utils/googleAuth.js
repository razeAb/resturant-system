import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
};

// A "Web application" OAuth client from Google Cloud Console (the same kind Firebase
// auto-provisions when you enable Google sign-in) - reused here directly rather than
// going through the Firebase JS SDK, which doesn't run in React Native the same way.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export function isGoogleSignInConfigured() {
  return Boolean(GOOGLE_WEB_CLIENT_ID);
}

// Not configured yet -> a harmless placeholder clientId so the hook itself never throws;
// the sign-in button stays hidden via isGoogleSignInConfigured() until a real one is set.
export function useGoogleAuthRequest() {
  return AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_WEB_CLIENT_ID || "not-configured",
      scopes: ["openid", "profile", "email"],
      redirectUri: AuthSession.makeRedirectUri(),
      responseType: "id_token",
      // PKCE (code_challenge_method) only applies to the Authorization Code flow, not the
      // implicit id_token flow used here - Google rejects the request if it's present.
      usePKCE: false,
      extraParams: { nonce: String(Date.now()) },
    },
    discovery
  );
}
