import { FileText, Download, RefreshCw, CheckCircle2 } from "lucide-react";
import { TerminalBlock } from "./TerminalBlock";
import { cn } from "@/lib/utils";
import { useState } from "react";

const REPORT_FEATURES = [
  { label: "Inventaire complet", desc: "Toutes les apps installées via winget avec versions et dates", icon: "📦" },
  { label: "Tableau de bord interactif", desc: "Recherche, filtres et pagination intégrés", icon: "🔍" },
  { label: "Indicateurs clés", desc: "Total apps, à jour, mises à jour disponibles", icon: "📊" },
  { label: "Export statique", desc: "HTML autonome sans serveur web requis", icon: "💾" },
];

export function ReportPage() {
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setDone(false);
    setTimeout(() => {
      setGenerating(false);
      setDone(true);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-gradient-cyan border border-neon-cyan/20">
                <FileText className="w-5 h-5 text-neon-cyan" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Rapport HTML Inventaire</h2>
            </div>
            <p className="text-sm text-muted-foreground font-mono max-w-xl">
              Génère <span className="text-neon-cyan">Inventory_Dashboard.html</span> — un rapport complet, autonome et moderne de toutes les applications installées via winget.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap",
              generating
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : done
                ? "bg-neon-green/10 text-neon-green border border-neon-green/30 hover:bg-neon-green/20"
                : "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/20 hover:glow-cyan"
            )}
          >
            {generating ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Génération...</>
            ) : done ? (
              <><CheckCircle2 className="w-4 h-4" /> Régénérer</>
            ) : (
              <><FileText className="w-4 h-4" /> Générer le rapport</>
            )}
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {REPORT_FEATURES.map(f => (
          <div key={f.label} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
            <span className="text-2xl">{f.icon}</span>
            <div>
              <div className="text-sm font-semibold text-foreground">{f.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Terminal */}
      <TerminalBlock
        title="PowerShell — Génération rapport"
        lines={[
          { type: "comment", text: "# Génération du rapport HTML via Provision.ps1" },
          { type: "command", text: ".\\Provision.ps1" },
          { type: "info", text: "Collecte des données winget en cours..." },
          { type: "output", text: "winget list --accept-source-agreements > parsing..." },
          { type: "success", text: "142 applications indexées" },
          { type: "info", text: "Construction du dashboard HTML..." },
          { type: "success", text: "Inventory_Dashboard.html créé (2.4 MB)" },
          { type: "command", text: "Start-Process Inventory_Dashboard.html" },
          { type: "success", text: "Rapport ouvert dans le navigateur par défaut." },
        ]}
      />

      {/* Download area */}
      {done && (
        <div className="rounded-xl border border-neon-cyan/30 bg-neon-cyan/5 p-5 fade-in-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-neon-cyan" />
              <div>
                <div className="text-sm font-bold text-neon-cyan">Rapport généré avec succès</div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">
                  Inventory_Dashboard.html · 2.4 MB · {new Date().toLocaleString("fr-FR")}
                </div>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 rounded-lg text-sm font-medium hover:bg-neon-cyan/20 transition-all">
              <Download className="w-4 h-4" />
              Télécharger
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
