import { useState, useEffect, useMemo } from "react";
import heroImg from "@/assets/hero-bg.jpg";
import { KpiCard } from "./KpiCard";
import { 
  Package, RefreshCw, CheckCircle2, AlertTriangle, Monitor, Clock,
  TrendingUp, Shield, Activity, Database, Network, Wifi, Globe, 
  Server, Layers, BarChart3, PieChart as PieChartIcon, WifiOff
} from "lucide-react";
import { useServer } from "@/contexts/ServerContext";
import { fetchInventory, fetchUpdates, AppEntry } from "@/lib/winget-api";
import { useScanData } from "@/hooks/use-scan-data";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid } from "recharts";
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

  useEffect(() => {
    if (persistedInventory?.apps && persistedInventory.apps.length > 0) {
      setInventory(persistedInventory.apps);
      setLastScan(lastScanTime);
      setLoading(false);
    } else if (isConnected) {
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
      if (invData.apps && invData.apps.length > 0) {
        saveScanData(invData);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      if (persistedInventory?.apps) {
        setInventory(persistedInventory.apps);
        setLastScan(lastScanTime);
      }
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = inventory.length;
    const upToDate = inventory.filter(a => a.status === "up-to-date").length;
    const updateAvailable = inventory.filter(a => a.status === "update-available").length;
    const unknown = inventory.filter(a => a.status === "unknown").length;
    const updateCount = updates.length;
    const complianceRate = total > 0 ? Math.round((upToDate / total) * 100) : 0;
    
    const bySource = inventory.reduce((acc, app) => {
      acc[app.source] = (acc[app.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topApps = [...inventory]
      .sort((a, b) => {
        const aDate = a.installDate ? new Date(a.installDate).getTime() : 0;
        const bDate = b.installDate ? new Date(b.installDate).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 8);

    const statusData = [
      { name: "À jour", value: upToDate, color: COLORS.green },
      { name: "MàJ disponible", value: updateAvailable, color: COLORS.orange },
      { name: "Inconnu", value: unknown, color: COLORS.red },
    ];

    const sourceData = Object.entries(bySource).map(([name, value]) => ({
      name, value, color: name === "winget" ? COLORS.blue : COLORS.cyan,
    }));

    return { total, upToDate, updateAvailable, unknown, updateCount, complianceRate, bySource, topApps, statusData, sourceData };
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

  const hasData = stats.total > 0;

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative rounded-2xl overflow-hidden h-40 border border-border">
        <img src={heroImg} alt="Windows WinGet Dashboard" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-center px-8">
          <div className="flex items-center gap-2 mb-1">
            <div className={cn("w-2 h-2 rounded-full pulse-dot", isConnected ? "bg-neon-green" : "bg-neon-red")} />
            <span className={cn("text-xs font-mono uppercase tracking-widest", isConnected ? "text-neon-green" : "text-neon-red")}>
              {isConnected ? "Système opérationnel" : "Non connecté"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">WinGet Admin Console</h1>
          <p className="text-muted-foreground text-sm mt-1 font-mono">
            {isConnected ? `${status?.platform || "Windows"} · winget ${status?.wingetVersion || "N/A"} · ${status?.hostname}` : "Connectez le serveur local pour commencer"}
          </p>
        </div>
        {isConnected && (
          <div className="absolute right-6 bottom-4 top-4 hidden md:flex flex-col justify-center items-end gap-1">
            <div className="font-mono text-xs text-muted-foreground/60"><span className="text-neon-blue">winget</span> --version</div>
            <div className="font-mono text-sm text-neon-cyan">{status?.wingetVersion || "--"}</div>
            <div className="font-mono text-xs text-muted-foreground/60 mt-1"><span className="text-neon-blue">hostname</span></div>
            <div className="font-mono text-sm text-foreground">{status?.hostname || "--"}</div>
          </div>
        )}
      </div>

      {/* Not connected state */}
      {!isConnected && !hasData && (
        <div className="rounded-xl border border-neon-orange/30 bg-neon-orange/5 p-8 text-center">
          <WifiOff className="w-12 h-12 text-neon-orange/30 mx-auto mb-4" />
          <h3 className="text-foreground font-semibold mb-2">Serveur local non connecté</h3>
          <p className="text-sm text-muted-foreground font-mono max-w-md mx-auto">
            Lancez le serveur local (<span className="text-neon-blue">cd server && npm start</span>) puis effectuez un scan pour afficher les données de votre machine.
          </p>
        </div>
      )}

      {/* KPIs Row 1 — always visible but shows -- when no data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Applications installées" value={loading ? "..." : hasData ? stats.total : "--"} subtitle={isConnected ? "via winget list" : "Non connecté"} icon={Package} glow="blue" trend={hasData && stats.total > 0 ? { value: `${stats.total} total`, positive: true } : undefined} />
        <KpiCard title="À jour" value={loading ? "..." : hasData ? stats.upToDate : "--"} subtitle={hasData ? `${stats.complianceRate}% du parc` : "En attente de scan"} icon={CheckCircle2} glow="green" trend={hasData ? (stats.complianceRate >= 80 ? { value: "Excellent", positive: true } : { value: "À améliorer", positive: false }) : undefined} />
        <KpiCard title="Mises à jour" value={loading ? "..." : hasData ? stats.updateCount : "--"} subtitle="disponibles" icon={RefreshCw} glow="orange" trend={hasData ? (stats.updateCount > 0 ? { value: "Action requise", positive: false } : { value: "À jour", positive: true }) : undefined} />
        <KpiCard title="Dernier scan" value={formatTime(lastScan)} subtitle={lastScan ? lastScan.toLocaleDateString("fr-FR") : "Non effectué"} icon={Clock} glow="cyan" />
      </div>

      {/* KPIs Row 2 — only with data */}
      {hasData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Taux de conformité" value={`${stats.complianceRate}%`} subtitle={stats.complianceRate >= 90 ? "Excellent" : stats.complianceRate >= 70 ? "Bon" : "À améliorer"} icon={TrendingUp} glow={stats.complianceRate >= 90 ? "green" : stats.complianceRate >= 70 ? "cyan" : "orange"} />
          <KpiCard title="Statut inconnu" value={stats.unknown} subtitle="applications non vérifiées" icon={AlertTriangle} glow="red" />
          <KpiCard title="Sources actives" value={Object.keys(stats.bySource).length} subtitle={Object.keys(stats.bySource).join(", ") || "Aucune"} icon={Database} glow="cyan" />
          <KpiCard title="Sécurité" value={status?.isAdmin ? "Admin" : "Standard"} subtitle={status?.isAdmin ? "Privilèges élevés" : "Droits limités"} icon={Shield} glow={status?.isAdmin ? "green" : "orange"} />
        </div>
      )}

      {/* System & Network info — only from server */}
      {isConnected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-neon-blue" />
              Informations Système
            </h3>
            <div className="space-y-3">
              {[
                { label: "Système d'exploitation", value: status?.platform || "--", icon: Layers, color: "text-neon-blue" },
                { label: "Hostname", value: status?.hostname || "--", icon: Server, color: "text-neon-cyan" },
                { label: "Utilisateur", value: status?.user || "--", icon: Shield, color: "text-neon-orange" },
                { label: "Winget Version", value: status?.wingetVersion || "--", icon: Package, color: "text-neon-green" },
                { label: "Statut", value: "Connecté", icon: Wifi, color: "text-neon-green" },
                { label: "Privilèges", value: status?.isAdmin ? "Administrateur" : "Standard", icon: Shield, color: status?.isAdmin ? "text-neon-green" : "text-neon-orange" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-1/30 border border-border/50">
                  <div className="flex items-center gap-2">
                    <item.icon className={cn("w-3.5 h-3.5", item.color)} />
                    <span className="text-xs text-muted-foreground font-mono">{item.label}</span>
                  </div>
                  <span className={cn("text-xs font-mono font-medium", item.color)}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Network className="w-4 h-4 text-neon-cyan" />
              Connexion Serveur
            </h3>
            <div className="space-y-3">
              {[
                { label: "API Endpoint", value: "localhost:3001", icon: Globe, color: "text-neon-cyan" },
                { label: "Protocole", value: "HTTP + SSE", icon: Network, color: "text-neon-blue" },
                { label: "Latence", value: "< 5ms", icon: Activity, color: "text-neon-green" },
                { label: "Mode", value: status?.isAdmin ? "Administrateur" : "Standard", icon: Shield, color: status?.isAdmin ? "text-neon-green" : "text-neon-orange" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-1/30 border border-border/50">
                  <div className="flex items-center gap-2">
                    <item.icon className={cn("w-3.5 h-3.5", item.color)} />
                    <span className="text-xs text-muted-foreground font-mono">{item.label}</span>
                  </div>
                  <span className={cn("text-xs font-mono font-medium", item.color)}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Graphiques — only with data */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-neon-blue" />
              Répartition par statut
            </h3>
            <ChartContainer config={{ upToDate: { label: "À jour", color: COLORS.green }, updateAvailable: { label: "MàJ disponible", color: COLORS.orange }, unknown: { label: "Inconnu", color: COLORS.red } }}>
              <PieChart>
                <Pie data={stats.statusData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={70} fill="#8884d8" dataKey="value">
                  {stats.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-neon-cyan" />
              Répartition par source
            </h3>
            {stats.sourceData.length > 0 ? (
              <ChartContainer config={{ winget: { label: "Winget", color: COLORS.blue }, msstore: { label: "MS Store", color: COLORS.cyan } }}>
                <BarChart data={stats.sourceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill={COLORS.blue} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Aucune donnée</div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-neon-green" />
              Jauge de conformité
            </h3>
            <div className="flex flex-col items-center justify-center h-48">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={stats.complianceRate >= 80 ? COLORS.green : stats.complianceRate >= 50 ? COLORS.orange : COLORS.red} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${stats.complianceRate * 2.64} 264`} className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn("text-2xl font-bold font-mono", stats.complianceRate >= 80 ? "text-neon-green" : stats.complianceRate >= 50 ? "text-neon-orange" : "text-neon-red")}>
                    {stats.complianceRate}%
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">conformité</span>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground font-mono text-center">
                {stats.upToDate}/{stats.total} applications à jour
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Applications — only with data */}
      {hasData && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-neon-cyan" />
              Top Applications récentes
            </h3>
            <button onClick={loadData} disabled={loading || !isConnected} className="text-xs text-muted-foreground hover:text-neon-blue transition-colors font-mono flex items-center gap-1">
              <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
              Actualiser
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {stats.topApps.map((app, i) => (
              <div key={app.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-surface-1/30 hover:bg-surface-2 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-neon-blue/10 border border-neon-blue/30 flex items-center justify-center text-xs font-mono text-neon-blue flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{app.name}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{app.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-xs font-mono text-foreground">{app.version}</div>
                  {app.status === "up-to-date" ? <CheckCircle2 className="w-4 h-4 text-neon-green" /> : app.status === "update-available" ? <RefreshCw className="w-4 h-4 text-neon-orange" /> : <AlertTriangle className="w-4 h-4 text-neon-red" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Updates */}
      {stats.updateCount > 0 && (
        <div className="rounded-xl border border-neon-orange/30 bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-neon-orange" />
            Mises à jour disponibles ({stats.updateCount})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {updates.slice(0, 8).map(app => (
              <div key={app.id} className="p-3 rounded-lg border border-border bg-surface-1/30 hover:bg-surface-2 transition-colors">
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
    </div>
  );
}
