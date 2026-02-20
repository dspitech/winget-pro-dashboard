import { useState } from "react";
import { Sidebar, PageId } from "@/components/Sidebar";
import { DashboardPage } from "@/components/DashboardPage";
import { InventoryTable } from "@/components/InventoryTable";
import { DiscoveryMode } from "@/components/DiscoveryMode";
import { ProvisioningPanel } from "@/components/ProvisioningPanel";
import { ScanPanel } from "@/components/ScanPanel";
import { ReportPage } from "@/components/ReportPage";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const pageTitle: Record<PageId, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Vue d'ensemble du parc applicatif" },
  inventory: { title: "Inventaire", subtitle: "Toutes les applications installées via winget" },
  discovery: { title: "Discovery Mode", subtitle: "Rechercher et installer des applications winget" },
  install: { title: "Installation", subtitle: "Installer des applications via winget" },
  uninstall: { title: "Désinstallation", subtitle: "Supprimer des applications du système" },
  updates: { title: "Mises à jour", subtitle: "Mettre à jour les applications installées" },
  scan: { title: "Scan Système", subtitle: "Analyser le poste de travail Windows" },
  report: { title: "Rapport HTML", subtitle: "Générer et exporter l'inventaire au format HTML" },
};

const Index = () => {
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  const page = pageTitle[activePage];

  const handleNavigate = (p: PageId) => {
    setActivePage(p);
    setMobileOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:relative lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <Sidebar activePage={activePage} onNavigate={handleNavigate} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground truncate">{page.title}</h1>
            <p className="text-xs text-muted-foreground font-mono truncate">{page.subtitle}</p>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green pulse-dot" />
            <span>winget v1.9.25200</span>
            <span className="text-border">·</span>
            <span className="text-foreground/60">PowerShell 7.5</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto grid-bg">
          <div className="max-w-7xl mx-auto w-full">
            {activePage === "dashboard" && <DashboardPage />}
            {activePage === "inventory" && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground font-mono">
                  <span className="text-neon-blue">winget list</span> --accept-source-agreements
                </div>
                <InventoryTable />
              </div>
            )}
            {activePage === "discovery" && <DiscoveryMode />}
            {activePage === "install" && <ProvisioningPanel mode="install" />}
            {activePage === "uninstall" && <ProvisioningPanel mode="uninstall" />}
            {activePage === "updates" && <ProvisioningPanel mode="update" />}
            {activePage === "scan" && <ScanPanel />}
            {activePage === "report" && <ReportPage />}
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-2.5 border-t border-border bg-card/30 flex items-center justify-between">
          <div className="text-xs font-mono text-muted-foreground">
            WinGet Admin Console · by <span className="text-neon-blue">LO Pape / dspitech</span> · 2025-2026
          </div>
          <a
            href="https://github.com/dspitech/Winget-inventory-report"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-muted-foreground hover:text-neon-blue transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </a>
        </footer>
      </div>
    </div>
  );
};

export default Index;
