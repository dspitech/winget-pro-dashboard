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

// TTL : ne pas re-scanner si données < 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;

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
      const [inv, upd, net, sys] = await Promise.all([
        fetchInventory().catch(() => null),
        fetchUpdates().catch(() => null),
        fetchNetworkInfo().catch(() => null),
        fetchSystemInfo().catch(() => null),
      ]);
      if (inv && inv.apps) {
        setInventory(inv);
        saveScanData(inv);
      }
      if (upd) setUpdates(upd);
      if (net) setNetwork(net);
      if (sys) setSystem(sys);
      setLastAutoScan(new Date());
    } finally {
      setIsScanning(false);
    }
  }, [isConnected, saveScanData]);

  const refreshInventory = useCallback(async () => {
    if (!isConnected) return;
    setIsScanning(true);
    try {
      const [inv, upd] = await Promise.all([
        fetchInventory().catch(() => null),
        fetchUpdates().catch(() => null),
      ]);
      if (inv && inv.apps) {
        setInventory(inv);
        saveScanData(inv);
      }
      if (upd) setUpdates(upd);
      setLastAutoScan(new Date());
    } finally {
      setIsScanning(false);
    }
  }, [isConnected, saveScanData]);

  // Auto-scan au démarrage dès que la connexion est établie
  useEffect(() => {
    if (!isConnected || hasAutoScannedRef.current) return;

    // Si le cache est récent, on saute le scan
    const now = Date.now();
    const cacheAge = lastScanTime ? now - lastScanTime.getTime() : Infinity;
    const cacheValid = cachedInventory && cacheAge < CACHE_TTL_MS;

    hasAutoScannedRef.current = true;

    if (cacheValid) {
      // Charger malgré tout network + system (non persistés) en arrière-plan
      Promise.all([
        fetchNetworkInfo().catch(() => null),
        fetchSystemInfo().catch(() => null),
      ]).then(([net, sys]) => {
        if (net) setNetwork(net);
        if (sys) setSystem(sys);
      });
    } else {
      performScan();
    }
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
