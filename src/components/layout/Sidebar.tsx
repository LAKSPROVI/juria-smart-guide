import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  FileText,
  MessageSquare,
  FolderOpen,
  Settings,
  Scale,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Trash2,
  Archive,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Consultas", href: "/consultas", icon: Search },
  { name: "Cadernos DJE", href: "/cadernos", icon: FileText },
  { name: "Chat IA", href: "/chat", icon: MessageSquare },
  { name: "Documentos", href: "/documentos", icon: FolderOpen },
  { name: "Registros", href: "/registros", icon: ClipboardList },
  { name: "Arquivo", href: "/arquivo", icon: Archive },
  { name: "Lixeira", href: "/lixeira", icon: Trash2 },
  { name: "Usuários", href: "/usuarios", icon: Users },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Scale className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="text-lg font-semibold text-sidebar-foreground">
                JurisMon
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="border-t border-sidebar-border p-4">
            <div className="rounded-lg bg-sidebar-accent p-3">
              <p className="text-xs text-sidebar-foreground/70">
                Monitoramento Jurídico
              </p>
              <p className="mt-1 text-sm font-medium text-sidebar-foreground">
                Sistema RAG Ativo
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
