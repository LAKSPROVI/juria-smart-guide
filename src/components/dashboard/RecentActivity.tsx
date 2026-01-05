import { useEffect, useState } from "react";
import { FileText, Search, MessageSquare, Bell, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Activity {
  id: string;
  type: "consulta" | "caderno" | "chat" | "resultado";
  title: string;
  description: string;
  time: string;
  status: "success" | "warning" | "info" | "error";
}

const statusStyles = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-primary/10 text-primary",
  error: "bg-destructive/10 text-destructive",
};

const iconMap = {
  consulta: Search,
  caderno: FileText,
  chat: MessageSquare,
  resultado: Bell,
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Agora";
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays === 1) return "Ontem";
  return `${diffDays} dias atrás`;
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const [
        { data: consultas },
        { data: resultados },
        { data: conversas },
        { data: cadernos },
      ] = await Promise.all([
        supabase.from('consultas').select('id, nome, ultima_execucao').order('ultima_execucao', { ascending: false, nullsFirst: false }).limit(3),
        supabase.from('resultados_consultas').select('id, numero_processo, sigla_tribunal, created_at, visualizado').order('created_at', { ascending: false }).limit(3),
        supabase.from('conversas').select('id, titulo, updated_at').order('updated_at', { ascending: false }).limit(3),
        supabase.from('cadernos').select('id, tribunal, data, status, created_at').order('created_at', { ascending: false }).limit(3),
      ]);

      const allActivities: Activity[] = [];

      // Consultas executadas
      consultas?.filter(c => c.ultima_execucao).forEach(c => {
        allActivities.push({
          id: `consulta-${c.id}`,
          type: "consulta",
          title: "Consulta executada",
          description: c.nome,
          time: c.ultima_execucao!,
          status: "success",
        });
      });

      // Resultados (intimações)
      resultados?.forEach(r => {
        allActivities.push({
          id: `resultado-${r.id}`,
          type: "resultado",
          title: r.visualizado ? "Intimação visualizada" : "Nova intimação detectada",
          description: `${r.sigla_tribunal || "Tribunal"} - ${r.numero_processo || "Processo"}`,
          time: r.created_at,
          status: r.visualizado ? "info" : "warning",
        });
      });

      // Conversas
      conversas?.forEach(c => {
        allActivities.push({
          id: `chat-${c.id}`,
          type: "chat",
          title: "Conversa",
          description: c.titulo,
          time: c.updated_at,
          status: "info",
        });
      });

      // Cadernos
      cadernos?.forEach(c => {
        allActivities.push({
          id: `caderno-${c.id}`,
          type: "caderno",
          title: c.status === "sucesso" ? "Caderno processado" : `Caderno ${c.status}`,
          description: `${c.tribunal} - ${new Date(c.data).toLocaleDateString("pt-BR")}`,
          time: c.created_at,
          status: c.status === "sucesso" ? "success" : c.status === "erro" ? "error" : "info",
        });
      });

      // Ordenar por data
      allActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setActivities(allActivities.slice(0, 6));
    } catch (error) {
      console.error("Erro ao carregar atividades:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold text-foreground">
            Atividade Recente
          </h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-lg font-semibold text-foreground">
          Atividade Recente
        </h3>
      </div>
      <div className="divide-y divide-border">
        {activities.length === 0 ? (
          <div className="px-6 py-8 text-center text-muted-foreground">
            <p>Nenhuma atividade recente.</p>
            <p className="text-sm mt-1">Execute consultas ou baixe cadernos para ver a atividade aqui.</p>
          </div>
        ) : (
          activities.map((activity) => {
            const Icon = iconMap[activity.type];
            return (
              <div
                key={activity.id}
                className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-muted/50"
              >
                <div
                  className={cn(
                    "rounded-lg p-2",
                    statusStyles[activity.status]
                  )}
                >
                  <Icon className="h-4 w-4" />
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
                  {formatRelativeTime(activity.time)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
