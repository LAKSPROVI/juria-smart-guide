import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { FileText, Search, Database, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  consultasAtivas: number;
  cadernosProcessados: number;
  documentosRag: number;
  conversas: number;
  resultadosNaoVisualizados: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    consultasAtivas: 0,
    cadernosProcessados: 0,
    documentosRag: 0,
    conversas: 0,
    resultadosNaoVisualizados: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [
        { count: consultasAtivas },
        { count: cadernosProcessados },
        { count: documentosRag },
        { count: conversas },
        { count: resultadosNaoVisualizados },
      ] = await Promise.all([
        supabase.from('consultas').select('*', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('cadernos').select('*', { count: 'exact', head: true }).eq('status', 'sucesso'),
        supabase.from('documentos').select('*', { count: 'exact', head: true }),
        supabase.from('conversas').select('*', { count: 'exact', head: true }),
        supabase.from('resultados_consultas').select('*', { count: 'exact', head: true }).eq('visualizado', false),
      ]);

      setStats({
        consultasAtivas: consultasAtivas || 0,
        cadernosProcessados: cadernosProcessados || 0,
        documentosRag: documentosRag || 0,
        conversas: conversas || 0,
        resultadosNaoVisualizados: resultadosNaoVisualizados || 0,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      title="Dashboard"
      subtitle="Visão geral do sistema de monitoramento jurídico"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Consultas Ativas"
            value={loading ? "..." : stats.consultasAtivas}
            description={stats.resultadosNaoVisualizados > 0 
              ? `${stats.resultadosNaoVisualizados} resultado(s) novo(s)`
              : "Monitorando intimações"
            }
            icon={Search}
            variant="primary"
          />
          <StatsCard
            title="Cadernos Processados"
            value={loading ? "..." : stats.cadernosProcessados}
            description="Downloads do DJE"
            icon={FileText}
            variant="success"
          />
          <StatsCard
            title="Documentos no RAG"
            value={loading ? "..." : stats.documentosRag}
            description="Sistema de busca inteligente"
            icon={Database}
            variant="default"
          />
          <StatsCard
            title="Conversas IA"
            value={loading ? "..." : stats.conversas}
            description="Chat com assistente jurídico"
            icon={MessageSquare}
            variant="default"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentActivity />
          </div>
          <div>
            <QuickActions />
          </div>
        </div>

        {/* Status Banner */}
        <div className="rounded-xl bg-gradient-to-r from-primary to-accent p-6 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Sistema Operacional</h3>
              <p className="mt-1 text-sm text-primary-foreground/80">
                Todas as integrações com a ComunicaAPI estão funcionando
                normalmente. Sistema RAG ativo com Google Gemini.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              <span className="text-sm font-medium">Online</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
