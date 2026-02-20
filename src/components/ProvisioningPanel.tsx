import { useState } from "react";
import { Download, Trash2, RefreshCw, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TerminalBlock } from "./TerminalBlock";

type Mode = "install" | "uninstall" | "update";

const POPULAR_APPS = [
  { id: "Microsoft.VisualStudioCode", name: "VS Code" },
  { id: "Git.Git", name: "Git" },
  { id: "Google.Chrome", name: "Chrome" },
  { id: "Docker.DockerDesktop", name: "Docker" },
  { id: "Python.Python.3.13", name: "Python 3.13" },
  { id: "Microsoft.WindowsTerminal", name: "Terminal" },
  { id: "Postman.Postman", name: "Postman" },
  { id: "Notepad++.Notepad++", name: "Notepad++" },
];

const UPDATE_CANDIDATES = [
  { id: "Git.Git", name: "Git", from: "2.47.1", to: "2.48.0" },
  { id: "OpenJS.NodeJS.LTS", name: "Node.js LTS", from: "20.18.1", to: "22.13.0" },
  { id: "Microsoft.PowerShell", name: "PowerShell 7", from: "7.4.7.0", to: "7.5.0" },
  { id: "Docker.DockerDesktop", name: "Docker Desktop", from: "4.37.1", to: "4.38.0" },
  { id: "Postman.Postman", name: "Postman", from: "11.28.4", to: "11.29.0" },
  { id: "WinSCP.WinSCP", name: "WinSCP", from: "6.3.6", to: "6.4.0" },
  { id: "Zoom.Zoom", name: "Zoom", from: "6.3.11", to: "6.4.0" },
];

export function ProvisioningPanel({ mode }: { mode: Mode }) {
  const [packageId, setPackageId] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [log, setLog] = useState<string[]>([]);
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());

  const buildCommand = (id: string) => {
    if (mode === "install") return `winget install --id ${id} --silent --accept-package-agreements --accept-source-agreements`;
    if (mode === "uninstall") return `winget uninstall --id ${id} --silent`;
    return `winget upgrade --id ${id} --silent --accept-package-agreements`;
  };

  const handleExecute = (id?: string) => {
    const target = id || packageId.trim();
    if (!target) return;
    setStatus("running");
    setLog([`> ${buildCommand(target)}`, "Connexion aux sources winget...", "Résolution du package..."]);
    
    setTimeout(() => {
      setLog(prev => [...prev, "Téléchargement en cours..."]);
    }, 1000);
    setTimeout(() => {
      const ok = Math.random() > 0.1;
      setStatus(ok ? "success" : "error");
      setLog(prev => [...prev,
        ok ? `✓ ${mode === "install" ? "Installation" : mode === "uninstall" ? "Désinstallation" : "Mise à jour"} réussie.` : "✗ Erreur: package introuvable ou droits insuffisants.",
      ]);
    }, 3000);
  };

  const handleUpdateAll = () => {
    setStatus("running");
    const ids = [...selectedUpdates];
    setLog([`> winget upgrade --all --silent --accept-package-agreements`, `Mise à jour de ${ids.length} package(s)...`]);
    setTimeout(() => {
      setStatus("success");
      setLog(prev => [...prev, `✓ ${ids.length} application(s) mise(s) à jour avec succès.`]);
    }, 4000);
  };

  const toggleUpdate = (id: string) => {
    setSelectedUpdates(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const modeConfig = {
    install: { icon: Download, color: "neon-green", label: "Installation", placeholder: "ex: Microsoft.VisualStudioCode", verb: "Installer" },
    uninstall: { icon: Trash2, color: "neon-red", label: "Désinstallation", placeholder: "ex: Mozilla.Firefox", verb: "Désinstaller" },
    update: { icon: RefreshCw, color: "neon-orange", label: "Mise à jour", placeholder: "ex: Git.Git", verb: "Mettre à jour" },
  };

  const cfg = modeConfig[mode];
  const Icon = cfg.icon;

  return (
    <div className="space-y-6">
      {mode === "update" ? (
        /* Update mode: show list */
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-surface-2 border-b border-border">
              <span className="text-sm font-medium text-foreground">{UPDATE_CANDIDATES.length} mises à jour disponibles</span>
              {selectedUpdates.size > 0 && (
                <button
                  onClick={handleUpdateAll}
                  disabled={status === "running"}
                  className="flex items-center gap-2 px-4 py-1.5 bg-neon-orange/10 text-neon-orange border border-neon-orange/30 rounded-lg text-xs font-medium hover:bg-neon-orange/20 transition-all"
                >
                  <RefreshCw className={cn("w-3 h-3", status === "running" && "animate-spin")} />
                  Mettre à jour {selectedUpdates.size} app{selectedUpdates.size > 1 ? "s" : ""}
                </button>
              )}
            </div>
            <div className="divide-y divide-border/50">
              {UPDATE_CANDIDATES.map(app => (
                <div key={app.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-surface-1 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedUpdates.has(app.id)}
                    onChange={() => toggleUpdate(app.id)}
                    className="w-4 h-4 accent-neon-orange rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{app.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{app.id}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs text-muted-foreground line-through">{app.from}</div>
                    <div className="font-mono text-xs text-neon-orange font-bold">→ {app.to}</div>
                  </div>
                  <button
                    onClick={() => handleExecute(app.id)}
                    className="px-3 py-1.5 bg-neon-orange/10 text-neon-orange border border-neon-orange/30 rounded-lg text-xs font-medium hover:bg-neon-orange/20 transition-all"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Install/Uninstall mode */
        <div className="space-y-4">
          {/* Quick select for install */}
          {mode === "install" && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Applications populaires</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_APPS.map(app => (
                  <button
                    key={app.id}
                    onClick={() => { setPackageId(app.id); setStatus("idle"); setLog([]); }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      packageId === app.id
                        ? "bg-neon-green/20 text-neon-green border-neon-green/40"
                        : "bg-surface-1 text-muted-foreground border-border hover:text-foreground hover:border-neon-green/30"
                    )}
                  >
                    {app.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={packageId}
                onChange={e => { setPackageId(e.target.value); setStatus("idle"); setLog([]); }}
                placeholder={cfg.placeholder}
                className="w-full pl-9 pr-4 py-2.5 bg-surface-1 border border-border rounded-xl text-sm font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/30 transition-colors"
              />
            </div>
            <button
              onClick={() => handleExecute()}
              disabled={!packageId.trim() || status === "running"}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed",
                mode === "install" ? "bg-neon-green/10 text-neon-green border border-neon-green/30 hover:bg-neon-green/20" :
                "bg-neon-red/10 text-neon-red border border-neon-red/30 hover:bg-neon-red/20"
              )}
            >
              {status === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
              {cfg.verb}
            </button>
          </div>
        </div>
      )}

      {/* Command preview */}
      {packageId && (
        <TerminalBlock
          title={`winget ${mode}`}
          lines={[
            { type: "comment", text: `# ${cfg.label} via winget` },
            { type: "command", text: buildCommand(packageId) },
            ...log.map(line => ({
              type: (line.startsWith("✓") ? "success" : line.startsWith("✗") ? "error" : line.startsWith(">") ? "command" : "output") as "success" | "error" | "command" | "output",
              text: line.startsWith(">") ? line.slice(2) : line,
            })),
          ]}
        />
      )}

      {/* Status badge */}
      {status === "success" && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-neon-green/30 bg-neon-green/5 fade-in-up">
          <CheckCircle2 className="w-5 h-5 text-neon-green" />
          <span className="text-sm font-medium text-neon-green">{cfg.label} effectuée avec succès</span>
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-neon-red/30 bg-neon-red/5 fade-in-up">
          <XCircle className="w-5 h-5 text-neon-red" />
          <div>
            <div className="text-sm font-medium text-neon-red">Échec de l'opération</div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5">Vérifiez les droits administrateur et la connexion winget</div>
          </div>
        </div>
      )}

      {/* Warning */}
      {mode === "uninstall" && packageId && status === "idle" && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-neon-orange/30 bg-neon-orange/5">
          <AlertCircle className="w-4 h-4 text-neon-orange flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground font-mono">
            <span className="text-neon-orange font-medium">Attention :</span> La désinstallation est irréversible. Assurez-vous de cibler le bon package ID.
          </div>
        </div>
      )}
    </div>
  );
}
