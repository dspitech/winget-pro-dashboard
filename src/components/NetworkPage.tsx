import { Network, Globe, Wifi, Shield, Server, Activity, RefreshCw, Loader2, WifiOff } from "lucide-react";
import { useServer } from "@/contexts/ServerContext";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { KpiCard } from "./KpiCard";
import { fetchNetworkInfo } from "@/lib/winget-api";

interface NetworkItem {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}

interface NetworkSection {
  section: string;
  items: NetworkItem[];
}

export function NetworkPage() {
  const { isConnected } = useServer();
  const [scanning, setScanning] = useState(false);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    if (!isConnected) return;
    setScanning(true);
    setError(null);
    try {
      const result = await fetchNetworkInfo();
      setData(result);
    } catch (err) {
      setError("Impossible de récupérer les informations réseau");
    }
    setScanning(false);
  };

  // Extract data safely
  const adapters = (data?.adapters as Array<Record<string, string>>) || [];
  const ipconfig = (data?.ipconfig as Array<Record<string, string>>) || [];
  const gateway = (data?.gateway as Array<Record<string, string>>) || [];
  const dns = (data?.dns as Array<Record<string, unknown>>) || [];
  const firewall = (data?.firewall as Array<Record<string, unknown>>) || [];
  const wifi = (data?.wifi as Record<string, string>) || {};

  const activeAdapters = adapters.length;
  const mainIp = ipconfig.length > 0 ? ipconfig[0].IPAddress : "--";
  const mainGateway = gateway.length > 0 ? (gateway[0] as Record<string, string>).NextHop : "--";
  const dnsServers = dns.length > 0 ? ((dns[0] as Record<string, unknown>).ServerAddresses as string[] || []) : [];
  const firewallEnabled = firewall.some((f: Record<string, unknown>) => f.Enabled === true);

  const networkSections: NetworkSection[] = data ? [
    { section: "Interfaces Réseau", items: adapters.map(a => ({ label: a.Name || a.InterfaceDescription, value: `${a.LinkSpeed || "--"} · ${a.MacAddress || "--"}`, icon: Network, color: "text-neon-cyan" })) },
    { section: "Configuration IPv4", items: [
      ...ipconfig.map(ip => ({ label: ip.InterfaceAlias, value: `${ip.IPAddress}/${ip.PrefixLength}`, icon: Globe, color: "text-neon-cyan" })),
      { label: "Passerelle par défaut", value: mainGateway, icon: Server, color: "text-neon-orange" },
    ]},
    { section: "DNS", items: dnsServers.map((s, i) => ({ label: i === 0 ? "DNS primaire" : `DNS ${i + 1}`, value: s, icon: Globe, color: "text-neon-green" })) },
    { section: "Sécurité", items: [
      ...firewall.map((f: Record<string, unknown>) => ({ label: `Pare-feu ${f.Name}`, value: f.Enabled ? "Activé" : "Désactivé", icon: Shield, color: f.Enabled ? "text-neon-green" : "text-neon-red" })),
      ...(wifi.SSID ? [{ label: "Réseau Wi-Fi", value: wifi.SSID, icon: Wifi, color: "text-neon-cyan" }] : []),
    ]},
  ] : [];

  return (
    <div className="space-y-6">
      {/* Not connected warning */}
      {!isConnected && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neon-orange/30 bg-neon-orange/5">
          <WifiOff className="w-4 h-4 text-neon-orange flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="text-neon-orange font-medium">Serveur non connecté</span> — Lancez le serveur local pour scanner le réseau de votre machine.
          </div>
        </div>
      )}

      {/* KPIs - only if data */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Interfaces actives" value={activeAdapters} subtitle={adapters.map(a => a.Name).join(", ") || "--"} icon={Network} glow="cyan" />
          <KpiCard title="Adresse IP" value={mainIp} subtitle={ipconfig[0]?.InterfaceAlias || "--"} icon={Globe} glow="blue" />
          <KpiCard title="Pare-feu" value={firewallEnabled ? "Activé" : "Désactivé"} subtitle={`${firewall.filter((f: Record<string, unknown>) => f.Enabled).length}/${firewall.length} profils`} icon={Shield} glow={firewallEnabled ? "green" : "red"} />
          <KpiCard title="DNS" value={dnsServers[0] || "--"} subtitle={dnsServers.length > 1 ? `+ ${dnsServers.length - 1} autres` : "Primaire"} icon={Globe} glow="green" />
        </div>
      )}

      {/* Scan button */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Analyse Réseau</h3>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">Get-NetAdapter · Get-NetIPAddress · Get-DnsClientServerAddress</p>
          </div>
          <button onClick={handleScan} disabled={scanning || !isConnected} className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all", scanning ? "bg-muted text-muted-foreground cursor-not-allowed" : !isConnected ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50" : "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/20")}>
            {scanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Scan en cours...</> : <><RefreshCw className="w-4 h-4" /> Scanner le réseau</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-neon-red/30 bg-neon-red/5 p-4 text-sm text-neon-red font-mono">{error}</div>
      )}

      {/* No data state */}
      {!data && !scanning && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Network className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-foreground font-semibold mb-1">Aucune donnée réseau</h3>
          <p className="text-sm text-muted-foreground font-mono">Lancez un scan réseau pour afficher les informations de connectivité</p>
        </div>
      )}

      {/* Network sections */}
      {data && networkSections.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {networkSections.filter(s => s.items.length > 0).map(section => (
            <div key={section.section} className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Network className="w-4 h-4 text-neon-cyan" />
                {section.section}
              </h3>
              <div className="space-y-2">
                {section.items.map((item, i) => (
                  <div key={`${item.label}-${i}`} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-1/30 border border-border/50">
                    <div className="flex items-center gap-2">
                      <item.icon className={cn("w-3.5 h-3.5", item.color)} />
                      <span className="text-xs text-muted-foreground font-mono">{item.label}</span>
                    </div>
                    <span className={cn("text-xs font-mono font-medium", item.color)}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
