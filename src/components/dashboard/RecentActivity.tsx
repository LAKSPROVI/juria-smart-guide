import { FileText, Search, MessageSquare, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const activities = [
  {
    id: 1,
    type: "consulta",
    title: "Consulta executada",
    description: "Márcia Gabriela de Abreu - TJSP",
    time: "2 min atrás",
    icon: Search,
    status: "success",
  },
  {
    id: 2,
    type: "caderno",
    title: "Caderno processado",
    description: "TJSP - 25/12/2025",
    time: "15 min atrás",
    icon: FileText,
    status: "success",
  },
  {
    id: 3,
    type: "chat",
    title: "Conversa iniciada",
    description: "Análise de intimações do dia",
    time: "1h atrás",
    icon: MessageSquare,
    status: "info",
  },
  {
    id: 4,
    type: "notificacao",
    title: "Nova intimação detectada",
    description: "Processo 1234567-89.2024.8.26.0100",
    time: "2h atrás",
    icon: Bell,
    status: "warning",
  },
];

const statusStyles = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-primary/10 text-primary",
  error: "bg-destructive/10 text-destructive",
};

export function RecentActivity() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-lg font-semibold text-foreground">
          Atividade Recente
        </h3>
      </div>
      <div className="divide-y divide-border">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-muted/50"
          >
            <div
              className={cn(
                "rounded-lg p-2",
                statusStyles[activity.status as keyof typeof statusStyles]
              )}
            >
              <activity.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {activity.title}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {activity.description}
              </p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {activity.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
