import { FileText, Clock, CheckCircle2, AlertTriangle, Download, Trash2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface LogEntry {
  id: string;
  timestamp: string;
  action: "install" | "uninstall" | "update" | "scan";
  target: string;
  status: "success" | "error" | "warning";
  details: string;
}

const demoLogs: LogEntry[] = [
  { id: "1", timestamp: "2025-06-20 14:32:01", action: "install", target: "Google.Chrome", status: "success", details: "Installation réussie v126.0" },
  { id: "2", timestamp: "2025-06-20 14:28:15", action: "update", target: "Microsoft.VSCode", status: "success", details: "Mise à jour 1.90.0 → 1.91.0" },
  { id: "3", timestamp: "2025-06-20 14:25:00", action: "scan", target: "Système complet", status: "success", details: "142 apps, 7 mises à jour" },
  { id: "4", timestamp: "2025-06-20 13:15:22", action: "uninstall", target: "7zip.7zip", status: "success", details: "Désinstallation terminée" },
  { id: "5", timestamp: "2025-06-19 10:00:00", action: "install", target: "Python.Python.3.12", status: "error", details: "Échec: accès refusé" },
  { id: "6", timestamp: "2025-06-19 09:45:30", action: "update", target: "Git.Git", status: "warning", details: "Redémarrage recommandé" },
];

const actionIcons = { install: Download, uninstall: Trash2, update: RefreshCw, scan: FileText };
const actionLabels = { install: "Installation", uninstall: "Désinstallation", update: "Mise à jour", scan: "Scan" };
const statusColors = { success: "text-neon-green", error: "text-neon-red", warning: "text-neon-orange" };

export function LogsPage() {
  const [logs] = useState<LogEntry[]>(demoLogs);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 bg-surface-2 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-neon-cyan" />
            Journal des opérations
          </span>
          <span className="text-xs font-mono text-muted-foreground">{logs.length} entrées</span>
        </div>
        <div className="divide-y divide-border/50">
          {logs.map(log => {
            const Icon = actionIcons[log.action];
            return (
              <div key={log.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-1/30 transition-colors">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", log.status === "success" ? "bg-neon-green/10 border-neon-green/30" : log.status === "error" ? "bg-neon-red/10 border-neon-red/30" : "bg-neon-orange/10 border-neon-orange/30")}>
                  <Icon className={cn("w-4 h-4", statusColors[log.status])} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{actionLabels[log.action]}</span>
                    <span className="text-xs font-mono text-neon-cyan">{log.target}</span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">{log.details}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-mono text-muted-foreground">{log.timestamp}</span>
                </div>
                {log.status === "success" ? <CheckCircle2 className="w-4 h-4 text-neon-green" /> : log.status === "error" ? <AlertTriangle className="w-4 h-4 text-neon-red" /> : <AlertTriangle className="w-4 h-4 text-neon-orange" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
