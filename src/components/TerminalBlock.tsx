import { cn } from "@/lib/utils";
import { Terminal, Copy, CheckCheck } from "lucide-react";
import { useState } from "react";

interface TerminalBlockProps {
  title?: string;
  lines: { type: "command" | "output" | "success" | "error" | "info" | "comment"; text: string }[];
  className?: string;
}

export function TerminalBlock({ title = "PowerShell Terminal", lines, className }: TerminalBlockProps) {
  const [copied, setCopied] = useState(false);

  const commands = lines.filter(l => l.type === "command").map(l => l.text).join("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(commands);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineColors: Record<string, string> = {
    command: "text-neon-cyan",
    output: "text-foreground/80",
    success: "text-neon-green",
    error: "text-neon-red",
    info: "text-neon-blue",
    comment: "text-muted-foreground",
  };

  const linePrefix: Record<string, string> = {
    command: "PS> ",
    output: "    ",
    success: "✓   ",
    error: "✗   ",
    info: "ℹ   ",
    comment: "#   ",
  };

  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-neon-red/70" />
            <span className="w-3 h-3 rounded-full bg-neon-orange/70" />
            <span className="w-3 h-3 rounded-full bg-neon-green/70" />
          </div>
          <Terminal className="w-3.5 h-3.5 text-muted-foreground ml-2" />
          <span className="text-xs font-mono text-muted-foreground">{title}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <><CheckCheck className="w-3.5 h-3.5 text-neon-green" /><span className="text-neon-green">Copié</span></>
          ) : (
            <><Copy className="w-3.5 h-3.5" /><span>Copier</span></>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4 font-mono text-sm space-y-1 min-h-16">
        {lines.map((line, i) => (
          <div key={i} className={cn("flex gap-1 leading-6", lineColors[line.type])}>
            <span className="select-none text-muted-foreground">{linePrefix[line.type]}</span>
            <span>{line.text}</span>
          </div>
        ))}
        <span className="inline-block w-2 h-4 bg-neon-cyan/80 animate-pulse ml-4 mt-1" />
      </div>
    </div>
  );
}
