import { FileText, Clock, CheckCircle2, AlertTriangle, Download, Trash2, RefreshCw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";

export interface LogEntry {
  id: string;
  timestamp: string;
  action: "install" | "uninstall" | "update" | "scan";
  target: string;
  status: "success" | "error" | "warning";
  details: string;
}

const LOGS_STORAGE_KEY = "winget-operation-logs";

const actionIcons = { install: Download, uninstall: Trash2, update: RefreshCw, scan: FileText };
const actionLabels = { install: "Installation", uninstall: "Désinstallation", update: "Mise à jour", scan: "Scan" };
const statusColors = { success: "text-neon-green", error: "text-neon-red", warning: "text-neon-orange" };

// Global function to add logs from other components
export function addOperationLog(entry: Omit<LogEntry, "id" | "timestamp">) {
  try {
    const stored = localStorage.getItem(LOGS_STORAGE_KEY);
    const logs: LogEntry[] = stored ? JSON.parse(stored) : [];
    const newLog: LogEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    // Keep max 100 logs
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, 100)));
  } catch (err) {
    console.error("Erreur sauvegarde log:", err);
  }
}

export function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOGS_STORAGE_KEY);
      if (stored) {
        setLogs(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Erreur chargement logs:", err);
    }
  }, []);

  const clearLogs = useCallback(() => {
    localStorage.removeItem(LOGS_STORAGE_KEY);
    setLogs([]);
  }, []);

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch { return ts; }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 bg-surface-2 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-neon-cyan" />
            Journal des opérations
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">{logs.length} entrées</span>
            {logs.length > 0 && (
              <button onClick={clearLogs} className="text-xs font-mono text-neon-red/70 hover:text-neon-red transition-colors">Effacer</button>
            )}
          </div>
        </div>
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-foreground font-semibold mb-1">Aucun historique</h3>
            <p className="text-sm text-muted-foreground font-mono">Les opérations winget (installations, mises à jour, scans) apparaîtront ici</p>
          </div>
        ) : (
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
                    <span className="text-xs font-mono text-muted-foreground">{formatTimestamp(log.timestamp)}</span>
                  </div>
                  {log.status === "success" ? <CheckCircle2 className="w-4 h-4 text-neon-green" /> : log.status === "error" ? <AlertTriangle className="w-4 h-4 text-neon-red" /> : <AlertTriangle className="w-4 h-4 text-neon-orange" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
