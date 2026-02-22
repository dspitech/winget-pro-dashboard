import { Monitor, Cpu, MemoryStick, HardDrive, Layers, Shield, Server, RefreshCw, Loader2, WifiOff } from "lucide-react";
import { useServer } from "@/contexts/ServerContext";
import { cn } from "@/lib/utils";
import { KpiCard } from "./KpiCard";
import { fetchSystemInfo } from "@/lib/winget-api";
import { useState } from "react";

export function SystemInfoPage() {
  const { status, isConnected } = useServer();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    if (!isConnected) return;
    setScanning(true);
    setError(null);
    try {
      const result = await fetchSystemInfo();
      setData(result);
    } catch (err) {
      setError("Impossible de récupérer les informations système");
    }
    setScanning(false);
  };

  const osInfo = data?.os as Record<string, unknown> | null;
  const cpuInfo = data?.cpu as Record<string, unknown> | null;
  const diskInfo = data?.disk as Record<string, unknown> | Array<Record<string, unknown>> | null;
  const ramInfo = data?.ram as Record<string, unknown> | Array<Record<string, unknown>> | null;
  const domainInfo = data?.domain as Record<string, unknown> | null;
  const biosInfo = data?.bios as Record<string, unknown> | null;

  const disks = Array.isArray(diskInfo) ? diskInfo : diskInfo ? [diskInfo] : [];
  const ramModules = Array.isArray(ramInfo) ? ramInfo : ramInfo ? [ramInfo] : [];
  const totalRamBytes = ramModules.reduce((sum, m) => sum + (Number(m.Capacity) || 0), 0);
  const totalRamGB = totalRamBytes > 0 ? `${Math.round(totalRamBytes / (1024 * 1024 * 1024))} GB` : "--";
  const ramSpeed = ramModules[0]?.Speed ? `${ramModules[0].Speed} MHz` : "--";

  const formatBytes = (bytes: number) => {
    if (!bytes) return "--";
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(0)} GB`;
  };

  const sections = data ? [
    { title: "Système d'exploitation", icon: Layers, items: [
      { label: "OS", value: String(osInfo?.Caption || "--"), color: "text-neon-blue" },
      { label: "Version", value: String(osInfo?.Version || "--"), color: "text-neon-cyan" },
      { label: "Build", value: String(osInfo?.BuildNumber || "--"), color: "text-neon-cyan" },
      { label: "Architecture", value: String(osInfo?.OSArchitecture || "--"), color: "text-neon-green" },
      { label: "Nom machine", value: String(data?.hostname || "--"), color: "text-foreground" },
      { label: "Domaine", value: String(domainInfo?.Domain || domainInfo?.Workgroup || "--"), color: "text-neon-orange" },
      { label: "Fabricant", value: String(domainInfo?.Manufacturer || "--"), color: "text-neon-cyan" },
      { label: "Modèle", value: String(domainInfo?.Model || "--"), color: "text-neon-blue" },
    ]},
    { title: "Processeur", icon: Cpu, items: [
      { label: "CPU", value: String(cpuInfo?.Name || "--"), color: "text-neon-cyan" },
      { label: "Cœurs / Threads", value: cpuInfo ? `${cpuInfo.NumberOfCores}C / ${cpuInfo.NumberOfLogicalProcessors}T` : "--", color: "text-neon-blue" },
      { label: "Fréquence max", value: cpuInfo?.MaxClockSpeed ? `${(Number(cpuInfo.MaxClockSpeed) / 1000).toFixed(2)} GHz` : "--", color: "text-neon-green" },
      { label: "Cache L3", value: cpuInfo?.L3CacheSize ? `${Math.round(Number(cpuInfo.L3CacheSize) / 1024)} MB` : "--", color: "text-neon-orange" },
    ]},
    { title: "Mémoire", icon: MemoryStick, items: [
      { label: "RAM totale", value: totalRamGB, color: "text-neon-cyan" },
      { label: "Vitesse", value: ramSpeed, color: "text-neon-blue" },
      { label: "Modules installés", value: String(ramModules.length), color: "text-neon-orange" },
      ...(osInfo?.TotalVisibleMemorySize && osInfo?.FreePhysicalMemory ? [{ label: "Utilisée", value: `${Math.round(((Number(osInfo.TotalVisibleMemorySize) - Number(osInfo.FreePhysicalMemory)) / Number(osInfo.TotalVisibleMemorySize)) * 100)}%`, color: "text-neon-green" }] : []),
    ]},
    { title: "Stockage", icon: HardDrive, items: disks.flatMap(d => [
      { label: `Disque ${d.DeviceID}`, value: `${formatBytes(Number(d.Size))} ${d.FileSystem || ""}`, color: "text-neon-cyan" },
      { label: `Espace libre ${d.DeviceID}`, value: `${formatBytes(Number(d.FreeSpace))} (${Math.round((Number(d.FreeSpace) / Number(d.Size)) * 100)}%)`, color: "text-neon-green" },
    ]) },
    ...(biosInfo ? [{ title: "BIOS", icon: Shield, items: [
      { label: "Fabricant", value: String(biosInfo.Manufacturer || "--"), color: "text-neon-blue" },
      { label: "Version", value: String(biosInfo.SMBIOSBIOSVersion || "--"), color: "text-neon-cyan" },
      { label: "Série", value: String(biosInfo.SerialNumber || "--"), color: "text-neon-orange" },
    ]}] : []),
  ] : [];

  return (
    <div className="space-y-6">
      {!isConnected && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neon-orange/30 bg-neon-orange/5">
          <WifiOff className="w-4 h-4 text-neon-orange flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="text-neon-orange font-medium">Serveur non connecté</span> — Lancez le serveur local pour analyser votre machine.
          </div>
        </div>
      )}

      {/* Scan button */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Analyse Système</h3>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">Get-CimInstance Win32_OperatingSystem, Win32_Processor, Win32_LogicalDisk</p>
          </div>
          <button onClick={handleScan} disabled={scanning || !isConnected} className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all", scanning ? "bg-muted text-muted-foreground cursor-not-allowed" : !isConnected ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50" : "bg-neon-blue/10 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/20")}>
            {scanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyse...</> : <><RefreshCw className="w-4 h-4" /> Analyser le système</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-neon-red/30 bg-neon-red/5 p-4 text-sm text-neon-red font-mono">{error}</div>
      )}

      {/* KPIs - only with data */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="OS" value={String(osInfo?.Caption || "--").replace("Microsoft ", "")} subtitle={`Build ${osInfo?.BuildNumber || "--"}`} icon={Monitor} glow="blue" />
          <KpiCard title="Processeur" value={String(cpuInfo?.Name || "--").split(" ").slice(-2).join(" ")} subtitle={cpuInfo ? `${cpuInfo.NumberOfCores}C / ${cpuInfo.NumberOfLogicalProcessors}T` : "--"} icon={Cpu} glow="cyan" />
          <KpiCard title="Mémoire RAM" value={totalRamGB} subtitle={ramSpeed} icon={MemoryStick} glow="green" />
          <KpiCard title="Stockage" value={disks.length > 0 ? formatBytes(Number(disks[0].Size)) : "--"} subtitle={disks.length > 0 ? `${Math.round((Number(disks[0].FreeSpace) / Number(disks[0].Size)) * 100)}% libre` : "--"} icon={HardDrive} glow="orange" />
        </div>
      )}

      {/* No data state */}
      {!data && !scanning && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Monitor className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-foreground font-semibold mb-1">Aucune donnée système</h3>
          <p className="text-sm text-muted-foreground font-mono">Lancez une analyse pour afficher les informations matérielles de votre machine</p>
        </div>
      )}

      {/* Sections */}
      {data && sections.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sections.map(section => (
            <div key={section.title} className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <section.icon className="w-4 h-4 text-neon-blue" />
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.items.map((item, i) => (
                  <div key={`${item.label}-${i}`} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-1/30 border border-border/50">
                    <span className="text-xs text-muted-foreground font-mono">{item.label}</span>
                    <span className={cn("text-xs font-mono font-medium", item.color)}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
