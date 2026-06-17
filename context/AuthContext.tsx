import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { loadToken, deleteToken, saveToken, type AuthUser } from "../lib/auth";
import { apiUrl } from "../lib/api";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadToken()
      .then(async (token) => {
        if (!token) return;
        const res = await fetch(apiUrl("/api/v1/auth/me"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.id) setUser(data as AuthUser);
          else await deleteToken();
        } else {
          await deleteToken();
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (token: string, userData: AuthUser) => {
    await saveToken(token);
    setUser(userData);
  };

  const logout = async () => {
    await deleteToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
