import { useState, useEffect, useMemo } from "react";
import heroImg from "@/assets/hero-bg.jpg";
import { KpiCard } from "./KpiCard";
import { InventoryTable } from "./InventoryTable";
import { 
  Package, RefreshCw, CheckCircle2, AlertTriangle, Monitor, Clock, ExternalLink,
  TrendingUp, TrendingDown, HardDrive, Shield, Activity, Download, Upload, Zap,
  Server, Users, Database, Cpu, MemoryStick, Network
} from "lucide-react";
import { useServer } from "@/contexts/ServerContext";
import { fetchInventory, fetchUpdates, AppEntry } from "@/lib/winget-api";
import { useScanData } from "@/hooks/use-scan-data";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { cn } from "@/lib/utils";

const COLORS = {
  blue: "hsl(var(--neon-blue))",
  cyan: "hsl(var(--neon-cyan))",
  green: "hsl(var(--neon-green))",
  orange: "hsl(var(--neon-orange))",
  red: "hsl(var(--neon-red))",
};

export function DashboardPage() {
  const { status, isConnected } = useServer();
  const { inventory: persistedInventory, lastScanTime, saveScanData } = useScanData();
  const [inventory, setInventory] = useState<AppEntry[]>(() => persistedInventory?.apps || []);
  const [updates, setUpdates] = useState<AppEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(lastScanTime);

  // Charger les données persistées au démarrage
  useEffect(() => {
    if (persistedInventory?.apps && persistedInventory.apps.length > 0) {
      setInventory(persistedInventory.apps);
      setLastScan(lastScanTime);
      setLoading(false);
    } else if (isConnected) {
      // Charger seulement si pas de données persistées
      loadData();
    } else {
      setLoading(false);
    }
  }, [isConnected, persistedInventory, lastScanTime]);

  const loadData = async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const [invData, updData] = await Promise.all([
        fetchInventory().catch(() => ({ apps: [], total: 0, upToDate: 0, updates: 0, timestamp: new Date().toISOString() })),
        fetchUpdates().catch(() => ({ updates: [], total: 0, timestamp: new Date().toISOString() })),
      ]);
      setInventory(invData.apps || []);
      setUpdates(updData.updates || []);
      const scanTime = new Date();
      setLastScan(scanTime);
      // Sauvegarder les données
      if (invData.apps && invData.apps.length > 0) {
        saveScanData(invData);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      // En cas d'erreur, utiliser les données persistées si disponibles
      if (persistedInventory?.apps) {
        setInventory(persistedInventory.apps);
        setLastScan(lastScanTime);
      }
      setLoading(false);
    }
  };

  // Calculs dynamiques
  const stats = useMemo(() => {
    const total = inventory.length;
    const upToDate = inventory.filter(a => a.status === "up-to-date").length;
    const updateAvailable = inventory.filter(a => a.status === "update-available").length;
    const unknown = inventory.filter(a => a.status === "unknown").length;
    const updateCount = updates.length;
    const complianceRate = total > 0 ? Math.round((upToDate / total) * 100) : 0;
    
    // Group by source
    const bySource = inventory.reduce((acc, app) => {
      acc[app.source] = (acc[app.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top 10 apps
    const topApps = [...inventory]
      .sort((a, b) => {
        const aDate = a.installDate ? new Date(a.installDate).getTime() : 0;
        const bDate = b.installDate ? new Date(b.installDate).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 10);

    // Status distribution for pie chart
    const statusData = [
      { name: "À jour", value: upToDate, color: COLORS.green },
      { name: "MàJ disponible", value: updateAvailable, color: COLORS.orange },
      { name: "Inconnu", value: unknown, color: COLORS.red },
    ];

    // Source distribution
    const sourceData = Object.entries(bySource).map(([name, value]) => ({
      name,
      value,
      color: name === "winget" ? COLORS.blue : COLORS.cyan,
    }));

    return {
      total,
      upToDate,
      updateAvailable,
      unknown,
      updateCount,
      complianceRate,
      bySource,
      topApps,
      statusData,
      sourceData,
    };
  }, [inventory, updates]);

  const formatTime = (date: Date | null) => {
    if (!date) return "Jamais";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative rounded-2xl overflow-hidden h-44 border border-border">
        <img src={heroImg} alt="Windows WinGet Dashboard" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-center px-8">
          <div className="flex items-center gap-2 mb-1">
            <div className={cn("w-2 h-2 rounded-full pulse-dot", isConnected ? "bg-neon-green" : "bg-neon-red")} />
            <span className={cn("text-xs font-mono uppercase tracking-widest", isConnected ? "text-neon-green" : "text-neon-red")}>
              {isConnected ? "Système opérationnel" : "Mode démo"}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">WinGet Admin Console</h1>
          <p className="text-muted-foreground text-sm mt-1 font-mono">
            Dynamic Provisioning Engine · {status?.platform || "Windows"} · PowerShell {status?.wingetVersion || "N/A"}
          </p>
        </div>
        <div className="absolute right-6 bottom-4 top-4 hidden md:flex flex-col justify-center items-end gap-1.5">
          <div className="font-mono text-xs text-muted-foreground/60">
            <span className="text-neon-blue">winget</span> --version
          </div>
          <div className="font-mono text-sm text-neon-cyan">{status?.wingetVersion || "N/A"}</div>
          <div className="font-mono text-xs text-muted-foreground/60 mt-1">
            <span className="text-neon-blue">hostname</span>
          </div>
          <div className="font-mono text-sm text-foreground">{status?.hostname || "localhost"}</div>
        </div>
      </div>

      {/* KPIs Principaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Applications installées"
          value={loading ? "..." : stats.total}
          subtitle={isConnected ? "via winget list" : "Mode démo"}
          icon={Package}
          glow="blue"
          trend={stats.total > 0 ? { value: `${stats.total} total`, positive: true } : undefined}
        />
        <KpiCard
          title="À jour"
          value={loading ? "..." : stats.upToDate}
          subtitle={stats.total > 0 ? `${stats.complianceRate}% du parc` : "Aucune donnée"}
          icon={CheckCircle2}
          glow="green"
          trend={stats.complianceRate >= 80 ? { value: "Excellent", positive: true } : { value: "À améliorer", positive: false }}
        />
        <KpiCard
          title="Mises à jour"
          value={loading ? "..." : stats.updateCount}
          subtitle="disponibles"
          icon={RefreshCw}
          glow="orange"
          trend={stats.updateCount > 0 ? { value: "Action requise", positive: false } : { value: "À jour", positive: true }}
        />
        <KpiCard
          title="Dernier scan"
          value={formatTime(lastScan)}
          subtitle={lastScan ? lastScan.toLocaleDateString("fr-FR") : "Non effectué"}
          icon={Clock}
          glow="cyan"
        />
      </div>

      {/* KPIs Secondaires */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <KpiCard
          title="Statut inconnu"
          value={stats.unknown}
          subtitle="applications"
          icon={AlertTriangle}
          glow="red"
          className="lg:col-span-1"
        />
        <KpiCard
          title="Sources actives"
          value={Object.keys(stats.bySource).length}
          subtitle={Object.keys(stats.bySource).join(", ") || "Aucune"}
          icon={Database}
          glow="cyan"
          className="lg:col-span-1"
        />
        <KpiCard
          title="Taux de conformité"
          value={`${stats.complianceRate}%`}
          subtitle={stats.complianceRate >= 90 ? "Excellent" : stats.complianceRate >= 70 ? "Bon" : "À améliorer"}
          icon={TrendingUp}
          glow={stats.complianceRate >= 90 ? "green" : stats.complianceRate >= 70 ? "cyan" : "orange"}
          className="lg:col-span-1"
        />
        <KpiCard
          title="Applications récentes"
          value={stats.topApps.length}
          subtitle="10 dernières"
          icon={Activity}
          glow="blue"
          className="lg:col-span-1"
        />
        <KpiCard
          title="Système"
          value={isConnected ? "Connecté" : "Démo"}
          subtitle={status?.user || "N/A"}
          icon={Server}
          glow={isConnected ? "green" : "orange"}
          className="lg:col-span-1"
        />
        <KpiCard
          title="Sécurité"
          value={status?.isAdmin ? "Admin" : "Standard"}
          subtitle={status?.isAdmin ? "Privilèges élevés" : "Droits limités"}
          icon={Shield}
          glow={status?.isAdmin ? "green" : "orange"}
          className="lg:col-span-1"
        />
      </div>

      {/* Graphiques et Statistiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Répartition par statut */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-neon-blue" />
            Répartition par statut
          </h3>
          {stats.total > 0 ? (
            <ChartContainer config={{ upToDate: { label: "À jour", color: COLORS.green }, updateAvailable: { label: "MàJ disponible", color: COLORS.orange }, unknown: { label: "Inconnu", color: COLORS.red } }}>
              <PieChart>
                <Pie
                  data={stats.statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Répartition par source */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-neon-cyan" />
            Répartition par source
          </h3>
          {stats.sourceData.length > 0 ? (
            <ChartContainer config={{ winget: { label: "Winget", color: COLORS.blue }, msstore: { label: "Microsoft Store", color: COLORS.cyan } }}>
              <BarChart data={stats.sourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill={COLORS.blue} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              Aucune donnée disponible
            </div>
          )}
        </div>
      </div>

      {/* Informations système et Top Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* System info */}
        <div className="lg:col-span-1 rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Monitor className="w-4 h-4 text-neon-blue" />
            <h3 className="text-sm font-semibold text-foreground">Informations système</h3>
          </div>
          {[
            { label: "OS", value: status?.platform || "Windows", color: "text-neon-blue" },
            { label: "PowerShell", value: status?.wingetVersion ? "Disponible" : "N/A", color: "text-neon-cyan" },
            { label: "Winget", value: status?.wingetVersion || "N/A", color: "text-neon-green" },
            { label: "Hostname", value: status?.hostname || "N/A", color: "text-foreground" },
            { label: "Utilisateur", value: status?.user || "N/A", color: "text-neon-orange" },
            { label: "Statut", value: isConnected ? "Connecté" : "Démo", color: isConnected ? "text-neon-green" : "text-neon-orange" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
              <span className="text-xs text-muted-foreground font-mono">{item.label}</span>
              <span className={cn("text-xs font-mono font-medium", item.color)}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Top Applications */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-neon-cyan" />
              Top 10 Applications récentes
            </h3>
            <button
              onClick={loadData}
              disabled={loading || !isConnected}
              className="text-xs text-muted-foreground hover:text-neon-blue transition-colors font-mono flex items-center gap-1"
            >
              <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
              Actualiser
            </button>
          </div>
          <div className="space-y-2">
            {stats.topApps.length > 0 ? (
              stats.topApps.map((app, i) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-surface-1/30 hover:bg-surface-2 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-neon-blue/10 border border-neon-blue/30 flex items-center justify-center text-xs font-mono text-neon-blue flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{app.name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">{app.id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono text-foreground">{app.version}</div>
                      {app.installDate && (
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(app.installDate).toLocaleDateString("fr-FR")}
                        </div>
                      )}
                    </div>
                    {app.status === "up-to-date" ? (
                      <CheckCircle2 className="w-4 h-4 text-neon-green" />
                    ) : app.status === "update-available" ? (
                      <RefreshCw className="w-4 h-4 text-neon-orange" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-neon-red" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {loading ? "Chargement..." : "Aucune application trouvée"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mises à jour disponibles */}
      {stats.updateCount > 0 && (
        <div className="rounded-xl border border-neon-orange/30 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-neon-orange" />
              Mises à jour disponibles ({stats.updateCount})
            </h3>
            <button
              onClick={() => window.location.hash = "#updates"}
              className="text-xs text-neon-orange hover:text-neon-blue transition-colors font-mono flex items-center gap-1"
            >
              Voir toutes les mises à jour
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {updates.slice(0, 6).map(app => (
              <div
                key={app.id}
                className="p-3 rounded-lg border border-border bg-surface-1/30 hover:bg-surface-2 transition-colors"
              >
                <div className="text-sm font-medium text-foreground truncate">{app.name}</div>
                <div className="text-xs text-muted-foreground font-mono mt-1 truncate">{app.id}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-mono text-muted-foreground line-through">{app.version}</span>
                  <span className="text-xs font-mono text-neon-orange font-bold">→ {app.available}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventaire rapide */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-neon-cyan" />
            Inventaire complet
          </h2>
          <button
            onClick={() => window.location.hash = "#inventory"}
            className="flex items-center gap-1.5 text-xs text-neon-cyan hover:text-neon-blue cursor-pointer transition-colors font-mono"
          >
            <ExternalLink className="w-3 h-3" />
            Voir tout
          </button>
        </div>
        <InventoryTable externalApps={inventory.slice(0, 10)} compact />
      </div>
    </div>
  );
}
