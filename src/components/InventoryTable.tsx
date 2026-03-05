import { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Filter, RefreshCw, Wifi, WifiOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchInventory, AppEntry } from "@/lib/winget-api";
import { useServer } from "@/contexts/ServerContext";
import { useScanData } from "@/hooks/use-scan-data";

const PAGE_SIZE = 10;

interface InventoryTableProps {
  externalApps?: AppEntry[];
  compact?: boolean;
}

export function InventoryTable({ externalApps, compact = false }: InventoryTableProps) {
  const { isConnected } = useServer();
  const { inventory: persistedInventory, saveScanData } = useScanData();
  const [apps, setApps] = useState<AppEntry[]>(() => {
    if (persistedInventory?.apps) {
      return persistedInventory.apps;
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "up-to-date" | "update-available">("all");
  const [page, setPage] = useState(1);

  const loadInventory = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInventory();
      setApps(data.apps);
      // Sauvegarder les données après chargement
      saveScanData(data);
    } catch (err) {
      setError("Erreur lors du chargement de l'inventaire");
      // En cas d'erreur, utiliser les données persistées si disponibles
      if (persistedInventory?.apps) {
        setApps(persistedInventory.apps);
      }
    } finally {
      setLoading(false);
    }
  }, [isConnected, saveScanData, persistedInventory]);

  useEffect(() => {
    if (externalApps) {
      setApps(externalApps);
      return;
    }
    // Utiliser les données persistées si disponibles, sinon charger
    if (persistedInventory?.apps && persistedInventory.apps.length > 0) {
      setApps(persistedInventory.apps);
    } else if (isConnected) {
      loadInventory();
    } else {
      setApps([]);
    }
  }, [isConnected, externalApps, persistedInventory, loadInventory]);

  const source = externalApps || apps;

  const filtered = source.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.id.toLowerCase().includes(search.toLowerCase()) ||
      app.version.includes(search);
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleFilter = (f: typeof statusFilter) => { setStatusFilter(f); setPage(1); };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-border bg-surface-2">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher par nom, ID, version..."
            className="w-full pl-9 pr-4 py-2 bg-surface-1 border border-border rounded-lg text-sm font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/30 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          {(["all", "up-to-date", "update-available"] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                statusFilter === f
                  ? f === "all"
                    ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/30"
                    : f === "up-to-date"
                    ? "bg-neon-green/20 text-neon-green border border-neon-green/30"
                    : "bg-neon-orange/20 text-neon-orange border border-neon-orange/30"
                  : "text-muted-foreground hover:text-foreground bg-surface-1 border border-border"
              )}
            >
              {f === "all" ? "Tous" : f === "up-to-date" ? "✓ À jour" : "⚠ MàJ"}
            </button>
          ))}
          {!externalApps && (
            <button
              onClick={loadInventory}
              disabled={loading || !isConnected}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-neon-blue hover:bg-neon-blue/10 disabled:opacity-30 transition-colors"
              title="Actualiser depuis winget"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          )}
        </div>
      </div>

      {/* Status bar */}
      {!externalApps && (
        <div className={cn(
          "flex items-center gap-2 px-4 py-1.5 text-xs font-mono border-b border-border/50",
          isConnected ? "bg-neon-green/5 text-neon-green/70" : "bg-neon-orange/5 text-neon-orange/70"
        )}>
          {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {loading
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Chargement depuis winget...</>
            : isConnected
            ? `Données réelles · ${source.length} applications · winget list`
            : "Mode démo — Lancez le serveur local pour voir vos vraies apps"}
          {error && <span className="text-neon-red ml-2">{error}</span>}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="w-6 h-6 text-neon-blue animate-spin" />
          <div>
            <div className="text-sm font-medium text-foreground">Exécution de winget list...</div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5">Cela peut prendre quelques secondes</div>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-1">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> Application</div>
                </th>
                {!compact && <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Package ID</th>}
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Version</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((app, i) => (
                <tr
                  key={`${app.id}-${i}`}
                  className={cn(
                    "border-b border-border/50 transition-colors hover:bg-surface-2 group",
                    i % 2 === 0 ? "bg-card" : "bg-surface-1/30"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground group-hover:text-neon-blue transition-colors text-sm">{app.name}</div>
                    {compact && <div className="font-mono text-xs text-muted-foreground mt-0.5">{app.id}</div>}
                  </td>
                  {!compact && (
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-xs text-muted-foreground">{app.id}</span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-foreground/80">{app.version}</div>
                    {app.available && (
                      <div className="font-mono text-xs text-neon-orange mt-0.5">→ {app.available}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {app.status === "up-to-date" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neon-green/10 text-neon-green border border-neon-green/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />À jour
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neon-orange/10 text-neon-orange border border-neon-orange/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-orange" />MàJ dispo
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={compact ? 3 : 4} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    Aucune application trouvée
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-2">
          <span className="text-xs text-muted-foreground font-mono">
            {filtered.length} résultat{filtered.length !== 1 ? "s" : ""} · Page {page}/{Math.max(1, totalPages)}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={cn("w-7 h-7 rounded-lg text-xs font-mono transition-all",
                  page === p ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/30" : "text-muted-foreground hover:text-foreground hover:bg-surface-1"
                )}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
