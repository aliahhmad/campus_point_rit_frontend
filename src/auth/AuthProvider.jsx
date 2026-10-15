import { useEffect, useState } from "react";
import { api, getSession, loadAccount, saveSession } from "../lib/api";
import { AuthContext } from "./context";

let restoring;
function restoreAccount() {
  if (!restoring)
    restoring = loadAccount().finally(() => {
      restoring = null;
    });
  return restoring;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getSession()?.token));
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (getSession()?.token) {
      restoreAccount()
        .then((account) => {
          if (active) setUser(account);
        })
        .catch((err) => {
          if (!active) return;
          if (err.status === 401) saveSession(null);
          else setError(err.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    const expired = () => {
      setUser(null);
      setError("");
      setLoading(false);
    };
    window.addEventListener("campuspoint:session-expired", expired);
    return () => {
      active = false;
      window.removeEventListener("campuspoint:session-expired", expired);
    };
  }, []);

  async function login(credentials) {
    const tokens = await api("/login/", {
      method: "POST",
      body: credentials,
      auth: false,
    });
    saveSession(tokens);
    try {
      const account = await loadAccount();
      setUser(account);
      setError("");
      return account;
    } catch (err) {
      saveSession(null);
      throw err;
    }
  }

  function logout() {
    saveSession(null);
    setUser(null);
    setError("");
  }
  async function reloadUser() {
    const account = await loadAccount();
    setUser(account);
  }
  async function retry() {
    setLoading(true);
    setError("");
    try {
      setUser(await loadAccount());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, logout, reloadUser, retry }}
    >
      {children}
    </AuthContext.Provider>
  );
}
