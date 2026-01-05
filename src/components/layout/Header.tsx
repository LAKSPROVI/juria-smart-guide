import { useState, useEffect } from "react";
import { Bell, Search, User, Check, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

interface Notificacao {
  id: string;
  tipo: string;
  mensagem: string;
  data: Date;
  lida: boolean;
  link?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotificacoes();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadNotificacoes, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotificacoes = async () => {
    try {
      // Buscar resultados não visualizados
      const { data: resultados, error: e1 } = await supabase
        .from('resultados_consultas')
        .select('id, numero_processo, sigla_tribunal, tipo_comunicacao, created_at, consulta_id')
        .eq('visualizado', false)
        .order('created_at', { ascending: false })
        .limit(10);

      // Buscar erros recentes de execuções
      const { data: erros, error: e2 } = await supabase
        .from('execucoes_agendadas')
        .select('id, erro_mensagem, created_at, consulta_id')
        .eq('status', 'erro')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      const notifs: Notificacao[] = [];

      // Adicionar resultados como notificações
      if (resultados && !e1) {
        resultados.forEach(r => {
          notifs.push({
            id: r.id,
            tipo: 'resultado',
            mensagem: `Nova intimação: ${r.numero_processo || r.tipo_comunicacao || 'Processo'} - ${r.sigla_tribunal || 'Tribunal'}`,
            data: new Date(r.created_at),
            lida: false,
            link: '/resultados',
          });
        });
      }

      // Adicionar erros como notificações
      if (erros && !e2) {
        erros.forEach(e => {
          notifs.push({
            id: e.id,
            tipo: 'erro',
            mensagem: `Erro na consulta: ${e.erro_mensagem?.substring(0, 50) || 'Erro desconhecido'}`,
            data: new Date(e.created_at),
            lida: false,
            link: '/registros',
          });
        });
      }

      // Ordenar por data
      notifs.sort((a, b) => b.data.getTime() - a.data.getTime());
      
      setNotificacoes(notifs);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLido = async (notif: Notificacao) => {
    if (notif.tipo === 'resultado') {
      await supabase
        .from('resultados_consultas')
        .update({ visualizado: true })
        .eq('id', notif.id);
    }
    
    setNotificacoes(prev => prev.filter(n => n.id !== notif.id));
    
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const marcarTodosComoLidos = async () => {
    const resultadoIds = notificacoes
      .filter(n => n.tipo === 'resultado')
      .map(n => n.id);
    
    if (resultadoIds.length > 0) {
      await supabase
        .from('resultados_consultas')
        .update({ visualizado: true })
        .in('id', resultadoIds);
    }
    
    setNotificacoes([]);
  };

  const naoLidas = notificacoes.length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="w-64 pl-9 bg-secondary/50 border-0 focus-visible:ring-1"
          />
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {naoLidas > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {naoLidas > 9 ? '9+' : naoLidas}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notificações</span>
              {naoLidas > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={marcarTodosComoLidos}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Marcar todas como lidas
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-[300px]">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Carregando...
                </div>
              ) : notificacoes.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma notificação nova
                </div>
              ) : (
                notificacoes.map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    className="flex flex-col items-start p-3 cursor-pointer"
                    onClick={() => marcarComoLido(notif)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Badge 
                        variant={notif.tipo === 'erro' ? 'destructive' : 'default'}
                        className="text-xs"
                      >
                        {notif.tipo === 'erro' ? 'Erro' : 'Novo'}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {notif.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm mt-1 line-clamp-2">{notif.mensagem}</p>
                  </DropdownMenuItem>
                ))
              )}
            </ScrollArea>
            {naoLidas > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="justify-center text-primary"
                  onClick={() => navigate('/resultados')}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver todos os resultados
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  AD
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">Administrador</p>
                <p className="text-xs text-muted-foreground">
                  admin@jurismon.com.br
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}