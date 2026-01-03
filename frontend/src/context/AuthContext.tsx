import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../lib/api";

type User = {
  _id?: string;
  name?: string;
  phone?: string;
  role?: string;
  gender?: string;
  verified?: boolean;
  approved?: boolean;
  dnd?: boolean;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  token: string | null;
  setToken: (t: string | null) => void;
  refreshMe: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  function setToken(t: string | null) {
    if (t) localStorage.setItem("token", t);
    else localStorage.removeItem("token");
    setTokenState(t);
  }

  async function refreshMe() {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get("/api/auth/me");
      setUser(res.data?.user || null);
    } catch (e) {
      console.error(e);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
  }

  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value = useMemo(
    () => ({ user, loading, token, setToken, refreshMe, logout }),
    [user, loading, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
