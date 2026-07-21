import { Slot } from "expo-router";
import { AuthProvider } from "../src/context/AuthContext";
import { LangProvider } from "../src/context/LangContext";

export default function RootLayout() {
  return (
    <LangProvider>
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </LangProvider>
  );
}
