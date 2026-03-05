import { FileText, Clock, CheckCircle2, AlertTriangle, Download, Trash2, RefreshCw, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export interface LogEntry {
  id: string;
  timestamp: string;
  action: "install" | "uninstall" | "update" | "scan";
  target: string;
  status: "success" | "error" | "warning";
  details: string;
}

const LOGS_STORAGE_KEY = "winget-operation-logs";

export function addLog(entry: Omit<LogEntry, "id" | "timestamp">) {
  try {
    const stored = localStorage.getItem(LOGS_STORAGE_KEY);
    const logs: LogEntry[] = stored ? JSON.parse(stored) : [];
    logs.unshift({
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    });
    // Garder max 200 entrées
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, 200)));
  } catch {}
}

const actionIcons = { install: Download, uninstall: Trash2, update: RefreshCw, scan: FileText };
const actionLabels = { install: "Installation", uninstall: "Désinstallation", update: "Mise à jour", scan: "Scan" };
const statusColors = { success: "text-neon-green", error: "text-neon-red", warning: "text-neon-orange" };

export function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOGS_STORAGE_KEY);
      if (stored) setLogs(JSON.parse(stored));
    } catch {}
  }, []);

  const clearLogs = () => {
    localStorage.removeItem(LOGS_STORAGE_KEY);
    setLogs([]);
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
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Inbox className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">Aucune opération enregistrée</p>
            <p className="text-xs font-mono mt-1">Les installations, désinstallations et scans apparaîtront ici.</p>
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
                    <span className="text-xs font-mono text-muted-foreground">{log.timestamp}</span>
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
