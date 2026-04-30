/**
 * Service API — Communication avec le serveur local winget
 * L'app détecte automatiquement le serveur local Winget sur la machine.
 */

export const API_CANDIDATES = [
  "http://127.0.0.1:3001/api",
  "http://localhost:3001/api",
];

const API_BASE_STORAGE_KEY = "winget-api-base";
export let API_BASE = localStorage.getItem(API_BASE_STORAGE_KEY) || API_CANDIDATES[0];

function setApiBase(base: string) {
  API_BASE = base;
  localStorage.setItem(API_BASE_STORAGE_KEY, base);
}

async function fetchJson<T>(path: string, timeoutMs = 30000, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export interface AppEntry {
  name: string;
  id: string;
  version: string;
  available: string | null;
  source: string;
  status: "up-to-date" | "update-available" | "unknown";
  installDate?: string;
}

export interface SystemStatus {
  ok: boolean;
  server?: boolean;
  apiBase?: string;
  powershellVersion?: string;
  wingetAvailable?: boolean;
  wingetVersion?: string;
  platform?: string;
  hostname?: string;
  user?: string;
  isAdmin?: boolean;
  error?: string;
}

export interface InventoryResult {
  apps: AppEntry[];
  total: number;
  upToDate: number;
  updates: number;
  timestamp: string;
}

export interface SearchResult {
  results: Array<{ name: string; id: string; version: string; source: string }>;
  query: string;
  total: number;
}

export interface UpdatesResult {
  updates: AppEntry[];
  total: number;
  timestamp: string;
}

// ─── Vérification du statut du serveur ────────────────────────────────────

export async function checkServerStatus(): Promise<SystemStatus> {
  const candidates = Array.from(new Set([API_BASE, ...API_CANDIDATES]));

  for (const base of candidates) {
    try {
      const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(900) });
      if (!health.ok) throw new Error(`HTTP ${health.status}`);
      setApiBase(base);

      try {
        const status = await fetchJson<SystemStatus>("/status", 2500);
        return { ...status, ok: true, server: true, apiBase: base };
      } catch (statusError) {
        return {
          ok: true,
          server: true,
          apiBase: base,
          error: (statusError as Error).message,
        };
      }
    } catch {
      // Essayer l'adresse suivante.
    }
  }

  return { ok: false, server: false, error: "Serveur local indisponible — lancez npm run local" };
}

// ─── Inventaire ────────────────────────────────────────────────────────────

export async function fetchInventory(): Promise<InventoryResult> {
  return await fetchJson<InventoryResult>("/inventory", 120000);
}

// ─── Recherche ─────────────────────────────────────────────────────────────

export async function searchPackages(query: string): Promise<SearchResult> {
  return await fetchJson<SearchResult>(`/search?q=${encodeURIComponent(query)}`, 30000);
}

// ─── Mises à jour ──────────────────────────────────────────────────────────

export async function fetchUpdates(): Promise<UpdatesResult> {
  try {
    const data = await fetchJson<UpdatesResult>("/updates", 120000);
    // S'assurer que la réponse contient bien un tableau d'updates
    return {
      updates: Array.isArray(data?.updates) ? data.updates : [],
      total: data?.total || 0,
      timestamp: data?.timestamp || new Date().toISOString(),
    };
  } catch (err) {
    console.error("Erreur lors de la récupération des mises à jour:", err);
    // En cas d'erreur réseau ou autre, retourner une liste vide
    return { updates: [], total: 0, timestamp: new Date().toISOString() };
  }
}

// ─── Commandes winget (SSE streaming) ─────────────────────────────────────

export type SSEEventType = "start" | "cmd" | "output" | "success" | "error" | "progress";
export type SSEHandler = (type: SSEEventType, data: string) => void;

function streamSSE(url: string, options: RequestInit, onEvent: SSEHandler): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      if (!res.ok || !res.body) {
        onEvent("error", `Erreur HTTP ${res.status}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const line = part.trim();
          if (line.startsWith("data:")) {
            try {
              const json = JSON.parse(line.slice(5).trim());
              onEvent(json.type as SSEEventType, json.data);
            } catch {}
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        onEvent("error", (err as Error).message || "Erreur de connexion");
      }
    }
  })();

  return () => controller.abort();
}

export function installPackage(id: string, onEvent: SSEHandler): () => void {
  return streamSSE(
    `${API_BASE}/install`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) },
    onEvent
  );
}

export function uninstallPackage(id: string, onEvent: SSEHandler): () => void {
  return streamSSE(
    `${API_BASE}/uninstall`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) },
    onEvent
  );
}

export function upgradePackage(id: string, onEvent: SSEHandler): () => void {
  return streamSSE(
    `${API_BASE}/upgrade`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) },
    onEvent
  );
}

export function upgradeAll(onEvent: SSEHandler): () => void {
  return streamSSE(
    `${API_BASE}/upgrade`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) },
    onEvent
  );
}

// ─── Informations réseau ────────────────────────────────────────────────────

export interface NetworkInfo {
  ok: boolean;
  adapters?: Array<{ name: string; description: string; mac: string; speed: string; status: string }>;
  ip?: string;
  gateway?: string;
  dns?: string[];
  subnetPrefix?: number;
  firewallProfiles?: Array<{ name: string; enabled: boolean }>;
  networkProfile?: string;
  publicIP?: string;
  error?: string;
}

export async function fetchNetworkInfo(): Promise<NetworkInfo> {
  try {
    return await fetchJson<NetworkInfo>("/network", 20000);
  } catch {
    return { ok: false, error: "Impossible de récupérer les infos réseau" };
  }
}

// ─── Informations système ───────────────────────────────────────────────────

export interface SystemInfo {
  ok: boolean;
  os?: { name: string; version: string; build: string; arch: string; installDate: string; lastBoot: string };
  cpu?: { name: string; cores: number; threads: number; maxClock: number; cache: number; usage: number };
  memory?: { totalGB: number; freeGB: number; usedPercent: number; speed: number; slots: number; type: string };
  storage?: { model: string; sizeGB: number; freeGB: number; totalGB: number; freePercent: number; fileSystem: string; mediaType: string };
  machine?: { manufacturer: string; model: string; domain: string; bios: string };
  error?: string;
}

export async function fetchSystemInfo(): Promise<SystemInfo> {
  try {
    return await fetchJson<SystemInfo>("/system", 25000);
  } catch {
    return { ok: false, error: "Impossible de récupérer les infos système" };
  }
}

// ─── Scan SSE ───────────────────────────────────────────────────────────────

export type ScanEventType = "step-start" | "step-done" | "complete" | "error";
export type ScanHandler = (type: ScanEventType, data: unknown) => void;

export function startScan(onEvent: ScanHandler): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/scan`, { signal: controller.signal });
      if (!res.ok || !res.body) {
        onEvent("error", "Erreur de connexion au serveur");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const line = part.trim();
          if (line.startsWith("data:")) {
            try {
              const json = JSON.parse(line.slice(5).trim());
              onEvent(json.type as ScanEventType, json.data);
            } catch {}
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        onEvent("error", (err as Error).message || "Erreur scan");
      }
    }
  })();

  return () => controller.abort();
}
