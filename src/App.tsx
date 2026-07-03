import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import {
  FileText,
  ShoppingCart,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "@/components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
import ClientesPage from "./pages/ClientesPage";
import ClienteDetailPage from "./pages/ClienteDetailPage";
import FornecedoresPage from "./pages/FornecedoresPage";
import AgentesPage from "./pages/AgentesPage";
import CategoriasSolucaoPage from "./pages/CategoriasSolucaoPage";
import ProdutosPage from "./pages/ProdutosPage";
import SolucoesPage from "./pages/SolucoesPage";
import CondicoesPagamentoPage from "./pages/CondicoesPagamentoPage";
import OrcamentosPage from "./pages/OrcamentosPage";
import PedidosPage from "./pages/PedidosPage";
import PedidoDetailPage from "./pages/PedidoDetailPage";
import ResultadoLfaPage from "./pages/ResultadoLfaPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import ContasReceberPage from "./pages/ContasReceberPage";
import PedidoPrintPage from "./pages/PedidoPrintPage";
import OrcamentoPrintPage from "./pages/OrcamentoPrintPage";
import NotasFiscaisPage from "./pages/NotasFiscaisPage";
import DashboardComercialPage from "./pages/DashboardComercialPage";
import NotFound from "./pages/NotFound.tsx";
import { AuthGuard } from "./components/auth/AuthGuard";
import LoginPage from "./pages/LoginPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/pedidos/:id/imprimir" element={<AuthGuard><PedidoPrintPage /></AuthGuard>} />
          <Route path="/orcamentos/:id/confirmacao" element={<AuthGuard><OrcamentoPrintPage /></AuthGuard>} />
          <Route element={<AuthGuard><AppShell /></AuthGuard>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/clientes/:id" element={<ClienteDetailPage />} />
            <Route path="/fornecedores" element={<FornecedoresPage />} />
            <Route path="/agentes" element={<AgentesPage />} />
            <Route path="/categorias-solucao" element={<CategoriasSolucaoPage />} />
            <Route path="/solucoes" element={<SolucoesPage />} />
            <Route path="/produtos" element={<ProdutosPage />} />
            <Route path="/condicoes-pagamento" element={<CondicoesPagamentoPage />} />
            <Route path="/orcamentos" element={<OrcamentosPage />} />
            <Route
              path="/pedidos"
              element={<PedidosPage />}
            />
            <Route
              path="/pedidos/:id"
              element={<PedidoDetailPage />}
            />
            <Route
              path="/resultado-lfa"
              element={<ResultadoLfaPage />}
            />
            <Route path="/notas-fiscais" element={<NotasFiscaisPage />} />
            <Route path="/dashboard-comercial" element={<DashboardComercialPage />} />
            <Route
              path="/contas-receber"
              element={<ContasReceberPage />}
            />
            <Route
              path="/contas-pagar"
              element={
                <PlaceholderPage
                  title="Contas a Pagar"
                  description="Pagamentos a fornecedores, comissões e custos extras."
                  icon={ArrowUpCircle}
                  emptyTitle="Nenhuma conta a pagar"
                  emptyDescription="Inclui repasses automáticos e lançamentos manuais."
                  ctaLabel="Lançar pagamento"
                />
              }
            />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
