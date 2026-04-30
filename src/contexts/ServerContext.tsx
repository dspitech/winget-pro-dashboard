import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from "react";
import { checkServerStatus, SystemStatus } from "@/lib/winget-api";

interface ServerContextValue {
  status: SystemStatus | null;
  isConnected: boolean;
  isChecking: boolean;
  connectionError: string | null;
  recheck: () => void;
  /** Date de la dernière vérification réussie */
  lastCheck: Date | null;
}

const ServerContext = createContext<ServerContextValue>({
  status: null,
  isConnected: false,
  isChecking: true,
  connectionError: null,
  recheck: () => {},
  lastCheck: null,
});

const STARTUP_POLL_MS = 900;  // détection quasi immédiate quand le serveur démarre après l'UI
const FAST_POLL_MS = 2000;   // 2s tant qu'on est déconnecté → reconnexion rapide
const SLOW_POLL_MS = 30000;  // 30s une fois connecté
const STARTUP_FAST_CHECKS = 12;

export function ServerProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const statusRef = useRef<SystemStatus | null>(null);
  const attemptsRef = useRef(0);

  const check = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsChecking(true);
    try {
      const s = await checkServerStatus();
      statusRef.current = s;
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
      attemptsRef.current += 1;
      const connected = statusRef.current?.ok ?? false;
      const delay = connected ? SLOW_POLL_MS : attemptsRef.current <= STARTUP_FAST_CHECKS ? STARTUP_POLL_MS : FAST_POLL_MS;
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
    attemptsRef.current = 0;
    check();
  }, [check]);

  return (
    <ServerContext.Provider
      value={{ status, isConnected: status?.ok ?? false, isChecking, connectionError: status?.error ?? null, recheck, lastCheck }}
    >
      {children}
    </ServerContext.Provider>
  );
}

export function useServer() {
  return useContext(ServerContext);
}
