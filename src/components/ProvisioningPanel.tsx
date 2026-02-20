import { useState } from "react";
import { Download, Trash2, RefreshCw, CheckCircle2, XCircle, Loader2, AlertCircle, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { TerminalBlock } from "./TerminalBlock";
import { installPackage, uninstallPackage, upgradePackage, upgradeAll, fetchUpdates, SSEEventType } from "@/lib/winget-api";
import { useServer } from "@/contexts/ServerContext";
import { useEffect } from "react";

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
  { id: "7zip.7zip", name: "7-Zip" },
  { id: "VideoLAN.VLC", name: "VLC" },
];

const MOCK_UPDATES = [
  { id: "Git.Git", name: "Git", version: "2.47.1", available: "2.48.0" },
  { id: "OpenJS.NodeJS.LTS", name: "Node.js LTS", version: "20.18.1", available: "22.13.0" },
  { id: "Microsoft.PowerShell", name: "PowerShell 7", version: "7.4.7.0", available: "7.5.0" },
  { id: "Docker.DockerDesktop", name: "Docker Desktop", version: "4.37.1", available: "4.38.0" },
  { id: "Postman.Postman", name: "Postman", version: "11.28.4", available: "11.29.0" },
  { id: "WinSCP.WinSCP", name: "WinSCP", version: "6.3.6", available: "6.4.0" },
  { id: "Zoom.Zoom", name: "Zoom", version: "6.3.11", available: "6.4.0" },
];

interface UpdateApp {
  id: string;
  name: string;
  version: string;
  available: string | null;
}

export function ProvisioningPanel({ mode }: { mode: Mode }) {
  const { isConnected } = useServer();
  const [packageId, setPackageId] = useState("");
  const [logs, setLogs] = useState<{ type: SSEEventType | "comment"; text: string }[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());
  const [updates, setUpdates] = useState<UpdateApp[]>(MOCK_UPDATES);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [updateStatuses, setUpdateStatuses] = useState<Record<string, "idle" | "running" | "success" | "error">>({});

  useEffect(() => {
    if (mode === "update" && isConnected) {
      setLoadingUpdates(true);
      fetchUpdates()
        .then(data => setUpdates(data.updates as UpdateApp[]))
        .catch(() => setUpdates(MOCK_UPDATES))
        .finally(() => setLoadingUpdates(false));
    } else if (mode === "update") {
      setUpdates(MOCK_UPDATES);
    }
  }, [mode, isConnected]);

  const buildCommand = (id: string) => {
    if (mode === "install") return `winget install --id ${id} --silent --accept-package-agreements --accept-source-agreements`;
    if (mode === "uninstall") return `winget uninstall --id ${id} --silent`;
    return `winget upgrade --id ${id} --silent --accept-package-agreements --accept-source-agreements`;
  };

  const addLog = (type: SSEEventType | "comment", text: string) => {
    setLogs(prev => [...prev, { type, text }]);
  };

  const handleExecute = (id?: string) => {
    const target = id || packageId.trim();
    if (!target) return;

    setStatus("running");
    setLogs([
      { type: "comment", text: `# ${mode === "install" ? "Installation" : mode === "uninstall" ? "Désinstallation" : "Mise à jour"} via winget` },
      { type: "cmd", text: buildCommand(target) },
    ]);

    if (!isConnected) {
      // Mode démo
      const demoSteps = [
        { type: "output" as const, text: "Connexion aux sources winget..." },
        { type: "output" as const, text: `Résolution du package ${target}...` },
        { type: "output" as const, text: "Téléchargement en cours..." },
        { type: "output" as const, text: "Vérification de la signature numérique..." },
        { type: "success" as const, text: `✓ ${target} ${mode === "uninstall" ? "désinstallé" : "installé"} avec succès` },
      ];
      demoSteps.forEach((step, i) => {
        setTimeout(() => {
          addLog(step.type, step.text);
          if (i === demoSteps.length - 1) setStatus("success");
        }, (i + 1) * 700);
      });
      return;
    }

    const onEvent = (type: SSEEventType, data: string) => {
      if (type === "cmd") return; // already shown
      addLog(type, data);
      if (type === "success") setStatus("success");
      if (type === "error") setStatus("error");
    };

    if (mode === "install") installPackage(target, onEvent);
    else if (mode === "uninstall") uninstallPackage(target, onEvent);
    else upgradePackage(target, onEvent);
  };

  const handleUpdateOne = (app: UpdateApp) => {
    setUpdateStatuses(prev => ({ ...prev, [app.id]: "running" }));

    if (!isConnected) {
      setTimeout(() => {
        setUpdateStatuses(prev => ({ ...prev, [app.id]: "success" }));
      }, 3000);
      return;
    }

    upgradePackage(app.id, (type, _) => {
      if (type === "success") setUpdateStatuses(prev => ({ ...prev, [app.id]: "success" }));
      if (type === "error") setUpdateStatuses(prev => ({ ...prev, [app.id]: "error" }));
    });
  };

  const handleUpdateAll = () => {
    setStatus("running");
    setLogs([
      { type: "comment", text: "# Mise à jour de toutes les applications" },
      { type: "cmd", text: "winget upgrade --all --silent --accept-package-agreements --accept-source-agreements" },
    ]);
    selectedUpdates.forEach(id => {
      setUpdateStatuses(prev => ({ ...prev, [id]: "running" }));
    });

    if (!isConnected) {
      setTimeout(() => {
        setStatus("success");
        addLog("success", `✓ ${selectedUpdates.size} application(s) mise(s) à jour`);
        selectedUpdates.forEach(id => setUpdateStatuses(prev => ({ ...prev, [id]: "success" })));
      }, 4000);
      return;
    }

    upgradeAll((type: SSEEventType, data: string) => {
      addLog(type, data);
      if (type === "success") {
        setStatus("success");
        selectedUpdates.forEach(id => setUpdateStatuses(prev => ({ ...prev, [id]: "success" })));
      }
      if (type === "error") setStatus("error");
    });
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
      {/* Server warning */}
      {!isConnected && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neon-orange/30 bg-neon-orange/5">
          <WifiOff className="w-4 h-4 text-neon-orange flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="text-neon-orange font-medium">Mode démo</span> — Les commandes sont simulées. Lancez <code className="font-mono text-xs bg-surface-2 px-1 rounded">cd server && npm start</code> pour les vraies opérations winget.
          </div>
        </div>
      )}

      {mode === "update" ? (
        /* Update mode */
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-surface-2 border-b border-border">
              <span className="text-sm font-medium text-foreground">
                {loadingUpdates ? "Chargement..." : `${updates.length} mises à jour disponibles`}
              </span>
              {selectedUpdates.size > 0 && (
                <button
                  onClick={handleUpdateAll}
                  disabled={status === "running"}
                  className="flex items-center gap-2 px-4 py-1.5 bg-neon-orange/10 text-neon-orange border border-neon-orange/30 rounded-lg text-xs font-medium hover:bg-neon-orange/20 transition-all"
                >
                  <RefreshCw className={cn("w-3 h-3", status === "running" && "animate-spin")} />
                  Tout mettre à jour ({selectedUpdates.size})
                </button>
              )}
            </div>
            <div className="divide-y divide-border/50">
              {updates.map(app => {
                const s = updateStatuses[app.id] || "idle";
                return (
                  <div key={app.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-surface-1 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedUpdates.has(app.id)}
                      onChange={() => toggleUpdate(app.id)}
                      className="w-4 h-4 accent-neon-orange rounded"
                      disabled={s !== "idle"}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{app.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{app.id}</div>
                    </div>
                    <div className="text-right mr-2">
                      <div className="font-mono text-xs text-muted-foreground line-through">{app.version}</div>
                      <div className="font-mono text-xs text-neon-orange font-bold">→ {app.available}</div>
                    </div>
                    {s === "idle" && (
                      <button
                        onClick={() => handleUpdateOne(app)}
                        className="p-1.5 rounded-lg bg-neon-orange/10 text-neon-orange border border-neon-orange/30 hover:bg-neon-orange/20 transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {s === "running" && <Loader2 className="w-4 h-4 text-neon-orange animate-spin" />}
                    {s === "success" && <CheckCircle2 className="w-4 h-4 text-neon-green" />}
                    {s === "error" && <XCircle className="w-4 h-4 text-neon-red" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upgrade all command */}
          {logs.length > 0 && (
            <TerminalBlock
              title="winget upgrade --all"
              lines={logs.map(l => ({ type: (l.type === "cmd" ? "command" : l.type) as "command" | "output" | "success" | "error" | "info" | "comment", text: l.text }))}
            />
          )}
        </div>
      ) : (
        /* Install/Uninstall mode */
        <div className="space-y-4">
          {mode === "install" && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Applications populaires</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_APPS.map(app => (
                  <button
                    key={app.id}
                    onClick={() => { setPackageId(app.id); setStatus("idle"); setLogs([]); }}
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

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={packageId}
                onChange={e => { setPackageId(e.target.value); setStatus("idle"); setLogs([]); }}
                placeholder={cfg.placeholder}
                className="w-full pl-9 pr-4 py-2.5 bg-surface-1 border border-border rounded-xl text-sm font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/30 transition-colors"
              />
            </div>
            <button
              onClick={() => handleExecute()}
              disabled={!packageId.trim() || status === "running"}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap",
                mode === "install"
                  ? "bg-neon-green/10 text-neon-green border border-neon-green/30 hover:bg-neon-green/20"
                  : "bg-neon-red/10 text-neon-red border border-neon-red/30 hover:bg-neon-red/20"
              )}
            >
              {status === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
              {cfg.verb}
            </button>
          </div>

          {/* Live terminal */}
          {(packageId || logs.length > 0) && (
            <TerminalBlock
              title={`winget ${mode}`}
              lines={[
                ...(packageId && logs.length === 0 ? [
                  { type: "comment" as const, text: `# ${cfg.label} via winget${!isConnected ? " (mode démo)" : ""}` },
                  { type: "command" as const, text: buildCommand(packageId) },
                ] : []),
                ...logs.map(l => ({
                  type: (l.type === "cmd" ? "command" : l.type) as "command" | "output" | "success" | "error" | "info" | "comment",
                  text: l.text,
                })),
              ]}
            />
          )}

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
          {mode === "uninstall" && packageId && status === "idle" && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-neon-orange/30 bg-neon-orange/5">
              <AlertCircle className="w-4 h-4 text-neon-orange flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground font-mono">
                <span className="text-neon-orange font-medium">Attention :</span> La désinstallation est irréversible.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
