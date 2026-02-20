import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { checkServerStatus, SystemStatus } from "@/lib/winget-api";

interface ServerContextValue {
  status: SystemStatus | null;
  isConnected: boolean;
  isChecking: boolean;
  recheck: () => void;
}

const ServerContext = createContext<ServerContextValue>({
  status: null,
  isConnected: false,
  isChecking: true,
  recheck: () => {},
});

export function ServerProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const check = async () => {
    setIsChecking(true);
    const s = await checkServerStatus();
    setStatus(s);
    setIsChecking(false);
  };

  useEffect(() => {
    check();
    // Re-vérifier toutes les 30 secondes
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ServerContext.Provider
      value={{ status, isConnected: status?.ok ?? false, isChecking, recheck: check }}
    >
      {children}
    </ServerContext.Provider>
  );
}

export function useServer() {
  return useContext(ServerContext);
}
