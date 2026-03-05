import { Network, Globe, Wifi, Shield, Server, Activity, RefreshCw, Loader2 } from "lucide-react";
import { useServer } from "@/contexts/ServerContext";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { KpiCard } from "./KpiCard";

export function NetworkPage() {
  const { isConnected, status } = useServer();
  const [scanning, setScanning] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 3000);
  };

  const networkInfo = [
    { section: "Interface Réseau", items: [
      { label: "Type d'interface", value: "Ethernet / Wi-Fi", icon: Wifi, color: "text-neon-cyan" },
      { label: "Adresse MAC", value: "XX:XX:XX:XX:XX:XX", icon: Network, color: "text-neon-blue" },
      { label: "Vitesse de liaison", value: "1 Gbps", icon: Activity, color: "text-neon-green" },
      { label: "État du lien", value: isConnected ? "Connecté" : "Déconnecté", icon: Wifi, color: isConnected ? "text-neon-green" : "text-neon-red" },
    ]},
    { section: "Configuration IPv4", items: [
      { label: "Adresse IP", value: "192.168.1.x", icon: Globe, color: "text-neon-cyan" },
      { label: "Masque de sous-réseau", value: "255.255.255.0", icon: Network, color: "text-neon-blue" },
      { label: "Passerelle par défaut", value: "192.168.1.1", icon: Server, color: "text-neon-orange" },
      { label: "DHCP", value: "Activé", icon: Activity, color: "text-neon-green" },
    ]},
    { section: "DNS", items: [
      { label: "DNS primaire", value: "8.8.8.8", icon: Globe, color: "text-neon-green" },
      { label: "DNS secondaire", value: "8.8.4.4", icon: Globe, color: "text-neon-green" },
      { label: "Suffixe DNS", value: "local", icon: Network, color: "text-neon-blue" },
    ]},
    { section: "Sécurité Réseau", items: [
      { label: "Pare-feu Windows", value: "Activé", icon: Shield, color: "text-neon-green" },
      { label: "Profil réseau", value: "Privé", icon: Shield, color: "text-neon-cyan" },
      { label: "Chiffrement Wi-Fi", value: "WPA3", icon: Shield, color: "text-neon-green" },
    ]},
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Interfaces actives" value="2" subtitle="Ethernet + Wi-Fi" icon={Network} glow="cyan" />
        <KpiCard title="Vitesse réseau" value="1 Gbps" subtitle="Liaison active" icon={Activity} glow="green" />
        <KpiCard title="Pare-feu" value="Activé" subtitle="Profil privé" icon={Shield} glow="green" />
        <KpiCard title="Latence DNS" value="12ms" subtitle="8.8.8.8" icon={Globe} glow="blue" />
      </div>

      {/* Scan button */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Analyse Réseau</h3>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">ipconfig /all · netstat · Get-NetAdapter</p>
          </div>
          <button onClick={handleScan} disabled={scanning} className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all", scanning ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/20")}>
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
