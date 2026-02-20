import { useState, useEffect, useCallback } from "react";
import { InventoryResult, AppEntry } from "@/lib/winget-api";

const STORAGE_KEY = "winget-scan-data";
const STORAGE_TIMESTAMP_KEY = "winget-scan-timestamp";

interface StoredScanData {
  inventory: InventoryResult;
  timestamp: string;
}

export function useScanData() {
  const [inventory, setInventory] = useState<InventoryResult | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  // Charger les données depuis localStorage au démarrage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
      if (stored) {
        const data: StoredScanData = JSON.parse(stored);
        setInventory(data.inventory);
        if (timestamp) {
          setLastScanTime(new Date(timestamp));
        }
      }
    } catch (err) {
      console.error("Erreur lors du chargement des données du scan:", err);
    }
  }, []);

  // Sauvegarder les données du scan
  const saveScanData = useCallback((data: InventoryResult) => {
    try {
      const scanData: StoredScanData = {
        inventory: data,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scanData));
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, new Date().toISOString());
      setInventory(data);
      setLastScanTime(new Date());
    } catch (err) {
      console.error("Erreur lors de la sauvegarde des données du scan:", err);
    }
  }, []);

  // Effacer les données du scan
  const clearScanData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
      setInventory(null);
      setLastScanTime(null);
    } catch (err) {
      console.error("Erreur lors de la suppression des données du scan:", err);
    }
  }, []);

  return {
    inventory,
    lastScanTime,
    saveScanData,
    clearScanData,
  };
}
