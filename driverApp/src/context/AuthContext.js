import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getToken, setToken, deleteToken } from "../utils/tokenStorage";
import { setAuthToken } from "../api/client";
import { loginDriver, fetchMe, registerPushToken } from "../api/driver";
import { loginAdmin, loginWithGoogleIdToken } from "../api/admin";
import { connectSocket, disconnectSocket } from "../utils/socket";
import { registerForPushNotificationsAsync } from "../utils/pushNotifications";

// Best-effort: a driver who denies permission or is on a simulator should
// still be able to use the app, just without background push alerts.
function registerPushTokenInBackground() {
  registerForPushNotificationsAsync()
    .then((token) => token && registerPushToken(token))
    .catch(() => {});
}

const TOKEN_KEY = "driverToken";
const ROLE_KEY = "authRole";
const ADMIN_USER_KEY = "adminUser";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [driver, setDriver] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [role, setRole] = useState(null); // "driver" | "admin" | null
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken(TOKEN_KEY);
      const storedRole = await getToken(ROLE_KEY);

      if (token && storedRole === "admin") {
        setAuthToken(token);
        try {
          const storedUser = await getToken(ADMIN_USER_KEY);
          if (!storedUser) throw new Error("No stored admin user");
          setAdminUser(JSON.parse(storedUser));
          setRole("admin");
        } catch {
          await deleteToken(TOKEN_KEY);
          await deleteToken(ROLE_KEY);
          await deleteToken(ADMIN_USER_KEY);
          setAuthToken(null);
        }
      } else if (token) {
        setAuthToken(token);
        try {
          setDriver(await fetchMe());
          setRole("driver");
          registerPushTokenInBackground();
        } catch {
          await deleteToken(TOKEN_KEY);
          setAuthToken(null);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const applyAdminSession = useCallback(async (token, user) => {
    if (!user?.isPlatformAdmin) {
      throw new Error("This account doesn't have Admin Mode access.");
    }
    await setToken(TOKEN_KEY, token);
    await setToken(ROLE_KEY, "admin");
    await setToken(ADMIN_USER_KEY, JSON.stringify(user));
    setAuthToken(token);
    setAdminUser(user);
    setRole("admin");
  }, []);

  // Drivers log in with a username, admins with an email - one form tries the driver
  // login first (existing behavior) and falls back to the admin login on failure, so
  // the same screen serves both without a manual mode switch.
  const login = useCallback(
    async (identifier, password) => {
      try {
        const { token, driver: loggedInDriver } = await loginDriver(identifier, password);
        await setToken(TOKEN_KEY, token);
        await setToken(ROLE_KEY, "driver");
        setAuthToken(token);
        setDriver(loggedInDriver);
        setRole("driver");
        registerPushTokenInBackground();
        return;
      } catch {
        // Not a driver account (or wrong password) - try admin login below.
      }

      const { token, user } = await loginAdmin(identifier, password);
      await applyAdminSession(token, user);
    },
    [applyAdminSession]
  );

  // Admin Mode only - drivers don't have an email on file, so Google sign-in isn't
  // applicable to them.
  const loginWithGoogle = useCallback(
    async (idToken) => {
      const { token, user } = await loginWithGoogleIdToken(idToken);
      await applyAdminSession(token, user);
    },
    [applyAdminSession]
  );

  const logout = useCallback(async () => {
    await deleteToken(TOKEN_KEY);
    await deleteToken(ROLE_KEY);
    await deleteToken(ADMIN_USER_KEY);
    setAuthToken(null);
    setDriver(null);
    setAdminUser(null);
    setRole(null);
  }, []);

  const refreshDriver = useCallback(async () => {
    const me = await fetchMe();
    setDriver(me);
    return me;
  }, []);

  useEffect(() => {
    if (role === "driver") connectSocket();
    else disconnectSocket();
  }, [role]);

  return (
    <AuthContext.Provider value={{ driver, adminUser, role, isLoading, login, loginWithGoogle, logout, refreshDriver, setDriver }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
