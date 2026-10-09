import * as React from "react";
import { api } from "@/lib/api";

export type User = { id: number; name: string; email: string; role: string; createdAt: string };

type AuthValue = {
  user: User | null;
  loading: boolean;
  /** false = ninguém cadastrado ainda → primeiro acesso cria o administrador */
  hasUsers: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
};

const AuthContext = React.createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [hasUsers, setHasUsers] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      api<{ hasUsers: boolean }>("/auth/status").then((d) => setHasUsers(d.hasUsers)).catch(() => {}),
      api<{ user: User }>("/auth/me")
        .then((d) => setUser(d.user))
        .catch(() => setUser(null)),
    ]).finally(() => setLoading(false));
    const onUnauthorized = () => setUser(null);
    window.addEventListener("rv:unauthorized", onUnauthorized);
    return () => window.removeEventListener("rv:unauthorized", onUnauthorized);
  }, []);

  const value = React.useMemo<AuthValue>(
    () => ({
      user,
      loading,
      hasUsers,
      setUser,
      async login(email, password) {
        const d = await api<{ user: User }>("/auth/login", { body: { email, password } });
        setUser(d.user);
      },
      async register(name, email, password) {
        const d = await api<{ user: User }>("/auth/register", { body: { name, email, password } });
        setHasUsers(true);
        setUser(d.user);
      },
      async logout() {
        await api("/auth/logout", { method: "POST" }).catch(() => {});
        setUser(null);
      },
    }),
    [user, loading, hasUsers],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider />");
  return ctx;
}
