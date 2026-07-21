import { useEffect, useState } from "react";
import { View, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { useLang } from "../src/context/LangContext";
import { useGoogleAuthRequest, isGoogleSignInConfigured } from "../src/utils/googleAuth";
import Text from "../src/components/RTLText";

export default function LoginScreen() {
  const { role, isLoading, login, loginWithGoogle } = useAuth();
  const { t, isRTL } = useLang();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [request, response, promptAsync] = useGoogleAuthRequest();

  // All hooks above this line must run on every render regardless of role/isLoading -
  // the early returns below can't come before any hook call (Rules of Hooks).
  useEffect(() => {
    if (response?.type !== "success" || !response.params?.id_token) return;
    (async () => {
      setError("");
      setSubmitting(true);
      try {
        await loginWithGoogle(response.params.id_token);
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || t("login.loginFailed", "ההתחברות נכשלה"));
      } finally {
        setSubmitting(false);
      }
    })();
  }, [response, loginWithGoogle, t]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (role === "admin") {
    return <Redirect href="/admin" />;
  }
  if (role === "driver") {
    return <Redirect href="/home" />;
  }

  const handleLogin = async () => {
    setError("");
    if (!username || !password) {
      setError(t("login.enterCredentials", "הזן שם משתמש וסיסמה"));
      return;
    }
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err?.response?.data?.message || t("login.loginFailed", "ההתחברות נכשלה"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("login.title", "כניסת שליח")}</Text>
      <TextInput
        style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
        placeholder={t("login.username", "שם משתמש")}
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
        placeholder={t("login.password", "סיסמה")}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={handleLogin} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("login.logIn", "התחבר")}</Text>}
      </Pressable>

      {isGoogleSignInConfigured() ? (
        <Pressable style={styles.googleButton} onPress={() => promptAsync()} disabled={!request || submitting}>
          <Text style={styles.googleButtonText}>{t("login.googleAdmin", "כניסת מנהל עם Google")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 24, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  button: { backgroundColor: "#111", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#c00", marginBottom: 12, textAlign: "center" },
  googleButton: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 12 },
  googleButtonText: { color: "#333", fontSize: 15, fontWeight: "600" },
});
