import { Network, Globe, Wifi, Shield, Server, Activity, RefreshCw, Loader2 } from "lucide-react";
import { useServer } from "@/contexts/ServerContext";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { KpiCard } from "./KpiCard";
import { fetchNetworkInfo, NetworkInfo } from "@/lib/winget-api";

export function NetworkPage() {
  const { isConnected } = useServer();
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [networkData, setNetworkData] = useState<NetworkInfo | null>(null);

  const loadNetwork = async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const data = await fetchNetworkInfo();
      console.log("NetworkInfo loaded:", data);
      setNetworkData(data);
    } catch (err) {
      console.error("Erreur lors du chargement des infos réseau:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) loadNetwork();
  }, [isConnected]);

  const handleScan = () => {
    setScanning(true);
    loadNetwork().finally(() => setScanning(false));
  };

  const adapters = networkData?.adapters || [];
  const firewallEnabled = networkData?.firewallProfiles?.some(p => p.enabled) ?? false;
  const subnetMask = networkData?.subnetPrefix ? `/${networkData.subnetPrefix}` : "N/A";

  const networkInfo = [
    { section: "Interface Réseau", items: [
      { label: "Type d'interface", value: adapters.length > 0 ? adapters.map(a => a.name).join(" / ") : (isConnected ? "Chargement..." : "—"), icon: Wifi, color: "text-neon-cyan" },
      { label: "Adresse MAC", value: adapters[0]?.mac || "—", icon: Network, color: "text-neon-blue" },
      { label: "Vitesse de liaison", value: adapters[0]?.speed || "—", icon: Activity, color: "text-neon-green" },
      { label: "État du lien", value: isConnected ? (adapters[0]?.status || "Connecté") : "Déconnecté", icon: Wifi, color: isConnected ? "text-neon-green" : "text-neon-red" },
    ]},
    { section: "Configuration IPv4", items: [
      { label: "Adresse IP locale", value: networkData?.ip || "—", icon: Globe, color: "text-neon-cyan" },
      { label: "IP publique", value: networkData?.publicIP || "—", icon: Globe, color: "text-neon-green" },
      { label: "Passerelle par défaut", value: networkData?.gateway || "—", icon: Server, color: "text-neon-orange" },
      { label: "Préfixe sous-réseau", value: subnetMask, icon: Network, color: "text-neon-blue" },
    ]},
    { section: "DNS", items: [
      { label: "DNS primaire", value: networkData?.dns?.[0] || "—", icon: Globe, color: "text-neon-green" },
      { label: "DNS secondaire", value: networkData?.dns?.[1] || "—", icon: Globe, color: "text-neon-green" },
      { label: "Profil réseau", value: networkData?.networkProfile || "—", icon: Network, color: "text-neon-blue" },
    ]},
    { section: "Sécurité Réseau", items: [
      ...(networkData?.firewallProfiles || []).map(p => ({
        label: `Pare-feu ${p.name}`, value: p.enabled ? "Activé" : "Désactivé", icon: Shield, color: p.enabled ? "text-neon-green" : "text-neon-red"
      })),
      ...(!networkData?.firewallProfiles ? [{ label: "Pare-feu", value: "—", icon: Shield, color: "text-muted-foreground" }] : []),
    ]},
  ];

  return (
    <div className="space-y-6">
      {/* Serveur non connecté */}
      {!isConnected && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neon-orange/30 bg-neon-orange/5">
          <Wifi className="w-4 h-4 text-neon-orange flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="text-neon-orange font-medium">Serveur non connecté</span> — Lancez le serveur local pour voir les données réseau réelles.
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Interfaces actives" value={adapters.length || "—"} subtitle={adapters.map(a => a.name).join(", ") || "Aucune donnée"} icon={Network} glow="cyan" />
        <KpiCard title="Vitesse réseau" value={adapters[0]?.speed || "—"} subtitle="Liaison active" icon={Activity} glow="green" />
        <KpiCard title="Pare-feu" value={networkData ? (firewallEnabled ? "Activé" : "Désactivé") : "—"} subtitle={networkData?.networkProfile || "Aucune donnée"} icon={Shield} glow={firewallEnabled ? "green" : "red"} />
        <KpiCard title="IP publique" value={networkData?.publicIP || "—"} subtitle={networkData?.ip || "Aucune donnée"} icon={Globe} glow="blue" />
      </div>

      {/* Scan button */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Analyse Réseau</h3>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">Get-NetAdapter · Get-NetIPConfiguration · Get-NetFirewallProfile</p>
          </div>
          <button onClick={handleScan} disabled={scanning || !isConnected} className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all", scanning ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/20 disabled:opacity-40 disabled:cursor-not-allowed")}>
            {scanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Scan en cours...</> : <><RefreshCw className="w-4 h-4" /> Scanner le réseau</>}
          </button>
        </div>
      </div>

      {/* Network sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {networkInfo.map(section => (
          <div key={section.section} className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Network className="w-4 h-4 text-neon-cyan" />
              {section.section}
            </h3>
            <div className="space-y-2">
              {section.items.map(item => (
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
        ))}
      </div>
    </div>
  );
}
