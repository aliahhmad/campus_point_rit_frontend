import { useEffect, useState } from "react";
import { api } from "./api";

export function useResource(path) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    api(path)
      .then((data) => {
        if (active) setState({ data, loading: false, error: "" });
      })
      .catch((error) => {
        if (active)
          setState({ data: null, loading: false, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  function reload() {
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    setVersion((value) => value + 1);
  }
  return { ...state, reload };
}

export function validatePassword(password, confirmation) {
  if (password.length < 8)
    throw new Error("Use a password with at least 8 characters.");
  if (new TextEncoder().encode(password).length > 72)
    throw new Error(
      "Your password must be no more than 72 bytes. Try fewer characters.",
    );
  if (confirmation !== undefined && password !== confirmation)
    throw new Error("The passwords don’t match.");
}

export function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Never";
}
