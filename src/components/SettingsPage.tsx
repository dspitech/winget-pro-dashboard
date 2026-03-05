import { Settings, Server, Globe, Shield, Bell, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useServer } from "@/contexts/ServerContext";

export function SettingsPage() {
  const { status, isConnected } = useServer();
  const [serverUrl, setServerUrl] = useState("http://localhost:3001");

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Connexion serveur */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Server className="w-4 h-4 text-neon-blue" />
          Connexion Serveur Local
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-mono block mb-1">URL du serveur</label>
            <input type="text" value={serverUrl} onChange={e => setServerUrl(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface-1 border border-border text-sm font-mono text-foreground focus:outline-none focus:border-neon-blue" />
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-neon-green" : "bg-neon-red")} />
            <span className={cn("text-xs font-mono", isConnected ? "text-neon-green" : "text-neon-red")}>{isConnected ? "Connecté" : "Déconnecté"}</span>
          </div>
        </div>
      </div>

      {/* Préférences */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Palette className="w-4 h-4 text-neon-cyan" />
          Préférences d'affichage
        </h3>
        <div className="space-y-3">
          {[
            { label: "Thème", value: "Dark (Cyberpunk)" },
            { label: "Langue", value: navigator.language || "fr-FR" },
            { label: "Police monospace", value: "JetBrains Mono" },
            { label: "Fuseau horaire", value: Intl.DateTimeFormat().resolvedOptions().timeZone },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-1/30 border border-border/50">
              <span className="text-xs text-muted-foreground font-mono">{item.label}</span>
              <span className="text-xs font-mono text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* À propos */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-neon-green" />
          À propos
        </h3>
        <div className="space-y-2">
          {[
            { label: "Version", value: "v2.6.0" },
            { label: "Auteur", value: "LO Pape / dspitech" },
            { label: "Licence", value: "MIT" },
            { label: "Plateforme", value: navigator.platform || "—" },
            { label: "User Agent", value: navigator.userAgent.split(" ").slice(-2).join(" ") },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-1/30 border border-border/50">
              <span className="text-xs text-muted-foreground font-mono">{item.label}</span>
              <span className="text-xs font-mono text-neon-cyan">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
