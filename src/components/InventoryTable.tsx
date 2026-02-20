import { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppEntry {
  name: string;
  id: string;
  version: string;
  available?: string;
  source: string;
  installDate?: string;
  status: "up-to-date" | "update-available" | "unknown";
}

const MOCK_APPS: AppEntry[] = [
  { name: "7-Zip 24.09 (x64)", id: "7zip.7zip", version: "24.09.00.0", source: "winget", installDate: "2024-11-15", status: "up-to-date" },
  { name: "Git", id: "Git.Git", version: "2.47.1", available: "2.48.0", source: "winget", installDate: "2024-09-01", status: "update-available" },
  { name: "Microsoft Visual Studio Code", id: "Microsoft.VisualStudioCode", version: "1.96.2", source: "winget", installDate: "2024-08-20", status: "up-to-date" },
  { name: "Node.js", id: "OpenJS.NodeJS.LTS", version: "20.18.1", available: "22.13.0", source: "winget", installDate: "2024-07-10", status: "update-available" },
  { name: "Google Chrome", id: "Google.Chrome", version: "132.0.6834.84", source: "winget", installDate: "2024-06-15", status: "up-to-date" },
  { name: "PowerShell 7-x64", id: "Microsoft.PowerShell", version: "7.4.7.0", available: "7.5.0", source: "winget", installDate: "2024-05-01", status: "update-available" },
  { name: "Python 3.13.1 (64-bit)", id: "Python.Python.3.13", version: "3.13.1", source: "winget", installDate: "2024-12-01", status: "up-to-date" },
  { name: "Windows Terminal", id: "Microsoft.WindowsTerminal", version: "1.21.3231.0", source: "winget", installDate: "2024-04-10", status: "up-to-date" },
  { name: "Docker Desktop", id: "Docker.DockerDesktop", version: "4.37.1", available: "4.38.0", source: "winget", installDate: "2024-03-22", status: "update-available" },
  { name: "Mozilla Firefox", id: "Mozilla.Firefox", version: "134.0", source: "winget", installDate: "2024-02-18", status: "up-to-date" },
  { name: "Slack", id: "SlackTechnologies.Slack", version: "4.43.47", source: "winget", installDate: "2024-01-30", status: "up-to-date" },
  { name: "Postman", id: "Postman.Postman", version: "11.28.4", available: "11.29.0", source: "winget", installDate: "2024-01-15", status: "update-available" },
  { name: "VLC media player", id: "VideoLAN.VLC", version: "3.0.21.0", source: "winget", installDate: "2023-12-10", status: "up-to-date" },
  { name: "Notepad++", id: "Notepad++.Notepad++", version: "8.7.3", source: "winget", installDate: "2023-11-05", status: "up-to-date" },
  { name: "WinSCP 6.3.6", id: "WinSCP.WinSCP", version: "6.3.6", available: "6.4.0", source: "winget", installDate: "2023-10-01", status: "update-available" },
  { name: "Microsoft .NET SDK 9.0", id: "Microsoft.DotNet.SDK.9", version: "9.0.101", source: "winget", installDate: "2024-12-15", status: "up-to-date" },
  { name: "GitHub Desktop", id: "GitHub.GitHubDesktop", version: "3.4.15", source: "winget", installDate: "2024-08-05", status: "up-to-date" },
  { name: "OBS Studio", id: "OBSProject.OBSStudio", version: "31.0.0", source: "winget", installDate: "2024-07-20", status: "up-to-date" },
  { name: "Zoom", id: "Zoom.Zoom", version: "6.3.11.56483", available: "6.4.0", source: "winget", installDate: "2024-06-01", status: "update-available" },
  { name: "Microsoft Teams", id: "Microsoft.Teams", version: "24295.1404.3132.325", source: "winget", installDate: "2024-01-01", status: "up-to-date" },
];

const PAGE_SIZE = 8;

export function InventoryTable() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "up-to-date" | "update-available">("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return MOCK_APPS.filter((app) => {
      const matchesSearch =
        app.name.toLowerCase().includes(search.toLowerCase()) ||
        app.id.toLowerCase().includes(search.toLowerCase()) ||
        app.version.includes(search);
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const handleFilter = (f: typeof statusFilter) => {
    setStatusFilter(f);
    setPage(1);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-border bg-surface-2">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher par nom, ID, version..."
            className="w-full pl-9 pr-4 py-2 bg-surface-1 border border-border rounded-lg text-sm font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/30 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {(["all", "up-to-date", "update-available"] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                statusFilter === f
                  ? f === "all"
                    ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/30"
                    : f === "up-to-date"
                    ? "bg-neon-green/20 text-neon-green border border-neon-green/30"
                    : "bg-neon-orange/20 text-neon-orange border border-neon-orange/30"
                  : "text-muted-foreground hover:text-foreground bg-surface-1 border border-border"
              )}
            >
              {f === "all" ? "Tous" : f === "up-to-date" ? "✓ À jour" : "⚠ MàJ dispo"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-1">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> Application</div>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Package ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Version</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Installé le</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((app, i) => (
              <tr
                key={app.id}
                className={cn(
                  "border-b border-border/50 transition-colors hover:bg-surface-2 group",
                  i % 2 === 0 ? "bg-card" : "bg-surface-1/30"
                )}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground group-hover:text-neon-blue transition-colors">{app.name}</div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="font-mono text-xs text-muted-foreground">{app.id}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-mono text-xs text-foreground/80">{app.version}</div>
                  {app.available && (
                    <div className="font-mono text-xs text-neon-orange mt-0.5">→ {app.available}</div>
                  )}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="font-mono text-xs text-muted-foreground">{app.installDate || "—"}</span>
                </td>
                <td className="px-4 py-3">
                  {app.status === "up-to-date" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neon-green/10 text-neon-green border border-neon-green/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                      À jour
                    </span>
                  ) : app.status === "update-available" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neon-orange/10 text-neon-orange border border-neon-orange/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-orange" />
                      MàJ dispo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      Inconnu
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-2">
        <span className="text-xs text-muted-foreground font-mono">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""} · Page {page}/{Math.max(1, totalPages)}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  "w-7 h-7 rounded-lg text-xs font-mono transition-all",
                  page === p
                    ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-1"
                )}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export { MOCK_APPS };
