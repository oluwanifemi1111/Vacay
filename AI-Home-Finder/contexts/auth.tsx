import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

interface User {
  id: string;
  email: string;
  username: string;
  role: "user" | "landlord";
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerInit: (email: string, username: string, phone: string, password: string, role: "user" | "landlord") => Promise<void>;
  register: (email: string, username: string, phone: string, password: string, otp: string, role: "user" | "landlord") => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "vacay_auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(TOKEN_KEY);
        if (stored) {
          const baseUrl = getApiUrl();
          const res = await fetch(`${baseUrl}api/auth/me`, {
            headers: { Authorization: `Bearer ${stored}` },
          });
          if (res.ok) {
            const u = await res.json();
            setUser(u);
            setToken(stored);
          } else {
            await AsyncStorage.removeItem(TOKEN_KEY);
          }
        }
      } catch (_) {}
      setIsLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Login failed");
    }
    const { token: t, user: u } = await res.json();
    await AsyncStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
  };

  const registerInit = async (email: string, username: string, phone: string, password: string, role: "user" | "landlord") => {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}api/auth/register-init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, phone, password, role }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to send verification code");
    }
  };

  const register = async (email: string, username: string, phone: string, password: string, otp: string, role: "user" | "landlord") => {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, phone, password, otp, role }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Verification failed");
    }
    const { token: t, user: u } = await res.json();
    await AsyncStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
  };

  const logout = async () => {
    if (token) {
      const baseUrl = getApiUrl();
      await fetch(`${baseUrl}api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, token, isLoading, login, registerInit, register, logout }),
    [user, token, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
