import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Search,
  Download,
  Trash2,
  RefreshCw,
  FileText,
  Settings,
  ChevronRight,
  Wifi,
  Terminal,
} from "lucide-react";

export type PageId = "dashboard" | "inventory" | "discovery" | "install" | "uninstall" | "updates" | "scan" | "report";

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ElementType;
  badge?: number;
  color?: string;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, color: "neon-blue" },
  { id: "inventory", label: "Inventaire", icon: Package, badge: 142, color: "neon-cyan" },
  { id: "discovery", label: "Discovery Mode", icon: Search, color: "neon-cyan" },
  { id: "install", label: "Installation", icon: Download, color: "neon-green" },
  { id: "uninstall", label: "Désinstallation", icon: Trash2, color: "neon-red" },
  { id: "updates", label: "Mises à jour", icon: RefreshCw, badge: 7, color: "neon-orange" },
  { id: "scan", label: "Scan Système", icon: Terminal, color: "neon-blue" },
  { id: "report", label: "Rapport HTML", icon: FileText, color: "neon-cyan" },
];

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
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

      {/* Status indicator */}
      <div className="mx-4 my-3 px-3 py-2 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-neon-green pulse-dot" />
        <span className="text-xs font-mono text-neon-green">winget connecté</span>
        <Wifi className="w-3 h-3 text-neon-green ml-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
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
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActive
                  ? cn("border", activeColor)
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
              )}
            >
              <Icon className={cn(
                "w-4 h-4 flex-shrink-0 transition-colors",
                isActive ? "" : "group-hover:text-foreground"
              )} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-mono font-bold",
                  item.color === "neon-orange"
                    ? "bg-neon-orange/20 text-neon-orange"
                    : "bg-neon-cyan/20 text-neon-cyan"
                )}>
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight className="w-3 h-3 flex-shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-2 px-2">
          <div className="w-7 h-7 rounded-full bg-surface-2 border border-border flex items-center justify-center">
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
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
