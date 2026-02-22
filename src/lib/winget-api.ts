/**
 * Service API — Communication avec le serveur local winget
 * L'app tente de se connecter à http://localhost:3001
 * En cas d'échec, elle bascule automatiquement en mode démo (données mock)
 */

export const API_BASE = "http://localhost:3001/api";

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
  try {
    const res = await fetch(`${API_BASE}/status`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { ok: false, error: "Serveur local non disponible (mode démo actif)" };
  }
}

// ─── Inventaire ────────────────────────────────────────────────────────────

export async function fetchInventory(): Promise<InventoryResult> {
  const res = await fetch(`${API_BASE}/inventory`, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`);
  return await res.json();
}

// ─── Recherche ─────────────────────────────────────────────────────────────

export async function searchPackages(query: string): Promise<SearchResult> {
  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Erreur recherche: ${res.status}`);
  return await res.json();
}

// ─── Mises à jour ──────────────────────────────────────────────────────────

export async function fetchUpdates(): Promise<UpdatesResult> {
  try {
    const res = await fetch(`${API_BASE}/updates`, { signal: AbortSignal.timeout(120000) });
    if (!res.ok) {
      // Si le serveur retourne une erreur, retourner une liste vide plutôt que de lancer une erreur
      console.warn(`Erreur HTTP ${res.status} lors de la récupération des mises à jour`);
      return { updates: [], total: 0, timestamp: new Date().toISOString() };
    }
    const data = await res.json();
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

// ─── Infos Système ──────────────────────────────────────────────────────────

export async function fetchSystemInfo(): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/system-info`, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`);
  return await res.json();
}

// ─── Infos Réseau ───────────────────────────────────────────────────────────

export async function fetchNetworkInfo(): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/network-info`, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`);
  return await res.json();
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
