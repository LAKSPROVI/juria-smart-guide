import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { FileText, Search, Database, MessageSquare } from "lucide-react";

export default function Dashboard() {
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
            value={12}
            description="8 agendadas para hoje"
            icon={Search}
            variant="primary"
            trend={{ value: 15, isPositive: true }}
          />
          <StatsCard
            title="Cadernos Processados"
            value={847}
            description="Últimos 30 dias"
            icon={FileText}
            variant="success"
            trend={{ value: 8, isPositive: true }}
          />
          <StatsCard
            title="Documentos no RAG"
            value="2.4k"
            description="156 GB de dados"
            icon={Database}
            variant="default"
          />
          <StatsCard
            title="Conversas IA"
            value={342}
            description="Neste mês"
            icon={MessageSquare}
            variant="default"
            trend={{ value: 23, isPositive: true }}
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
                normalmente. Última sincronização: há 5 minutos.
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
