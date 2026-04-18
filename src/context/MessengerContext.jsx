import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as api from "../lib/api.js";

const MessengerContext = createContext(null);

export function MessengerProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(api.TOKEN_KEY));
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [directs, setDirects] = useState([]);
  const [booting, setBooting] = useState(() => !!localStorage.getItem(api.TOKEN_KEY));
  const [sessionError, setSessionError] = useState(null);
  const [workspaceError, setWorkspaceError] = useState(null);
  const [bootAttempt, setBootAttempt] = useState(0);

  const loadWorkspace = useCallback(async (t) => {
    const [ch, gr, di, us] = await Promise.all([
      api.getChannels(t),
      api.getGroups(t),
      api.getDirects(t),
      api.getUsers(t),
    ]);
    setChannels(ch);
    setGroups(gr);
    setDirects(di);
    setUsers(us);
  }, []);

  useEffect(() => {
    if (!token) {
      setBooting(false);
      setMe(null);
      setUsers([]);
      setChannels([]);
      setGroups([]);
      setDirects([]);
      setSessionError(null);
      setWorkspaceError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setBooting(true);
      setSessionError(null);
      setWorkspaceError(null);
      try {
        const user = await api.getMe(token);
        if (cancelled) return;
        setMe(user);
        try {
          await loadWorkspace(token);
        } catch (e) {
          if (!cancelled) setWorkspaceError(api.formatApiError(e));
        }
      } catch (e) {
        if (cancelled) return;
        if (e.status === 401) {
          localStorage.removeItem(api.TOKEN_KEY);
          setToken(null);
          setMe(null);
          setUsers([]);
          setChannels([]);
          setGroups([]);
          setDirects([]);
        } else {
          setSessionError(api.formatApiError(e));
          setMe(null);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, loadWorkspace, bootAttempt]);

  const login = useCallback(async (email, password) => {
    const { accessToken } = await api.login(email, password);
    localStorage.setItem(api.TOKEN_KEY, accessToken);
    setBooting(true);
    setToken(accessToken);
  }, []);

  const logout = useCallback(async () => {
    const t = localStorage.getItem(api.TOKEN_KEY);
    try {
      if (t) await api.logout(t);
    } catch {
      /* ignore */
    }
    localStorage.removeItem(api.TOKEN_KEY);
    setToken(null);
    setMe(null);
    setUsers([]);
    setChannels([]);
    setGroups([]);
    setDirects([]);
    setSessionError(null);
    setWorkspaceError(null);
  }, []);

  const retrySession = useCallback(() => {
    setSessionError(null);
    setBootAttempt((n) => n + 1);
  }, []);

  const retryWorkspace = useCallback(async () => {
    const t = localStorage.getItem(api.TOKEN_KEY);
    if (!t) return;
    setWorkspaceError(null);
    try {
      await loadWorkspace(t);
    } catch (e) {
      setWorkspaceError(api.formatApiError(e));
    }
  }, [loadWorkspace]);

  const refreshWorkspace = useCallback(async () => {
    const t = localStorage.getItem(api.TOKEN_KEY);
    if (!t) return;
    try {
      await loadWorkspace(t);
      setWorkspaceError(null);
    } catch (e) {
      setWorkspaceError(api.formatApiError(e));
      throw e;
    }
  }, [loadWorkspace]);

  const refreshMe = useCallback(async () => {
    const t = localStorage.getItem(api.TOKEN_KEY);
    if (!t) return;
    const user = await api.getMe(t);
    setMe(user);
  }, []);

  const value = useMemo(
    () => ({
      token,
      me,
      users,
      channels,
      groups,
      directs,
      booting,
      sessionError,
      workspaceError,
      retrySession,
      retryWorkspace,
      login,
      logout,
      refreshWorkspace,
      refreshMe,
      setMe,
    }),
    [
      token,
      me,
      users,
      channels,
      groups,
      directs,
      booting,
      sessionError,
      workspaceError,
      retrySession,
      retryWorkspace,
      login,
      logout,
      refreshWorkspace,
      refreshMe,
    ],
  );

  return (
    <MessengerContext.Provider value={value}>{children}</MessengerContext.Provider>
  );
}

export function useMessenger() {
  const ctx = useContext(MessengerContext);
  if (!ctx) {
    throw new Error("useMessenger must be used within MessengerProvider");
  }
  return ctx;
}
