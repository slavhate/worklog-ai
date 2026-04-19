import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api } from "../services/api";

interface AuthContextValue {
  token: string | null;
  username: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  username: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("worklog-token");
    const storedUser = localStorage.getItem("worklog-username");
    if (stored && storedUser) {
      setToken(stored);
      setUsername(storedUser);
    }
    setLoading(false);
  }, []);

  function saveAuth(t: string, u: string) {
    localStorage.setItem("worklog-token", t);
    localStorage.setItem("worklog-username", u);
    setToken(t);
    setUsername(u);
  }

  async function login(u: string, p: string) {
    const res = await api.login(u, p);
    saveAuth(res.token, res.username);
  }

  async function register(u: string, p: string) {
    const res = await api.register(u, p);
    saveAuth(res.token, res.username);
  }

  function logout() {
    localStorage.removeItem("worklog-token");
    localStorage.removeItem("worklog-username");
    setToken(null);
    setUsername(null);
  }

  return (
    <AuthContext value={{ token, username, loading, login, register, logout }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
