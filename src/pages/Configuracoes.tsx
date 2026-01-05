import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Key,
  Database,
  Mail,
  MessageSquare,
  Shield,
  Webhook,
  CheckCircle,
  Server,
  Globe,
  Loader2,
  XCircle,
  RefreshCw,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getConfigProxy, updateConfigProxy, testarProxy, INSTRUCOES_PROXY } from "@/lib/proxy";
import { registrarLog } from "@/lib/logging";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Configuracoes() {
  const { toast } = useToast();
  const [proxyUrl, setProxyUrl] = useState("");
  const [proxyToken, setProxyToken] = useState("");
  const [proxyAtivo, setProxyAtivo] = useState(false);
  const [proxyStatus, setProxyStatus] = useState<string | null>(null);
  const [loadingProxy, setLoadingProxy] = useState(true);
  const [testingProxy, setTestingProxy] = useState(false);
  const [showInstrucoes, setShowInstrucoes] = useState(false);

  useEffect(() => {
    loadProxyConfig();
  }, []);

  const loadProxyConfig = async () => {
    try {
      const config = await getConfigProxy();
      if (config) {
        setProxyUrl(config.url_base || "");
        setProxyToken(config.token || "");
        setProxyAtivo(config.ativo);
        setProxyStatus(config.status_ultimo_teste);
      }
    } catch (error) {
      console.error("Erro ao carregar config proxy:", error);
    } finally {
      setLoadingProxy(false);
    }
  };

  const handleSaveProxy = async () => {
    try {
      const success = await updateConfigProxy({
        url_base: proxyUrl || null,
        token: proxyToken || null,
        ativo: proxyAtivo,
      });

      if (success) {
        toast({
          title: "Configuração salva",
          description: "A configuração do proxy foi atualizada.",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        variant: "destructive",
      });
    }
  };

  const handleTestarProxy = async () => {
    setTestingProxy(true);
    try {
      const resultado = await testarProxy();
      setProxyStatus(resultado.sucesso ? 'ok' : 'erro');
      
      toast({
        title: resultado.sucesso ? "Proxy funcionando!" : "Erro no proxy",
        description: resultado.mensagem,
        variant: resultado.sucesso ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Erro ao testar",
        variant: "destructive",
      });
    } finally {
      setTestingProxy(false);
    }
  };

  const handleSave = () => {
    registrarLog({
      tipo: 'admin',
      acao: 'editar',
      detalhes: { secao: 'configuracoes_gerais' },
    });
    
    toast({
      title: "Configurações salvas",
      description: "Suas alterações foram aplicadas com sucesso.",
    });
  };

  return (
    <AppLayout
      title="Configurações"
      subtitle="Gerencie as configurações do sistema"
    >
      <div className="animate-fade-in">
        <Tabs defaultValue="proxy" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="proxy">Proxy Brasil</TabsTrigger>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
            <TabsTrigger value="api">API & Integrações</TabsTrigger>
            <TabsTrigger value="seguranca">Segurança</TabsTrigger>
          </TabsList>

          {/* Proxy Brasil */}
          <TabsContent value="proxy" className="space-y-6">
            <Card className="shadow-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  Configuração do Proxy Brasil
                </CardTitle>
                <CardDescription>
                  Configure um proxy no Brasil para que as consultas agendadas funcionem mesmo com o bloqueio geográfico da API do PJe.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingProxy ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando...
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div>
                        <Label className="text-base">Ativar Proxy</Label>
                        <p className="text-sm text-muted-foreground">
                          Usar proxy para consultas agendadas (cron)
                        </p>
                      </div>
                      <Switch 
                        checked={proxyAtivo} 
                        onCheckedChange={setProxyAtivo}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>URL do Proxy</Label>
                      <Input
                        placeholder="https://seu-proxy.com.br ou http://localhost:3001"
                        value={proxyUrl}
                        onChange={(e) => setProxyUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        URL do serviço rodando no Brasil (VPS, Cloudflare Tunnel, etc.)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Token de Autenticação</Label>
                      <Input
                        type="password"
                        placeholder="Token secreto para autenticar requisições"
                        value={proxyToken}
                        onChange={(e) => setProxyToken(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Status:</span>
                      {proxyStatus === 'ok' ? (
                        <Badge className="bg-success/10 text-success gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Funcionando
                        </Badge>
                      ) : proxyStatus === 'erro' ? (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Erro
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Não testado</Badge>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleSaveProxy}>
                        Salvar Configuração
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleTestarProxy}
                        disabled={!proxyUrl || testingProxy}
                      >
                        {testingProxy ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Testar Conexão
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  Como Configurar o Proxy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Dialog open={showInstrucoes} onOpenChange={setShowInstrucoes}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Globe className="h-4 w-4 mr-2" />
                      Ver Instruções Detalhadas
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>Instruções de Configuração do Proxy</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh] pr-4">
                      <div className="prose prose-sm dark:prose-invert">
                        <pre className="whitespace-pre-wrap text-xs bg-muted p-4 rounded-lg overflow-auto">
                          {INSTRUCOES_PROXY}
                        </pre>
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>

                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <p>📍 <strong>Por que preciso de um proxy?</strong></p>
                  <p>A API do PJe (ComunicaAPI) bloqueia requisições de servidores fora do Brasil. Para consultas agendadas funcionarem, você precisa de um serviço hospedado no Brasil.</p>
                  
                  <p className="mt-4">🚀 <strong>Opções recomendadas:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>VPS no Brasil (DigitalOcean, Vultr, Hostinger) - R$ 20-50/mês</li>
                    <li>Cloudflare Tunnel para máquina local no Brasil - Gratuito</li>
                    <li>Raspberry Pi com internet fixa - Custo único</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Geral */}
          <TabsContent value="geral" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Sistema RAG
                </CardTitle>
                <CardDescription>
                  Configure as opções do sistema de Retrieval Augmented Generation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Processamento Automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Processar automaticamente novos documentos para o RAG
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Modelo de Embedding</Label>
                    <Select defaultValue="bert-pt">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bert-pt">
                          BERTimbau (Português)
                        </SelectItem>
                        <SelectItem value="multilingual">
                          Multilingual E5
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Chunks por Documento</Label>
                    <Select defaultValue="auto">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Automático</SelectItem>
                        <SelectItem value="500">500 tokens</SelectItem>
                        <SelectItem value="1000">1000 tokens</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Retenção de Arquivos (dias)</Label>
                  <Input type="number" defaultValue="90" className="w-32" />
                  <p className="text-xs text-muted-foreground">
                    Tempo para manter arquivos brutos antes da limpeza automática
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Tribunais Monitorados</CardTitle>
                <CardDescription>
                  Selecione os tribunais para monitoramento automático.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {["TJSP", "TJRJ", "TJMG", "TRF1", "TRF3", "TRT2", "TST", "STJ", "STF"].map(
                    (tribunal) => (
                      <Badge
                        key={tribunal}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        {tribunal}
                      </Badge>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notificações */}
          <TabsContent value="notificacoes" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Preferências de Notificação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label>Notificações por Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Receber alertas de novas intimações por email
                      </p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label>Notificações WhatsApp</Label>
                      <p className="text-sm text-muted-foreground">
                        Alertas urgentes via WhatsApp
                      </p>
                    </div>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Webhook className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label>Webhook</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar eventos para URL externa
                      </p>
                    </div>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Destinatários de Email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="email@exemplo.com" className="flex-1" />
                  <Button variant="outline">Adicionar</Button>
                </div>
                <div className="space-y-2">
                  {["admin@escritorio.com.br", "advogado@escritorio.com.br"].map(
                    (email) => (
                      <div
                        key={email}
                        className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                      >
                        <span className="text-sm">{email}</span>
                        <Button variant="ghost" size="sm" className="h-7 text-destructive">
                          Remover
                        </Button>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API & Integrações */}
          <TabsContent value="api" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  Chaves de API
                </CardTitle>
                <CardDescription>
                  Configure as credenciais para integrações externas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Google Gemini API Key</Label>
                  <div className="flex gap-2">
                    <Input type="password" value="••••••••••••••••" readOnly className="font-mono" />
                    <Button variant="outline">Alterar</Button>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-success">
                    <CheckCircle className="h-3 w-3" />
                    Configurada e funcionando
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Twilio (WhatsApp) - Opcional</Label>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Input placeholder="Account SID" />
                    <Input placeholder="Auth Token" type="password" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Status das Integrações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { nome: "ComunicaAPI PJe", status: "online" },
                    { nome: "Google Gemini", status: "online" },
                    { nome: "Proxy Brasil", status: proxyAtivo && proxyStatus === 'ok' ? "online" : "offline" },
                    { nome: "Twilio WhatsApp", status: "offline" },
                  ].map((integracao) => (
                    <div
                      key={integracao.nome}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <span className="font-medium">{integracao.nome}</span>
                      <Badge
                        className={
                          integracao.status === "online"
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {integracao.status === "online" ? "Online" : "Não configurado"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Segurança */}
          <TabsContent value="seguranca" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Segurança da Conta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Autenticação de Dois Fatores (2FA)</Label>
                    <p className="text-sm text-muted-foreground">
                      Adicione uma camada extra de segurança
                    </p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Alterar Senha</Label>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Input type="password" placeholder="Senha atual" />
                    <Input type="password" placeholder="Nova senha" />
                  </div>
                </div>
                <Button variant="outline">Atualizar Senha</Button>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Sessões Ativas</CardTitle>
                <CardDescription>
                  Dispositivos conectados à sua conta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { dispositivo: "Chrome - Windows", local: "São Paulo, BR", atual: true },
                    { dispositivo: "Safari - iPhone", local: "São Paulo, BR", atual: false },
                  ].map((sessao, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div>
                        <p className="font-medium">{sessao.dispositivo}</p>
                        <p className="text-sm text-muted-foreground">{sessao.local}</p>
                      </div>
                      {sessao.atual ? (
                        <Badge variant="secondary">Sessão atual</Badge>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-destructive">
                          Encerrar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-6">
          <Button size="lg" onClick={handleSave}>
            Salvar Configurações
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
