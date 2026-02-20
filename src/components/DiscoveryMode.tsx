import { useState } from "react";
import { Search, Download, Loader2, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TerminalBlock } from "./TerminalBlock";

interface SearchResult {
  name: string;
  id: string;
  version: string;
  source: string;
}

const MOCK_RESULTS: Record<string, SearchResult[]> = {
  vscode: [
    { name: "Microsoft Visual Studio Code", id: "Microsoft.VisualStudioCode", version: "1.96.2", source: "winget" },
    { name: "VSCodium", id: "VSCodium.VSCodium", version: "1.96.2", source: "winget" },
  ],
  browser: [
    { name: "Google Chrome", id: "Google.Chrome", version: "132.0.6834.84", source: "winget" },
    { name: "Mozilla Firefox", id: "Mozilla.Firefox", version: "134.0", source: "winget" },
    { name: "Microsoft Edge", id: "Microsoft.Edge", version: "132.0.2957.55", source: "winget" },
    { name: "Brave", id: "Brave.Brave", version: "1.74.54", source: "winget" },
  ],
  git: [
    { name: "Git", id: "Git.Git", version: "2.48.0", source: "winget" },
    { name: "GitHub Desktop", id: "GitHub.GitHubDesktop", version: "3.4.15", source: "winget" },
    { name: "GitKraken", id: "Axosoft.GitKraken", version: "10.6.0", source: "winget" },
  ],
  python: [
    { name: "Python 3.13", id: "Python.Python.3.13", version: "3.13.1", source: "winget" },
    { name: "Python 3.12", id: "Python.Python.3.12", version: "3.12.8", source: "winget" },
    { name: "Anaconda3", id: "Anaconda.Anaconda3", version: "2024.10", source: "winget" },
  ],
};

const CATEGORIES = [
  { label: "Navigateurs", key: "browser", icon: "🌐" },
  { label: "Dev Tools", key: "vscode", icon: "⚡" },
  { label: "Git", key: "git", icon: "🔀" },
  { label: "Python", key: "python", icon: "🐍" },
];

type InstallStatus = "idle" | "installing" | "success" | "error";

export function DiscoveryMode() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [installStatus, setInstallStatus] = useState<Record<string, InstallStatus>>({});

  const handleSearch = (q: string) => {
    const key = q.toLowerCase().trim();
    const found = Object.entries(MOCK_RESULTS).find(([k]) => key.includes(k));
    setResults(found ? found[1] : [
      { name: `${q} Application`, id: `Publisher.${q}`, version: "1.0.0", source: "winget" },
    ]);
    setSearched(true);
    setSelected(new Set());
  };

  const handleCategoryClick = (key: string) => {
    setQuery(key);
    handleSearch(key);
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
    setTimeout(() => {
      setInstallStatus(prev => ({ ...prev, [id]: Math.random() > 0.1 ? "success" : "error" }));
    }, 2500 + Math.random() * 1500);
  };

  const handleInstallSelected = () => {
    selected.forEach(id => handleInstall(id));
  };

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => handleCategoryClick(cat.key)}
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
            onKeyDown={e => e.key === "Enter" && query && handleSearch(query)}
            placeholder="Rechercher une application winget..."
            className="w-full pl-9 pr-4 py-2.5 bg-surface-1 border border-border rounded-xl text-sm font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30 transition-colors"
          />
        </div>
        <button
          onClick={() => query && handleSearch(query)}
          className="px-5 py-2.5 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 rounded-xl text-sm font-medium hover:bg-neon-cyan/20 hover:glow-cyan transition-all duration-200"
        >
          Rechercher
        </button>
      </div>

      {/* Terminal preview */}
      {query && (
        <TerminalBlock
          title="winget search"
          lines={[
            { type: "comment", text: "# Recherche d'applications via winget" },
            { type: "command", text: `winget search "${query}" --accept-source-agreements` },
            ...(searched ? results.slice(0, 3).map(r => ({
              type: "output" as const,
              text: `${r.name.padEnd(40)} ${r.id.padEnd(35)} ${r.version}`
            })) : [{ type: "info" as const, text: "Exécution en cours..." }]),
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
              const isSelected = selected.has(app.id);

              return (
                <div
                  key={app.id}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-1",
                    isSelected && "bg-neon-cyan/5"
                  )}
                >
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
                    </div>
                  </div>

                  <div>
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
