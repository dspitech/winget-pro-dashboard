import heroImg from "@/assets/hero-bg.jpg";
import { MOCK_APPS } from "./InventoryTable";
import { KpiCard } from "./KpiCard";
import { TerminalBlock } from "./TerminalBlock";
import { InventoryTable } from "./InventoryTable";
import { Package, RefreshCw, CheckCircle2, AlertTriangle, Monitor, Clock, ExternalLink } from "lucide-react";

const upToDate = MOCK_APPS.filter(a => a.status === "up-to-date").length;
const updates = MOCK_APPS.filter(a => a.status === "update-available").length;

export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative rounded-2xl overflow-hidden h-44 border border-border">
        <img src={heroImg} alt="Windows WinGet Dashboard" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-center px-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-neon-green pulse-dot" />
            <span className="text-xs font-mono text-neon-green uppercase tracking-widest">Système opérationnel</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">WinGet Admin Console</h1>
          <p className="text-muted-foreground text-sm mt-1 font-mono">
            Dynamic Provisioning Engine · Windows 11 Pro · PowerShell 7.5
          </p>
        </div>
        <div className="absolute right-6 bottom-4 top-4 hidden md:flex flex-col justify-center items-end gap-1.5">
          <div className="font-mono text-xs text-muted-foreground/60">
            <span className="text-neon-blue">winget</span> --version
          </div>
          <div className="font-mono text-sm text-neon-cyan">v1.9.25200</div>
          <div className="font-mono text-xs text-muted-foreground/60 mt-1">
            <span className="text-neon-blue">hostname</span>
          </div>
          <div className="font-mono text-sm text-foreground">WORKSTATION-01</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Applications installées"
          value={MOCK_APPS.length}
          subtitle="via winget list"
          icon={Package}
          glow="blue"
          trend={{ value: "+3 ce mois", positive: true }}
        />
        <KpiCard
          title="À jour"
          value={upToDate}
          subtitle={`${Math.round((upToDate / MOCK_APPS.length) * 100)}% du parc`}
          icon={CheckCircle2}
          glow="green"
        />
        <KpiCard
          title="Mises à jour"
          value={updates}
          subtitle="disponibles"
          icon={RefreshCw}
          glow="orange"
          trend={{ value: "Action requise", positive: false }}
        />
        <KpiCard
          title="Dernier scan"
          value="14:32"
          subtitle="Aujourd'hui · 02/20/2026"
          icon={Clock}
          glow="cyan"
        />
      </div>

      {/* System info + Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* System info */}
        <div className="lg:col-span-1 rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Monitor className="w-4 h-4 text-neon-blue" />
            <h3 className="text-sm font-semibold text-foreground">Informations système</h3>
          </div>
          {[
            { label: "OS", value: "Windows 11 Pro 24H2", color: "text-neon-blue" },
            { label: "PowerShell", value: "7.5.0 (Core)", color: "text-neon-cyan" },
            { label: "Winget", value: "1.9.25200", color: "text-neon-green" },
            { label: "Sources", value: "winget, msstore", color: "text-foreground" },
            { label: "Utilisateur", value: "LO Pape (Admin)", color: "text-neon-orange" },
            { label: "Architecture", value: "x64 AMD64", color: "text-foreground" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
              <span className="text-xs text-muted-foreground font-mono">{item.label}</span>
              <span className={`text-xs font-mono font-medium ${item.color}`}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Terminal */}
        <div className="lg:col-span-2">
          <TerminalBlock
            title="winget list — Dernière exécution"
            lines={[
              { type: "comment", text: "# Dynamic Winget Provisioning Engine v2.6" },
              { type: "command", text: "winget list --accept-source-agreements" },
              { type: "output", text: "Nom                                   Id                                   Version" },
              { type: "output", text: "--------------------------------------------------------------" },
              { type: "output", text: "7-Zip 24.09 (x64)                      7zip.7zip                            24.09.00.0" },
              { type: "output", text: "Git                                    Git.Git                              2.47.1" },
              { type: "output", text: "Microsoft Visual Studio Code           Microsoft.VisualStudioCode           1.96.2" },
              { type: "output", text: "Node.js                                OpenJS.NodeJS.LTS                    20.18.1      22.13.0" },
              { type: "output", text: "..." },
              { type: "success", text: "142 paquets listés · 7 mises à jour disponibles" },
              { type: "comment", text: "# Génération du rapport HTML..." },
              { type: "success", text: "Inventory_Dashboard.html généré avec succès." },
            ]}
          />
        </div>
      </div>

      {/* Inventory quick view */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-neon-cyan" />
            Inventaire rapide
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-neon-cyan hover:text-neon-blue cursor-pointer transition-colors font-mono">
            <ExternalLink className="w-3 h-3" />
            Voir tout
          </div>
        </div>
        <InventoryTable />
      </div>
    </div>
  );
}
