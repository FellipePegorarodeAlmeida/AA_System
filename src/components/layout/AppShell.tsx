import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Truck,
  UserCog,
  Tags,
  Package,
  FileText,
  ShoppingCart,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  Menu,
  Database,
  CreditCard,
  LogOut,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";

type NavItem = { to: string; label: string; icon: typeof Users; end?: boolean };
type NavGroup = { label: string | null; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: null,
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }],
  },
  {
    label: "Comercial",
    items: [
      { to: "/dashboard-comercial", label: "Análise Comercial", icon: BarChart3 },
      { to: "/orcamentos", label: "Orçamentos", icon: FileText },
      { to: "/pedidos", label: "Pedidos", icon: ShoppingCart },
      { to: "/notas-fiscais", label: "Notas Fiscais", icon: Receipt },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { to: "/contas-receber", label: "Contas a Receber", icon: ArrowDownCircle },
      { to: "/contas-pagar", label: "Contas a Pagar", icon: ArrowUpCircle },
      { to: "/resultado-lfa", label: "Projeção Futura", icon: CreditCard },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { to: "/clientes", label: "Clientes", icon: Users },
      { to: "/fornecedores", label: "Fornecedores", icon: Truck },
      { to: "/agentes", label: "Agentes", icon: UserCog },
      { to: "/categorias-solucao", label: "Tipos de Produto", icon: Tags },
      { to: "/solucoes", label: "Soluções Gráficas", icon: Package },
      // { to: "/produtos", label: "Produtos / Materiais", icon: Package },
      { to: "/condicoes-pagamento", label: "Condições de Pagamento", icon: CreditCard },
    ],
  },
];

const allItems = navGroups.flatMap((g) => g.items);

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          G
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-sidebar-accent-foreground">
            AA Representação
          </div>
          <div className="text-[11px] text-muted-foreground">
            Sistema de controle
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {navGroups.map((group, gi) => (
          <div key={gi} className="space-y-1">
            {group.label && (
              <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive &&
                      "bg-sidebar-accent text-sidebar-accent-foreground font-medium ring-1 ring-primary/30"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="surface-card p-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            <span>Banco de dados</span>
          </div>
          <div className="mt-1 font-medium text-success">
            Supabase conectado
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
            Conexão manual via VITE_SUPABASE_URL.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const currentItem = allItems.find((i) =>
    i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
              <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">
              {currentItem?.label ?? "Dashboard"}
            </h1>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => supabase.auth.signOut()}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
