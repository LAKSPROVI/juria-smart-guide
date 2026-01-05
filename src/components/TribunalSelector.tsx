import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Lista completa de tribunais do PJe/ComunicaAPI
export const tribunaisDisponiveis = [
  // Justiça Federal
  { value: "TRF1", label: "TRF1", grupo: "Justiça Federal" },
  { value: "TRF2", label: "TRF2", grupo: "Justiça Federal" },
  { value: "TRF3", label: "TRF3", grupo: "Justiça Federal" },
  { value: "TRF4", label: "TRF4", grupo: "Justiça Federal" },
  { value: "TRF5", label: "TRF5", grupo: "Justiça Federal" },
  { value: "TRF6", label: "TRF6", grupo: "Justiça Federal" },
  // Justiça do Trabalho
  { value: "TST", label: "TST", grupo: "Justiça do Trabalho" },
  { value: "TRT1", label: "TRT1", grupo: "Justiça do Trabalho" },
  { value: "TRT2", label: "TRT2", grupo: "Justiça do Trabalho" },
  { value: "TRT3", label: "TRT3", grupo: "Justiça do Trabalho" },
  { value: "TRT4", label: "TRT4", grupo: "Justiça do Trabalho" },
  { value: "TRT5", label: "TRT5", grupo: "Justiça do Trabalho" },
  { value: "TRT6", label: "TRT6", grupo: "Justiça do Trabalho" },
  { value: "TRT7", label: "TRT7", grupo: "Justiça do Trabalho" },
  { value: "TRT8", label: "TRT8", grupo: "Justiça do Trabalho" },
  { value: "TRT9", label: "TRT9", grupo: "Justiça do Trabalho" },
  { value: "TRT10", label: "TRT10", grupo: "Justiça do Trabalho" },
  { value: "TRT11", label: "TRT11", grupo: "Justiça do Trabalho" },
  { value: "TRT12", label: "TRT12", grupo: "Justiça do Trabalho" },
  { value: "TRT13", label: "TRT13", grupo: "Justiça do Trabalho" },
  { value: "TRT14", label: "TRT14", grupo: "Justiça do Trabalho" },
  { value: "TRT15", label: "TRT15", grupo: "Justiça do Trabalho" },
  { value: "TRT16", label: "TRT16", grupo: "Justiça do Trabalho" },
  { value: "TRT17", label: "TRT17", grupo: "Justiça do Trabalho" },
  { value: "TRT18", label: "TRT18", grupo: "Justiça do Trabalho" },
  { value: "TRT19", label: "TRT19", grupo: "Justiça do Trabalho" },
  { value: "TRT20", label: "TRT20", grupo: "Justiça do Trabalho" },
  { value: "TRT21", label: "TRT21", grupo: "Justiça do Trabalho" },
  { value: "TRT22", label: "TRT22", grupo: "Justiça do Trabalho" },
  { value: "TRT23", label: "TRT23", grupo: "Justiça do Trabalho" },
  { value: "TRT24", label: "TRT24", grupo: "Justiça do Trabalho" },
  // Justiça Estadual
  { value: "TJAC", label: "TJAC", grupo: "Justiça Estadual" },
  { value: "TJAL", label: "TJAL", grupo: "Justiça Estadual" },
  { value: "TJAM", label: "TJAM", grupo: "Justiça Estadual" },
  { value: "TJAP", label: "TJAP", grupo: "Justiça Estadual" },
  { value: "TJBA", label: "TJBA", grupo: "Justiça Estadual" },
  { value: "TJCE", label: "TJCE", grupo: "Justiça Estadual" },
  { value: "TJDFT", label: "TJDFT", grupo: "Justiça Estadual" },
  { value: "TJES", label: "TJES", grupo: "Justiça Estadual" },
  { value: "TJGO", label: "TJGO", grupo: "Justiça Estadual" },
  { value: "TJMA", label: "TJMA", grupo: "Justiça Estadual" },
  { value: "TJMG", label: "TJMG", grupo: "Justiça Estadual" },
  { value: "TJMS", label: "TJMS", grupo: "Justiça Estadual" },
  { value: "TJMT", label: "TJMT", grupo: "Justiça Estadual" },
  { value: "TJPA", label: "TJPA", grupo: "Justiça Estadual" },
  { value: "TJPB", label: "TJPB", grupo: "Justiça Estadual" },
  { value: "TJPE", label: "TJPE", grupo: "Justiça Estadual" },
  { value: "TJPI", label: "TJPI", grupo: "Justiça Estadual" },
  { value: "TJPR", label: "TJPR", grupo: "Justiça Estadual" },
  { value: "TJRJ", label: "TJRJ", grupo: "Justiça Estadual" },
  { value: "TJRN", label: "TJRN", grupo: "Justiça Estadual" },
  { value: "TJRO", label: "TJRO", grupo: "Justiça Estadual" },
  { value: "TJRR", label: "TJRR", grupo: "Justiça Estadual" },
  { value: "TJRS", label: "TJRS", grupo: "Justiça Estadual" },
  { value: "TJSC", label: "TJSC", grupo: "Justiça Estadual" },
  { value: "TJSE", label: "TJSE", grupo: "Justiça Estadual" },
  { value: "TJSP", label: "TJSP", grupo: "Justiça Estadual" },
  { value: "TJTO", label: "TJTO", grupo: "Justiça Estadual" },
  // Justiça Eleitoral
  { value: "TSE", label: "TSE", grupo: "Justiça Eleitoral" },
  { value: "TREAC", label: "TRE-AC", grupo: "Justiça Eleitoral" },
  { value: "TREAL", label: "TRE-AL", grupo: "Justiça Eleitoral" },
  { value: "TREAM", label: "TRE-AM", grupo: "Justiça Eleitoral" },
  { value: "TREAP", label: "TRE-AP", grupo: "Justiça Eleitoral" },
  { value: "TREBA", label: "TRE-BA", grupo: "Justiça Eleitoral" },
  { value: "TRECE", label: "TRE-CE", grupo: "Justiça Eleitoral" },
  { value: "TREDF", label: "TRE-DF", grupo: "Justiça Eleitoral" },
  { value: "TREES", label: "TRE-ES", grupo: "Justiça Eleitoral" },
  { value: "TREGO", label: "TRE-GO", grupo: "Justiça Eleitoral" },
  { value: "TREMA", label: "TRE-MA", grupo: "Justiça Eleitoral" },
  { value: "TREMG", label: "TRE-MG", grupo: "Justiça Eleitoral" },
  { value: "TREMS", label: "TRE-MS", grupo: "Justiça Eleitoral" },
  { value: "TREMT", label: "TRE-MT", grupo: "Justiça Eleitoral" },
  { value: "TREPA", label: "TRE-PA", grupo: "Justiça Eleitoral" },
  { value: "TREPB", label: "TRE-PB", grupo: "Justiça Eleitoral" },
  { value: "TREPE", label: "TRE-PE", grupo: "Justiça Eleitoral" },
  { value: "TREPI", label: "TRE-PI", grupo: "Justiça Eleitoral" },
  { value: "TREPR", label: "TRE-PR", grupo: "Justiça Eleitoral" },
  { value: "TRERJ", label: "TRE-RJ", grupo: "Justiça Eleitoral" },
  { value: "TRERN", label: "TRE-RN", grupo: "Justiça Eleitoral" },
  { value: "TRERO", label: "TRE-RO", grupo: "Justiça Eleitoral" },
  { value: "TRERR", label: "TRE-RR", grupo: "Justiça Eleitoral" },
  { value: "TRERS", label: "TRE-RS", grupo: "Justiça Eleitoral" },
  { value: "TRESC", label: "TRE-SC", grupo: "Justiça Eleitoral" },
  { value: "TRESE", label: "TRE-SE", grupo: "Justiça Eleitoral" },
  { value: "TRESP", label: "TRE-SP", grupo: "Justiça Eleitoral" },
  { value: "TRETO", label: "TRE-TO", grupo: "Justiça Eleitoral" },
  // Tribunais Superiores
  { value: "STJ", label: "STJ", grupo: "Tribunais Superiores" },
  { value: "STF", label: "STF", grupo: "Tribunais Superiores" },
  // Justiça Militar
  { value: "STM", label: "STM", grupo: "Justiça Militar" },
];

export const grupos = [
  "Justiça Federal",
  "Justiça do Trabalho", 
  "Justiça Estadual",
  "Justiça Eleitoral",
  "Tribunais Superiores",
  "Justiça Militar",
];

interface TribunalSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  multiple?: boolean;
  excludeTribunais?: string[];
}

export function TribunalSelector({
  value,
  onChange,
  placeholder = "Selecione os tribunais...",
  multiple = true,
  excludeTribunais = [],
}: TribunalSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const tribunaisFiltrados = tribunaisDisponiveis.filter(t => 
    !excludeTribunais.includes(t.value) &&
    (t.label.toLowerCase().includes(search.toLowerCase()) ||
     t.grupo.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleTribunal = (tribunal: string) => {
    if (multiple) {
      if (value.includes(tribunal)) {
        onChange(value.filter(v => v !== tribunal));
      } else {
        onChange([...value, tribunal]);
      }
    } else {
      onChange([tribunal]);
      setOpen(false);
    }
  };

  const toggleGrupo = (grupo: string) => {
    const tribunaisDoGrupo = tribunaisDisponiveis
      .filter(t => t.grupo === grupo && !excludeTribunais.includes(t.value))
      .map(t => t.value);
    
    const todosJaSelecionados = tribunaisDoGrupo.every(t => value.includes(t));
    
    if (todosJaSelecionados) {
      onChange(value.filter(v => !tribunaisDoGrupo.includes(v)));
    } else {
      onChange([...new Set([...value, ...tribunaisDoGrupo])]);
    }
  };

  const selecionarTodos = () => {
    const todosTribunais = tribunaisDisponiveis
      .filter(t => !excludeTribunais.includes(t.value))
      .map(t => t.value);
    onChange(todosTribunais);
  };

  const limparSelecao = () => {
    onChange([]);
  };

  const removerTribunal = (tribunal: string) => {
    onChange(value.filter(v => v !== tribunal));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10"
          >
            <span className="truncate">
              {value.length === 0 
                ? placeholder 
                : value.length === 1
                  ? value[0]
                  : `${value.length} tribunais selecionados`
              }
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar tribunal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          {multiple && (
            <div className="p-2 border-b flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selecionarTodos}
                className="flex-1"
              >
                Selecionar Todos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={limparSelecao}
                className="flex-1"
              >
                Limpar
              </Button>
            </div>
          )}

          <ScrollArea className="h-[300px]">
            <div className="p-2">
              {grupos.map(grupo => {
                const tribunaisDoGrupo = tribunaisFiltrados.filter(t => t.grupo === grupo);
                if (tribunaisDoGrupo.length === 0) return null;

                const todosGrupoSelecionados = tribunaisDoGrupo.every(t => value.includes(t.value));
                const algunsGrupoSelecionados = tribunaisDoGrupo.some(t => value.includes(t.value));

                return (
                  <div key={grupo} className="mb-3">
                    <div 
                      className="flex items-center gap-2 py-1 px-2 bg-muted rounded-md cursor-pointer hover:bg-muted/80"
                      onClick={() => multiple && toggleGrupo(grupo)}
                    >
                      {multiple && (
                        <Checkbox 
                          checked={todosGrupoSelecionados}
                          className={cn(algunsGrupoSelecionados && !todosGrupoSelecionados && "opacity-50")}
                        />
                      )}
                      <Label className="text-sm font-semibold cursor-pointer">{grupo}</Label>
                    </div>
                    <div className="mt-1 ml-4 grid grid-cols-3 gap-1">
                      {tribunaisDoGrupo.map(tribunal => (
                        <div
                          key={tribunal.value}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-muted/50",
                            value.includes(tribunal.value) && "bg-primary/10"
                          )}
                          onClick={() => toggleTribunal(tribunal.value)}
                        >
                          {multiple && (
                            <Checkbox checked={value.includes(tribunal.value)} />
                          )}
                          <span className="text-sm">{tribunal.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Badges dos selecionados */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.slice(0, 8).map(t => (
            <Badge 
              key={t} 
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-destructive/20"
              onClick={() => removerTribunal(t)}
            >
              {t}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
          {value.length > 8 && (
            <Badge variant="outline" className="text-xs">
              +{value.length - 8} mais
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}