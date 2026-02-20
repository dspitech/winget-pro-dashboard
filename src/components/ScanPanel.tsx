import { useState, useEffect } from "react";
import { Play, CheckCircle2, AlertTriangle, Loader2, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { startScan, ScanEventType, fetchInventory } from "@/lib/winget-api";
import { useServer } from "@/contexts/ServerContext";
import { useScanData } from "@/hooks/use-scan-data";

interface ScanStep {
  id: string;
  label: string;
  detail: string;
  status: "pending" | "running" | "done" | "warn";
  data?: Record<string, unknown>;
}

const SCAN_STEPS_CONFIG = [
  { id: "init", label: "Initialisation winget", detail: "winget --version --accept-source-agreements" },
  { id: "sources", label: "Vérification des sources", detail: "winget source list" },
  { id: "list", label: "Inventaire des applications", detail: "winget list --accept-source-agreements" },
  { id: "updates", label: "Détection des mises à jour", detail: "winget upgrade --include-unknown --accept-source-agreements" },
];

// Fake steps for demo mode
const DEMO_DURATIONS = [900, 1400, 2800, 2200];

export function ScanPanel() {
  const { isConnected } = useServer();
  const { saveScanData, lastScanTime } = useScanData();
  const [steps, setSteps] = useState<ScanStep[]>(
    SCAN_STEPS_CONFIG.map(s => ({ ...s, status: "pending" }))
  );
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [summaryData, setSummaryData] = useState<{ apps?: number; updates?: number } | null>(null);

  // Restaurer l'état du scan depuis localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("winget-scan-steps");
      const storedComplete = localStorage.getItem("winget-scan-complete");
      const storedSummary = localStorage.getItem("winget-scan-summary");
      
      if (stored && storedComplete === "true") {
        const savedSteps: ScanStep[] = JSON.parse(stored);
        setSteps(savedSteps);
        setScanComplete(true);
        if (storedSummary) {
          setSummaryData(JSON.parse(storedSummary));
        }
      }
    } catch (err) {
      console.error("Erreur lors de la restauration du scan:", err);
    }
  }, []);

  const handleScan = () => {
    if (scanning) return;
    setScanning(true);
    setScanComplete(false);
    setSummaryData(null);
    setSteps(SCAN_STEPS_CONFIG.map(s => ({ ...s, status: "pending" })));
    // Effacer les données sauvegardées pour un nouveau scan
    try {
      localStorage.removeItem("winget-scan-steps");
      localStorage.removeItem("winget-scan-complete");
      localStorage.removeItem("winget-scan-summary");
    } catch (err) {
      console.error("Erreur lors de la suppression des données:", err);
    }

    if (!isConnected) {
      // Mode démo — simulation locale
      let idx = 0;
      const runNext = () => {
        if (idx >= SCAN_STEPS_CONFIG.length) {
          setScanning(false);
          setScanComplete(true);
          const demoSummary = { apps: 142, updates: 7 };
          setSummaryData(demoSummary);
          // Sauvegarder l'état du scan en mode démo
          try {
            localStorage.setItem("winget-scan-steps", JSON.stringify(steps));
            localStorage.setItem("winget-scan-complete", "true");
            localStorage.setItem("winget-scan-summary", JSON.stringify(demoSummary));
          } catch (err) {
            console.error("Erreur lors de la sauvegarde du scan:", err);
          }
          return;
        }
        const i = idx;
        setSteps(prev => prev.map((s, j) => j === i ? { ...s, status: "running" } : s));
        setTimeout(() => {
          setSteps(prev => prev.map((s, j) =>
            j === i ? { ...s, status: Math.random() > 0.15 ? "done" : "warn" } : s
          ));
          idx++;
          runNext();
        }, DEMO_DURATIONS[i]);
      };
      runNext();
      return;
    }

    // Mode réel — SSE depuis le serveur
    let currentSteps = SCAN_STEPS_CONFIG.map(s => ({ ...s, status: "pending" as const }));
    let currentSummary: { apps?: number; updates?: number } | null = null;

    startScan((type: ScanEventType, data: unknown) => {
      if (type === "step-start") {
        const d = data as { index: number };
        currentSteps = currentSteps.map((s, j) => j === d.index ? { ...s, status: "running" } : s);
        setSteps(currentSteps);
      }
      if (type === "step-done") {
        const d = data as { index: number; warn?: boolean; data?: Record<string, unknown> };
        currentSteps = currentSteps.map((s, j) =>
          j === d.index ? { ...s, status: d.warn ? "warn" : "done", data: d.data } : s
        );
        setSteps(currentSteps);
        // Récupérer les résultats du scan
        if (d.data?.count) {
          currentSummary = { ...currentSummary, apps: d.data.count as number };
          setSummaryData(currentSummary);
        }
        if (d.data?.updates !== undefined) {
          currentSummary = { ...currentSummary, updates: d.data.updates as number };
          setSummaryData(currentSummary);
        }
      }
      if (type === "complete") {
        setScanning(false);
        setScanComplete(true);
        // Sauvegarder l'état du scan
        try {
          localStorage.setItem("winget-scan-steps", JSON.stringify(currentSteps));
          localStorage.setItem("winget-scan-complete", "true");
          if (currentSummary) {
            localStorage.setItem("winget-scan-summary", JSON.stringify(currentSummary));
          }
        } catch (err) {
          console.error("Erreur lors de la sauvegarde du scan:", err);
        }
        // Sauvegarder l'inventaire complet si fourni dans l'événement
        const completeData = data as { ok?: boolean; inventory?: any };
        if (completeData.inventory) {
          saveScanData(completeData.inventory);
        } else if (isConnected) {
          // Sinon, récupérer l'inventaire séparément
          fetchInventory()
            .then(data => {
              saveScanData(data);
            })
            .catch(err => {
              console.error("Erreur lors de la récupération de l'inventaire:", err);
            });
        }
      }
      if (type === "error") {
        setScanning(false);
      }
    });
  };

  const doneCount = steps.filter(s => s.status === "done" || s.status === "warn").length;
  const progress = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="space-y-6">
      {/* Server warning */}
      {!isConnected && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neon-orange/30 bg-neon-orange/5">
          <WifiOff className="w-4 h-4 text-neon-orange flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="text-neon-orange font-medium">Mode démo</span> — Le scan est simulé. Lancez le serveur local pour analyser votre vrai poste Windows.
          </div>
        </div>
      )}

      {/* Scan control */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Scan Système Winget</h3>
            <p className="text-sm text-muted-foreground mt-0.5 font-mono">
              {isConnected ? "Analyse réelle de votre poste Windows" : "Simulation du scan (mode démo)"}
            </p>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
              scanning
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-neon-blue/10 text-neon-blue border border-neon-blue/30 hover:bg-neon-blue/20 hover:glow-blue"
            )}
          >
            {scanning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Scan en cours...</>
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
              <span className={cn("font-bold", scanComplete ? "text-neon-green" : "text-neon-blue")}>
                {progress}%
              </span>
            </div>
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden border border-border">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  scanComplete ? "bg-neon-green" : "bg-neon-blue"
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
                step.status === "running" && "bg-neon-blue/5"
              )}
            >
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
                  step.status === "warn" ? "text-neon-orange" : "text-muted-foreground"
                )}>
                  {step.label}
                </div>
                <div className="font-mono text-xs text-muted-foreground mt-0.5 truncate">{step.detail}</div>
                {step.data && step.status === "done" && (
                  <div className="font-mono text-xs text-neon-green mt-0.5">
                    {Object.entries(step.data).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 text-xs font-mono">
                {step.status === "running" && <span className="text-neon-blue animate-pulse">En cours...</span>}
                {step.status === "done" && <span className="text-neon-green">✓ OK</span>}
                {step.status === "warn" && <span className="text-neon-orange">⚠ Partiel</span>}
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
                {summaryData?.apps ? `${summaryData.apps} applications trouvées` : "Applications inventoriées"}
                {summaryData?.updates !== undefined ? ` · ${summaryData.updates} mises à jour disponibles` : ""}
                {!isConnected ? " (données simulées)" : " · Données réelles de votre PC"}
                {lastScanTime && (
                  <span className="block mt-1 text-muted-foreground/70">
                    Scan effectué le {lastScanTime.toLocaleDateString("fr-FR")} à {lastScanTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
