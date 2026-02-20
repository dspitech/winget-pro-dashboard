import { useState } from "react";
import { Search, Download, Loader2, CheckCircle2, XCircle, ChevronRight, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { TerminalBlock } from "./TerminalBlock";
import { searchPackages, installPackage, SSEEventType } from "@/lib/winget-api";
import { useServer } from "@/contexts/ServerContext";

interface SearchResult {
  name: string;
  id: string;
  version: string;
  source: string;
}

const CATEGORIES = [
  { label: "Navigateurs", query: "browser", icon: "🌐" },
  { label: "Dev Tools", query: "vscode", icon: "⚡" },
  { label: "Git", query: "git", icon: "🔀" },
  { label: "Python", query: "python", icon: "🐍" },
  { label: "Node.js", query: "nodejs", icon: "🟢" },
  { label: "Docker", query: "docker", icon: "🐳" },
  { label: "Editors", query: "notepad", icon: "📝" },
  { label: "Media", query: "vlc", icon: "🎬" },
];

const MOCK_RESULTS: Record<string, SearchResult[]> = {
  browser: [
    { name: "Google Chrome", id: "Google.Chrome", version: "132.0.6834.84", source: "winget" },
    { name: "Mozilla Firefox", id: "Mozilla.Firefox", version: "134.0", source: "winget" },
    { name: "Microsoft Edge", id: "Microsoft.Edge", version: "132.0.2957.55", source: "winget" },
  ],
  vscode: [
    { name: "Microsoft Visual Studio Code", id: "Microsoft.VisualStudioCode", version: "1.96.2", source: "winget" },
    { name: "VSCodium", id: "VSCodium.VSCodium", version: "1.96.2", source: "winget" },
  ],
  git: [
    { name: "Git", id: "Git.Git", version: "2.48.0", source: "winget" },
    { name: "GitHub Desktop", id: "GitHub.GitHubDesktop", version: "3.4.15", source: "winget" },
  ],
  python: [
    { name: "Python 3.13", id: "Python.Python.3.13", version: "3.13.1", source: "winget" },
    { name: "Python 3.12", id: "Python.Python.3.12", version: "3.12.8", source: "winget" },
  ],
};

type InstallStatus = "idle" | "installing" | "success" | "error";

export function DiscoveryMode() {
  const { isConnected } = useServer();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [installStatus, setInstallStatus] = useState<Record<string, InstallStatus>>({});
  const [installLogs, setInstallLogs] = useState<Record<string, string[]>>({});
  const [activeLog, setActiveLog] = useState<string | null>(null);

  const handleSearch = async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    setSearched(false);

    if (isConnected) {
      try {
        const data = await searchPackages(q);
        setResults(data.results);
      } catch {
        // fallback mock
        const key = Object.keys(MOCK_RESULTS).find(k => q.toLowerCase().includes(k));
        setResults(key ? MOCK_RESULTS[key] : [{ name: `${q}`, id: `Publisher.${q}`, version: "N/A", source: "winget" }]);
      }
    } else {
      await new Promise(r => setTimeout(r, 600));
      const key = Object.keys(MOCK_RESULTS).find(k => q.toLowerCase().includes(k));
      setResults(key ? MOCK_RESULTS[key] : [{ name: q, id: `Publisher.${q}`, version: "1.0.0", source: "winget" }]);
    }

    setSearched(true);
    setSearching(false);
    setSelected(new Set());
  };

  const handleCategoryClick = (query: string) => {
    setQuery(query);
    handleSearch(query);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleInstall = (id: string) => {
    setInstallStatus(prev => ({ ...prev, [id]: "installing" }));
    setInstallLogs(prev => ({ ...prev, [id]: [] }));
    setActiveLog(id);

    if (!isConnected) {
      // Mode démo — simule l'installation
      const fakeSteps = [
        "Connexion aux sources winget...",
        `Téléchargement de ${id}...`,
        "Vérification de la signature...",
        "Installation en cours...",
        `✓ ${id} installé avec succès.`,
      ];
      fakeSteps.forEach((step, i) => {
        setTimeout(() => {
          setInstallLogs(prev => ({ ...prev, [id]: [...(prev[id] || []), step] }));
          if (i === fakeSteps.length - 1) {
            setInstallStatus(prev => ({ ...prev, [id]: "success" }));
          }
        }, (i + 1) * 700);
      });
      return;
    }

    const cleanup = installPackage(id, (type: SSEEventType, data: string) => {
      setInstallLogs(prev => ({ ...prev, [id]: [...(prev[id] || []), data] }));
      if (type === "success") setInstallStatus(prev => ({ ...prev, [id]: "success" }));
      if (type === "error") setInstallStatus(prev => ({ ...prev, [id]: "error" }));
    });

    return cleanup;
  };

  const handleInstallSelected = () => {
    selected.forEach(id => handleInstall(id));
  };

  return (
    <div className="space-y-6">
      {/* Server warning */}
      {!isConnected && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neon-orange/30 bg-neon-orange/5">
          <WifiOff className="w-4 h-4 text-neon-orange flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="text-neon-orange font-medium">Mode démo</span> — Les résultats sont simulés. Lancez le serveur local pour de vraies recherches winget.
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CATEGORIES.map(cat => (
          <button
            key={cat.query}
            onClick={() => handleCategoryClick(cat.query)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-border bg-card hover:border-neon-cyan/40 hover:bg-gradient-cyan transition-all duration-200 group"
          >
            <span className="text-xl">{cat.icon}</span>
            <span className="text-sm font-medium text-foreground group-hover:text-neon-cyan transition-colors">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch(query)}
            placeholder="Rechercher une application (ex: notepad++, vlc, 7zip...)"
            className="w-full pl-9 pr-4 py-2.5 bg-surface-1 border border-border rounded-xl text-sm font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30 transition-colors"
          />
        </div>
        <button
          onClick={() => handleSearch(query)}
          disabled={!query.trim() || searching}
          className="px-5 py-2.5 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 rounded-xl text-sm font-medium hover:bg-neon-cyan/20 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Rechercher
        </button>
      </div>

      {/* Terminal preview */}
      {query && (
        <TerminalBlock
          title="winget search"
          lines={[
            { type: "comment", text: `# Recherche winget${!isConnected ? " (mode démo)" : ""}` },
            { type: "command", text: `winget search "${query}" --accept-source-agreements` },
            ...(searched
              ? results.slice(0, 4).map(r => ({
                  type: "output" as const,
                  text: `${r.name.substring(0, 38).padEnd(40)} ${r.id.substring(0, 33).padEnd(35)} ${r.version}`,
                }))
              : [{ type: "info" as const, text: "Exécution en cours..." }]),
            ...(searched && results.length > 4 ? [{ type: "output" as const, text: `... et ${results.length - 4} autre(s) résultat(s)` }] : []),
          ]}
        />
      )}

      {/* Results */}
      {searched && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-surface-2 border-b border-border">
            <span className="text-sm font-medium text-foreground">{results.length} résultat(s) trouvé(s)</span>
            {selected.size > 0 && (
              <button
                onClick={handleInstallSelected}
                className="flex items-center gap-2 px-4 py-1.5 bg-neon-green/10 text-neon-green border border-neon-green/30 rounded-lg text-sm font-medium hover:bg-neon-green/20 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Installer {selected.size} app{selected.size > 1 ? "s" : ""}
              </button>
            )}
          </div>

          <div className="divide-y divide-border/50">
            {results.map((app) => {
              const status = installStatus[app.id] || "idle";
              const logs = installLogs[app.id] || [];
              const isSelected = selected.has(app.id);

              return (
                <div key={app.id}>
                  <div className={cn(
                    "flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-1",
                    isSelected && "bg-neon-cyan/5"
                  )}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(app.id)}
                      className="w-4 h-4 accent-neon-cyan rounded"
                      disabled={status !== "idle"}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm">{app.name}</div>
                      <div className="font-mono text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>{app.id}</span>
                        <ChevronRight className="w-3 h-3" />
                        <span>v{app.version}</span>
                        <span className="text-border">·</span>
                        <span>{app.source}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {status === "idle" && (
                        <button
                          onClick={() => handleInstall(app.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-blue/10 text-neon-blue border border-neon-blue/30 rounded-lg text-xs font-medium hover:bg-neon-blue/20 transition-all"
                        >
                          <Download className="w-3 h-3" />
                          Installer
                        </button>
                      )}
                      {status === "installing" && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 text-neon-orange text-xs font-medium">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Installation...
                        </div>
                      )}
                      {status === "success" && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 text-neon-green text-xs font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Installé
                        </div>
                      )}
                      {status === "error" && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 text-neon-red text-xs font-medium">
                          <XCircle className="w-3 h-3" />
                          Échec
                        </div>
                      )}
                      {logs.length > 0 && (
                        <button
                          onClick={() => setActiveLog(activeLog === app.id ? null : app.id)}
                          className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
                        >
                          {activeLog === app.id ? "▲" : "▼"} logs
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Live logs */}
                  {activeLog === app.id && logs.length > 0 && (
                    <div className="mx-4 mb-3 rounded-lg bg-surface-1 border border-border p-3 font-mono text-xs space-y-1">
                      {logs.map((line, i) => (
                        <div key={i} className={cn(
                          "leading-5",
                          line.startsWith("✓") ? "text-neon-green" :
                          line.startsWith("✗") ? "text-neon-red" :
                          "text-muted-foreground"
                        )}>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
