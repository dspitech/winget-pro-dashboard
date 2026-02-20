import { useState } from "react";
import { Play, Square, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScanStep {
  id: string;
  label: string;
  detail: string;
  status: "pending" | "running" | "done" | "warn";
  duration?: number;
}

const SCAN_STEPS_CONFIG: Omit<ScanStep, "status">[] = [
  { id: "init", label: "Initialisation winget", detail: "winget --version --accept-source-agreements", duration: 800 },
  { id: "sources", label: "Vérification des sources", detail: "winget source update", duration: 1500 },
  { id: "list", label: "Inventaire des applications", detail: "winget list --accept-source-agreements", duration: 2500 },
  { id: "registry", label: "Lecture du registre Windows", detail: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall", duration: 1200 },
  { id: "updates", label: "Détection des mises à jour", detail: "winget upgrade --include-unknown", duration: 2000 },
  { id: "report", label: "Génération du rapport HTML", detail: "New-Item -Path Inventory_Dashboard.html", duration: 1000 },
];

export function ScanPanel() {
  const [steps, setSteps] = useState<ScanStep[]>(
    SCAN_STEPS_CONFIG.map(s => ({ ...s, status: "pending" }))
  );
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);

  const handleScan = async () => {
    if (scanning) return;
    setScanning(true);
    setScanComplete(false);
    setCurrentStep(-1);
    const resetSteps = SCAN_STEPS_CONFIG.map(s => ({ ...s, status: "pending" as const }));
    setSteps(resetSteps);

    for (let i = 0; i < SCAN_STEPS_CONFIG.length; i++) {
      setCurrentStep(i);
      setSteps(prev => prev.map((s, idx) =>
        idx === i ? { ...s, status: "running" } : s
      ));
      await new Promise(r => setTimeout(r, SCAN_STEPS_CONFIG[i].duration));
      const status = Math.random() > 0.15 ? "done" : "warn";
      setSteps(prev => prev.map((s, idx) =>
        idx === i ? { ...s, status } : s
      ));
    }

    setScanning(false);
    setScanComplete(true);
    setCurrentStep(-1);
  };

  const doneCount = steps.filter(s => s.status === "done" || s.status === "warn").length;
  const progress = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="space-y-6">
      {/* Scan control */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Scan Système Winget</h3>
            <p className="text-sm text-muted-foreground mt-0.5 font-mono">
              Analyse complète du poste de travail Windows
            </p>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
              scanning
                ? "bg-neon-red/10 text-neon-red border border-neon-red/30 cursor-not-allowed"
                : "bg-neon-blue/10 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/20 hover:glow-blue"
            )}
          >
            {scanning ? (
              <><Square className="w-4 h-4" /> Scan en cours...</>
            ) : (
              <><Play className="w-4 h-4" /> Lancer le scan</>
            )}
          </button>
        </div>

        {/* Progress bar */}
        {(scanning || scanComplete) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>Progression</span>
              <span className={cn("font-bold", scanComplete ? "text-neon-green" : "text-neon-blue")}>{progress}%</span>
            </div>
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden border border-border">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  scanComplete ? "bg-neon-green glow-green" : "bg-neon-blue glow-blue"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 bg-surface-2 border-b border-border">
          <span className="text-sm font-medium text-foreground">Étapes d'analyse</span>
        </div>
        <div className="divide-y divide-border/50">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-4 px-4 py-3.5 transition-colors",
                step.status === "running" && "bg-neon-blue/5 scan-line"
              )}
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {step.status === "pending" && (
                  <div className="w-7 h-7 rounded-full border border-border flex items-center justify-center">
                    <span className="text-xs font-mono text-muted-foreground">{i + 1}</span>
                  </div>
                )}
                {step.status === "running" && (
                  <div className="w-7 h-7 rounded-full border border-neon-blue/50 bg-neon-blue/10 flex items-center justify-center">
                    <Loader2 className="w-3.5 h-3.5 text-neon-blue animate-spin" />
                  </div>
                )}
                {step.status === "done" && (
                  <div className="w-7 h-7 rounded-full border border-neon-green/50 bg-neon-green/10 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-neon-green" />
                  </div>
                )}
                {step.status === "warn" && (
                  <div className="w-7 h-7 rounded-full border border-neon-orange/50 bg-neon-orange/10 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-neon-orange" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className={cn(
                  "text-sm font-medium transition-colors",
                  step.status === "running" ? "text-neon-blue" :
                  step.status === "done" ? "text-foreground" :
                  step.status === "warn" ? "text-neon-orange" :
                  "text-muted-foreground"
                )}>
                  {step.label}
                </div>
                <div className="font-mono text-xs text-muted-foreground mt-0.5 truncate">{step.detail}</div>
              </div>

              <div className="flex-shrink-0">
                {step.status === "running" && (
                  <span className="text-xs font-mono text-neon-blue animate-pulse">En cours...</span>
                )}
                {step.status === "done" && (
                  <span className="text-xs font-mono text-neon-green">OK</span>
                )}
                {step.status === "warn" && (
                  <span className="text-xs font-mono text-neon-orange">Partiel</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scan complete summary */}
      {scanComplete && (
        <div className="rounded-xl border border-neon-green/30 bg-neon-green/5 p-4 fade-in-up">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-neon-green flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-neon-green">Scan terminé avec succès</div>
              <div className="text-xs text-muted-foreground font-mono mt-0.5">
                142 applications trouvées · 7 mises à jour disponibles · Rapport HTML généré
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
