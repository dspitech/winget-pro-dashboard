import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import {
  fetchInventory,
  fetchUpdates,
  fetchNetworkInfo,
  fetchSystemInfo,
  InventoryResult,
  UpdatesResult,
  NetworkInfo,
  SystemInfo,
} from "@/lib/winget-api";
import { useServer } from "./ServerContext";
import { useScanData } from "@/hooks/use-scan-data";

interface AutoScanContextValue {
  inventory: InventoryResult | null;
  updates: UpdatesResult | null;
  network: NetworkInfo | null;
  system: SystemInfo | null;
  isScanning: boolean;
  lastAutoScan: Date | null;
  /** Force un rescan complet (utilisé après install/uninstall/upgrade) */
  rescan: () => Promise<void>;
  /** Rescan ciblé inventaire + updates uniquement */
  refreshInventory: () => Promise<void>;
}

const AutoScanContext = createContext<AutoScanContextValue>({
  inventory: null,
  updates: null,
  network: null,
  system: null,
  isScanning: false,
  lastAutoScan: null,
  rescan: async () => {},
  refreshInventory: async () => {},
});

export function AutoScanProvider({ children }: { children: ReactNode }) {
  const { isConnected } = useServer();
  const { inventory: cachedInventory, lastScanTime, saveScanData } = useScanData();

  const [inventory, setInventory] = useState<InventoryResult | null>(cachedInventory);
  const [updates, setUpdates] = useState<UpdatesResult | null>(null);
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastAutoScan, setLastAutoScan] = useState<Date | null>(lastScanTime);
  const hasAutoScannedRef = useRef(false);

  // Synchroniser avec le cache localStorage
  useEffect(() => {
    if (cachedInventory && !inventory) {
      setInventory(cachedInventory);
      setLastAutoScan(lastScanTime);
    }
  }, [cachedInventory, lastScanTime, inventory]);

  const performScan = useCallback(async () => {
    if (!isConnected) return;
    setIsScanning(true);
    try {
      const tasks = [
        fetchInventory().then((inv) => {
          if (inv?.apps) {
            setInventory(inv);
            saveScanData(inv);
          }
        }),
        fetchUpdates().then((upd) => setUpdates(upd)),
        fetchNetworkInfo().then((net) => setNetwork(net)),
        fetchSystemInfo().then((sys) => setSystem(sys)),
      ];
      await Promise.allSettled(tasks);
      setLastAutoScan(new Date());
    } finally {
      setIsScanning(false);
    }
  }, [isConnected, saveScanData]);

  const refreshInventory = useCallback(async () => {
    if (!isConnected) return;
    setIsScanning(true);
    try {
      const tasks = [
        fetchInventory().then((inv) => {
          if (inv?.apps) {
            setInventory(inv);
            saveScanData(inv);
          }
        }),
        fetchUpdates().then((upd) => setUpdates(upd)),
      ];
      await Promise.allSettled(tasks);
      setLastAutoScan(new Date());
    } finally {
      setIsScanning(false);
    }
  }, [isConnected, saveScanData]);

  // Auto-scan au démarrage dès que la connexion est établie
  useEffect(() => {
    if (!isConnected || hasAutoScannedRef.current) return;

    hasAutoScannedRef.current = true;
    performScan();
  }, [isConnected, cachedInventory, lastScanTime, performScan]);

  // Si on perd la connexion, autoriser un nouveau auto-scan à la reconnexion
  useEffect(() => {
    if (!isConnected) hasAutoScannedRef.current = false;
  }, [isConnected]);

  return (
    <AutoScanContext.Provider
      value={{
        inventory,
        updates,
        network,
        system,
        isScanning,
        lastAutoScan,
        rescan: performScan,
        refreshInventory,
      }}
    >
      {children}
    </AutoScanContext.Provider>
  );
}

export function useAutoScan() {
  return useContext(AutoScanContext);
}
