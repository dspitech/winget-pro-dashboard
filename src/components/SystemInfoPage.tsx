import { Monitor, Cpu, MemoryStick, HardDrive, Layers, Shield, Server, Clock } from "lucide-react";
import { useServer } from "@/contexts/ServerContext";
import { cn } from "@/lib/utils";
import { KpiCard } from "./KpiCard";

export function SystemInfoPage() {
  const { status, isConnected } = useServer();

  const sections = [
    { title: "Système d'exploitation", icon: Layers, items: [
      { label: "OS", value: status?.platform || "Windows 11 Pro", color: "text-neon-blue" },
      { label: "Version", value: "23H2 (Build 22631)", color: "text-neon-cyan" },
      { label: "Architecture", value: "x64", color: "text-neon-green" },
      { label: "Nom machine", value: status?.hostname || "WORKSTATION", color: "text-foreground" },
      { label: "Domaine", value: "WORKGROUP", color: "text-neon-orange" },
    ]},
    { title: "Processeur", icon: Cpu, items: [
      { label: "CPU", value: "Intel Core i7-12700H", color: "text-neon-cyan" },
      { label: "Cœurs / Threads", value: "14C / 20T", color: "text-neon-blue" },
      { label: "Fréquence max", value: "4.70 GHz", color: "text-neon-green" },
      { label: "Cache L3", value: "24 MB", color: "text-neon-orange" },
    ]},
    { title: "Mémoire", icon: MemoryStick, items: [
      { label: "RAM totale", value: "32 GB DDR5", color: "text-neon-cyan" },
      { label: "Vitesse", value: "4800 MHz", color: "text-neon-blue" },
      { label: "Slots utilisés", value: "2/2", color: "text-neon-orange" },
      { label: "Utilisation", value: "58%", color: "text-neon-green" },
    ]},
    { title: "Stockage", icon: HardDrive, items: [
      { label: "Disque principal", value: "NVMe 512 GB SSD", color: "text-neon-cyan" },
      { label: "Espace libre", value: "186 GB (36%)", color: "text-neon-green" },
      { label: "Type partition", value: "GPT", color: "text-neon-blue" },
      { label: "Système fichiers", value: "NTFS", color: "text-neon-orange" },
    ]},
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="OS Version" value={status?.platform || "Windows 11"} subtitle="23H2" icon={Monitor} glow="blue" />
        <KpiCard title="Processeur" value="i7-12700H" subtitle="14C / 20T" icon={Cpu} glow="cyan" />
        <KpiCard title="Mémoire RAM" value="32 GB" subtitle="DDR5 4800MHz" icon={MemoryStick} glow="green" />
        <KpiCard title="Stockage" value="512 GB" subtitle="NVMe SSD" icon={HardDrive} glow="orange" />
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
