import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);
const TOKEN_KEY = "bloom_auth_token";

async function authFetch(url, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    authFetch("/api/auth/me")
      .then((payload) => setUser(payload.user))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signup = async (details) => {
    const payload = await authFetch("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(details),
    });

    localStorage.setItem(TOKEN_KEY, payload.token);
    setUser(payload.user);
    return payload.user;
  };

  const login = async (details) => {
    const payload = await authFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(details),
    });

    localStorage.setItem(TOKEN_KEY, payload.token);
    setUser(payload.user);
    return payload.user;
  };

  const logout = async () => {
    try {
      await authFetch("/api/auth/logout", { method: "POST" });
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({ user, loading, signup, login, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

export { TOKEN_KEY };
