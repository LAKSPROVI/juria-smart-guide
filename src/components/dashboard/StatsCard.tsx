import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning";
}

const variantStyles = {
  default: {
    icon: "bg-secondary text-secondary-foreground",
    trend: {
      positive: "text-success",
      negative: "text-destructive",
    },
  },
  primary: {
    icon: "bg-primary/10 text-primary",
    trend: {
      positive: "text-success",
      negative: "text-destructive",
    },
  },
  success: {
    icon: "bg-success/10 text-success",
    trend: {
      positive: "text-success",
      negative: "text-destructive",
    },
  },
  warning: {
    icon: "bg-warning/10 text-warning",
    trend: {
      positive: "text-success",
      negative: "text-destructive",
    },
  },
};

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
}: StatsCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card card-hover">
      <div className="flex items-center justify-between">
        <div className={cn("rounded-lg p-2.5", styles.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span
            className={cn(
              "text-sm font-medium",
              trend.isPositive ? styles.trend.positive : styles.trend.negative
            )}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
