import { Monitor, Cpu, MemoryStick, HardDrive, Layers, Shield, Server, RefreshCw, Loader2, WifiOff } from "lucide-react";
import { useServer } from "@/contexts/ServerContext";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { KpiCard } from "./KpiCard";
import { fetchSystemInfo, SystemInfo } from "@/lib/winget-api";

export function SystemInfoPage() {
  const { status, isConnected } = useServer();
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSystem = async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const data = await fetchSystemInfo();
      console.log("SystemInfo loaded:", data);
      setSysInfo(data);
    } catch (err) {
      console.error("Erreur lors du chargement des infos système:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) loadSystem();
  }, [isConnected]);

  const sections = [
    { title: "Système d'exploitation", icon: Layers, items: [
      { label: "OS", value: sysInfo?.os?.name || "—", color: "text-neon-blue" },
      { label: "Version", value: sysInfo?.os?.version ? `${sysInfo.os.version} (Build ${sysInfo.os.build})` : "—", color: "text-neon-cyan" },
      { label: "Architecture", value: sysInfo?.os?.arch || "—", color: "text-neon-green" },
      { label: "Nom machine", value: status?.hostname || "—", color: "text-foreground" },
      { label: "Domaine", value: sysInfo?.machine?.domain || "—", color: "text-neon-orange" },
      { label: "Date d'installation", value: sysInfo?.os?.installDate || "—", color: "text-muted-foreground" },
      { label: "Dernier démarrage", value: sysInfo?.os?.lastBoot || "—", color: "text-neon-cyan" },
    ]},
    { title: "Processeur", icon: Cpu, items: [
      { label: "CPU", value: sysInfo?.cpu?.name || "—", color: "text-neon-cyan" },
      { label: "Cœurs / Threads", value: sysInfo?.cpu ? `${sysInfo.cpu.cores}C / ${sysInfo.cpu.threads}T` : "—", color: "text-neon-blue" },
      { label: "Fréquence max", value: sysInfo?.cpu?.maxClock ? `${sysInfo.cpu.maxClock} GHz` : "—", color: "text-neon-green" },
      { label: "Cache L3", value: sysInfo?.cpu?.cache ? `${sysInfo.cpu.cache} MB` : "—", color: "text-neon-orange" },
      { label: "Utilisation CPU", value: sysInfo?.cpu?.usage != null ? `${sysInfo.cpu.usage}%` : "—", color: "text-neon-cyan" },
    ]},
    { title: "Mémoire", icon: MemoryStick, items: [
      { label: "RAM totale", value: sysInfo?.memory ? `${sysInfo.memory.totalGB} GB ${sysInfo.memory.type}` : "—", color: "text-neon-cyan" },
      { label: "Vitesse", value: sysInfo?.memory?.speed ? `${sysInfo.memory.speed} MHz` : "—", color: "text-neon-blue" },
      { label: "Slots utilisés", value: sysInfo?.memory?.slots ? `${sysInfo.memory.slots}` : "—", color: "text-neon-orange" },
      { label: "Utilisation", value: sysInfo?.memory?.usedPercent != null ? `${sysInfo.memory.usedPercent}%` : "—", color: "text-neon-green" },
      { label: "Libre", value: sysInfo?.memory ? `${sysInfo.memory.freeGB} GB` : "—", color: "text-neon-green" },
    ]},
    { title: "Stockage", icon: HardDrive, items: [
      { label: "Disque principal", value: sysInfo?.storage?.model || "—", color: "text-neon-cyan" },
      { label: "Capacité totale", value: sysInfo?.storage?.totalGB ? `${sysInfo.storage.totalGB} GB` : "—", color: "text-neon-blue" },
      { label: "Espace libre", value: sysInfo?.storage ? `${sysInfo.storage.freeGB} GB (${sysInfo.storage.freePercent}%)` : "—", color: "text-neon-green" },
      { label: "Système fichiers", value: sysInfo?.storage?.fileSystem || "—", color: "text-neon-orange" },
    ]},
  ];

  return (
    <div className="space-y-6">
      {!isConnected && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neon-orange/30 bg-neon-orange/5">
          <WifiOff className="w-4 h-4 text-neon-orange flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="text-neon-orange font-medium">Serveur non connecté</span> — Lancez le serveur local pour voir les informations système réelles.
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={loadSystem} disabled={loading || !isConnected} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all", "bg-neon-blue/10 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/20 disabled:opacity-40 disabled:cursor-not-allowed")}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="OS" value={sysInfo?.os?.name?.replace("Microsoft ", "") || "—"} subtitle={sysInfo?.os?.build ? `Build ${sysInfo.os.build}` : "Aucune donnée"} icon={Monitor} glow="blue" />
        <KpiCard title="Processeur" value={sysInfo?.cpu?.name?.split(" ").slice(-2).join(" ") || "—"} subtitle={sysInfo?.cpu ? `${sysInfo.cpu.cores}C / ${sysInfo.cpu.threads}T` : "Aucune donnée"} icon={Cpu} glow="cyan" />
        <KpiCard title="Mémoire RAM" value={sysInfo?.memory ? `${sysInfo.memory.totalGB} GB` : "—"} subtitle={sysInfo?.memory ? `${sysInfo.memory.type} ${sysInfo.memory.speed}MHz` : "Aucune donnée"} icon={MemoryStick} glow="green" />
        <KpiCard title="Stockage" value={sysInfo?.storage ? `${sysInfo.storage.totalGB} GB` : "—"} subtitle={sysInfo?.storage?.model || "Aucune donnée"} icon={HardDrive} glow="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map(section => (
          <div key={section.title} className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <section.icon className="w-4 h-4 text-neon-blue" />
              {section.title}
            </h3>
            <div className="space-y-2">
              {section.items.map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-1/30 border border-border/50">
                  <span className="text-xs text-muted-foreground font-mono">{item.label}</span>
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
