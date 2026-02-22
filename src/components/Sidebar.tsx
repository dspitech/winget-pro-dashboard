import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, Search, Download, Trash2, RefreshCw, FileText,
  Settings, ChevronRight, Wifi, WifiOff, Loader2, Terminal, Network, Monitor,
  ClipboardList, Cpu,
} from "lucide-react";
import { useServer } from "@/contexts/ServerContext";

export type PageId = "dashboard" | "inventory" | "discovery" | "install" | "uninstall" | "updates" | "scan" | "report" | "network" | "system" | "logs" | "settings";

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ElementType;
  badge?: number;
  color?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Général",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, color: "neon-blue" },
      { id: "inventory", label: "Inventaire", icon: Package, color: "neon-cyan" },
      { id: "discovery", label: "Discovery Mode", icon: Search, color: "neon-cyan" },
    ],
  },
  {
    title: "Actions Winget",
    items: [
      { id: "install", label: "Installation", icon: Download, color: "neon-green" },
      { id: "uninstall", label: "Désinstallation", icon: Trash2, color: "neon-red" },
      { id: "updates", label: "Mises à jour", icon: RefreshCw, color: "neon-orange" },
      { id: "scan", label: "Scan Système", icon: Terminal, color: "neon-blue" },
    ],
  },
  {
    title: "Machine",
    items: [
      { id: "system", label: "Infos Système", icon: Cpu, color: "neon-cyan" },
      { id: "network", label: "Réseau", icon: Network, color: "neon-blue" },
    ],
  },
  {
    title: "Outils",
    items: [
      { id: "logs", label: "Historique", icon: ClipboardList, color: "neon-orange" },
      { id: "report", label: "Rapport HTML", icon: FileText, color: "neon-cyan" },
      { id: "settings", label: "Paramètres", icon: Settings, color: "neon-blue" },
    ],
  },
];

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { status, isConnected, isChecking, recheck } = useServer();

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-blue border border-neon-blue/30 glow-blue">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-neon-blue" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.549H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
          </svg>
        </div>
        <div>
          <div className="text-sm font-bold text-foreground tracking-wide">WinGet</div>
          <div className="text-xs text-muted-foreground font-mono">Admin Console v2.6</div>
        </div>
      </div>

      {/* Server connection */}
      <button
        onClick={recheck}
        className={cn(
          "mx-4 my-3 px-3 py-2 rounded-lg flex items-center gap-2 transition-all hover:opacity-80 text-left",
          isChecking ? "bg-neon-blue/10 border border-neon-blue/20" : isConnected ? "bg-neon-green/10 border border-neon-green/20" : "bg-neon-red/10 border border-neon-red/20"
        )}
      >
        {isChecking ? <Loader2 className="w-3 h-3 text-neon-blue animate-spin flex-shrink-0" /> : isConnected ? <Wifi className="w-3 h-3 text-neon-green flex-shrink-0" /> : <WifiOff className="w-3 h-3 text-neon-red flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className={cn("text-xs font-mono font-medium truncate", isChecking ? "text-neon-blue" : isConnected ? "text-neon-green" : "text-neon-red")}>
            {isChecking ? "Connexion..." : isConnected ? `PC connecté · ${status?.hostname || "local"}` : "Mode démo (serveur off)"}
          </div>
          {isConnected && status?.wingetVersion && <div className="text-[10px] text-muted-foreground font-mono truncate">winget {status.wingetVersion} · {status.user}</div>}
          {!isConnected && !isChecking && <div className="text-[10px] text-muted-foreground font-mono">Cliquer pour réessayer</div>}
        </div>
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-1 overflow-y-auto space-y-4">
        {navSections.map(section => (
          <div key={section.title}>
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-mono font-bold">{section.title}</div>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                const colorMap: Record<string, string> = {
                  "neon-blue": "text-neon-blue border-neon-blue/30 bg-neon-blue/10",
                  "neon-cyan": "text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10",
                  "neon-green": "text-neon-green border-neon-green/30 bg-neon-green/10",
                  "neon-orange": "text-neon-orange border-neon-orange/30 bg-neon-orange/10",
                  "neon-red": "text-neon-red border-neon-red/30 bg-neon-red/10",
                };
                const activeColor = colorMap[item.color || "neon-blue"];

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
                      isActive ? cn("border", activeColor) : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 flex-shrink-0 transition-colors", isActive ? "" : "group-hover:text-foreground")} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isActive && <ChevronRight className="w-3 h-3 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-2 px-2">
          <div className="w-7 h-7 rounded-full bg-surface-2 border border-border flex items-center justify-center">
            <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <div className="text-xs font-medium text-foreground">LO Pape</div>
            <div className="text-[10px] text-muted-foreground font-mono">dspitech · Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
