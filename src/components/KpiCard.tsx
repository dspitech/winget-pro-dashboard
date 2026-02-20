import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type GlowColor = "blue" | "cyan" | "green" | "orange" | "red";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  glow: GlowColor;
  trend?: { value: string; positive: boolean };
  className?: string;
}

const glowMap: Record<GlowColor, { border: string; icon: string; text: string; bg: string; badge: string }> = {
  blue: {
    border: "border-glow-blue",
    icon: "text-neon-blue",
    text: "text-neon-blue",
    bg: "bg-gradient-blue",
    badge: "bg-neon-blue/10 text-neon-blue",
  },
  cyan: {
    border: "border-glow-cyan",
    icon: "text-neon-cyan",
    text: "text-neon-cyan",
    bg: "bg-gradient-cyan",
    badge: "bg-neon-cyan/10 text-neon-cyan",
  },
  green: {
    border: "border-glow-green",
    icon: "text-neon-green",
    text: "text-neon-green",
    bg: "bg-gradient-green",
    badge: "bg-neon-green/10 text-neon-green",
  },
  orange: {
    border: "border-glow-orange",
    icon: "text-neon-orange",
    text: "text-neon-orange",
    bg: "bg-gradient-orange",
    badge: "bg-neon-orange/10 text-neon-orange",
  },
  red: {
    border: "border-glow-red",
    icon: "text-neon-red",
    text: "text-neon-red",
    bg: "bg-gradient-red",
    badge: "bg-neon-red/10 text-neon-red",
  },
};

export function KpiCard({ title, value, subtitle, icon: Icon, glow, trend, className }: KpiCardProps) {
  const styles = glowMap[glow];

  return (
    <div className={cn(
      "relative rounded-xl border bg-card p-5 overflow-hidden transition-all duration-300 hover:scale-[1.02] fade-in-up",
      styles.border,
      className
    )}>
      {/* Background gradient */}
      <div className={cn("absolute inset-0 opacity-40", styles.bg)} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-2 rounded-lg", styles.bg, "border border-current/20")}>
            <Icon className={cn("w-5 h-5", styles.icon)} />
          </div>
          {trend && (
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-mono font-medium",
              trend.positive ? "bg-neon-green/10 text-neon-green" : "bg-neon-red/10 text-neon-red"
            )}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </span>
          )}
        </div>

        <div>
          <div className={cn("text-3xl font-bold font-mono tracking-tight", styles.text)}>
            {value}
          </div>
          <div className="text-sm font-medium text-foreground mt-1">{title}</div>
          {subtitle && (
            <div className="text-xs text-muted-foreground mt-0.5 font-mono">{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
}
