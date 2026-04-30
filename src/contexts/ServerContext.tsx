import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from "react";
import { checkServerStatus, SystemStatus } from "@/lib/winget-api";

interface ServerContextValue {
  status: SystemStatus | null;
  isConnected: boolean;
  isChecking: boolean;
  recheck: () => void;
  /** Date de la dernière vérification réussie */
  lastCheck: Date | null;
}

const ServerContext = createContext<ServerContextValue>({
  status: null,
  isConnected: false,
  isChecking: true,
  recheck: () => {},
  lastCheck: null,
});

const FAST_POLL_MS = 3000;   // 3s tant qu'on est déconnecté → reconnexion rapide
const SLOW_POLL_MS = 30000;  // 30s une fois connecté

export function ServerProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  const check = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsChecking(true);
    try {
      const s = await checkServerStatus();
      setStatus(s);
      if (s.ok) setLastCheck(new Date());
    } finally {
      inFlightRef.current = false;
      setIsChecking(false);
    }
  }, []);

  // Boucle de polling adaptatif
  useEffect(() => {
    let cancelled = false;

    const loop = async () => {
      if (cancelled) return;
      await check();
      if (cancelled) return;
      const delay = status?.ok ? SLOW_POLL_MS : FAST_POLL_MS;
      timerRef.current = setTimeout(loop, delay);
    };

    // Premier appel immédiat
    loop();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // On relance la boucle si le statut de connexion change pour ajuster le délai
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.ok]);

  const recheck = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    check();
  }, [check]);

  return (
    <ServerContext.Provider
      value={{ status, isConnected: status?.ok ?? false, isChecking, recheck, lastCheck }}
    >
      {children}
    </ServerContext.Provider>
  );
}

export function useServer() {
  return useContext(ServerContext);
}
