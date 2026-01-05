import { Plus, Upload, Search, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const actions = [
  {
    title: "Nova Consulta",
    description: "Configurar busca por termo",
    icon: Search,
    href: "/consultas",
    variant: "default" as const,
  },
  {
    title: "Baixar Caderno",
    description: "Download do DJE",
    icon: Plus,
    href: "/cadernos",
    variant: "outline" as const,
  },
  {
    title: "Upload Documento",
    description: "Adicionar arquivo ao RAG",
    icon: Upload,
    href: "/documentos",
    variant: "outline" as const,
  },
  {
    title: "Iniciar Chat",
    description: "Conversar com IA",
    icon: MessageSquare,
    href: "/chat",
    variant: "outline" as const,
  },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Ações Rápidas
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Button
            key={action.title}
            variant={action.variant}
            className="h-auto flex-col items-start gap-1 p-4 text-left"
            onClick={() => navigate(action.href)}
          >
            <action.icon className="h-5 w-5 mb-1" />
            <span className="font-medium">{action.title}</span>
            <span className="text-xs text-muted-foreground font-normal">
              {action.description}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
