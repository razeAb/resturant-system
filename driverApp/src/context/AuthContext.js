import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { setAuthToken } from "../api/client";
import { loginDriver, fetchMe } from "../api/driver";

const TOKEN_KEY = "driverToken";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [driver, setDriver] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        setAuthToken(token);
        try {
          setDriver(await fetchMe());
        } catch {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          setAuthToken(null);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (username, password) => {
    const { token, driver: loggedInDriver } = await loginDriver(username, password);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setAuthToken(token);
    setDriver(loggedInDriver);
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setAuthToken(null);
    setDriver(null);
  }, []);

  const refreshDriver = useCallback(async () => {
    const me = await fetchMe();
    setDriver(me);
    return me;
  }, []);

  return (
    <AuthContext.Provider value={{ driver, isLoading, login, logout, refreshDriver, setDriver }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
