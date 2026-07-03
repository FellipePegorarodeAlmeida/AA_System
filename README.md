# GraphFlow Suite - CRM/ERP System

O **GraphFlow Suite** é uma solução moderna de CRM e ERP desenvolvida para otimizar fluxos comerciais complexos, com foco em gestão de orçamentos, vendas e relacionamento com clientes e fornecedores. O sistema equilibra uma interface premium e intuitiva com uma robusta lógica de cálculos financeiros para operações de **Revenda** e **Representação**.

## 🚀 Tecnologias

- **Frontend**: React 18 + Vite
- **Linguagem**: TypeScript (Strict Mode)
- **Estilização**: Tailwind CSS + Shadcn UI
- **Backend/Database**: Supabase (PostgreSQL)
- **Ícones**: Lucide React
- **Validações**: Lógica customizada para CPF/CNPJ e máscaras financeiras.

---

## 📦 Módulos Principais

### 1. Gestão de Clientes (CRM)
- Cadastro completo de clientes (PF/PJ).
- **Múltiplos Endereços**: Gestão de endereços de faturamento e entrega com integração automática via API ViaCEP.
- **Múltiplos Contatos**: Mini-CRUD para gestão de pessoas de contato dentro de uma mesma empresa.
- **Inteligência de Agente**: Vínculo automático entre cliente e agente comercial preferencial.

### 2. Gestão de Fornecedores
- Cadastro com validação real de CPF/CNPJ.
- **Mapeamento de Soluções**: Vínculo técnico entre fornecedores e os tipos de serviços/soluções que eles executam.
- Interface organizada para rápida consulta e edição.

### 3. Orçamentos & Propostas (Core)
O módulo de orçamentos é o motor de inteligência do sistema, apresentando:
- **Fluxo de Itens Guiado**: Seleção de "Solução" que filtra automaticamente os "Fornecedores" aptos, garantindo integridade técnica.
- **Edição Fluida**: Descrições de itens e valores sempre editáveis com salvamento automático (`onBlur`), eliminando cliques desnecessários.
- **Prevenção de Erros**: Sistema de trava contra duplicidade de orçamentos (Race Condition Guard) e limpeza de campos obsoletos ao trocar modelos de operação.
- **Duplicação de Itens**: Atalho para clonar configurações técnicas de um item para outro com um clique.

### 4. Inteligência de Fechamento (Closing)
Uma aba dedicada para análise financeira e formação de preço estratégica:
- **Fluxo Analítico Sequencial**: Organização vertical que guia o usuário do custo à margem líquida, garantindo clareza em cada etapa da operação.
- **Modo Revenda (Price Formation)**: 
  - **Lógica "Por Dentro" (Markup)**: Cálculo de preço final baseado em divisor, garantindo que as margens desejadas sejam reais sobre o faturamento.
  - **Ajuste Financeiro Dinâmico**: Cálculo automático da taxa financeira aplicada com base no **Prazo Médio** (média ponderada das parcelas da condição de pagamento).
  - **Composição Analítica**: Demonstrativo detalhado em R$ de todos os incidentes (Custo Fornecedor, Frete, Financeiro, Comissão e Imposto).
  - **Visibilidade de Fornecedores**: Identificação automática de todos os parceiros envolvidos no subtotal operacional.
- **Modo Representação (Split Flow)**:
  - Divisão detalhada de comissões (Total vs. LFA vs. Agente).
  - Cálculo de impostos sobre o faturamento de comissão da empresa.
  - Visualização de receita líquida estimada.

### 5. Gestão de Pedidos (Order Management)
- **Painel Operacional**: Acompanhamento de pedidos em produção, faturados e concluídos, gerados a partir da conversão de orçamentos.
- **Detalhamento Integrado**: Abas dedicadas para Resumo Operacional, Especificações de Itens, Visão Financeira (fechamento herdado) e Histórico.
- **Rastreabilidade**: Cada item recebe um número sequencial único global, permitindo busca específica e cruzamento rápido de dados na listagem.
- **Navegação Bidirecional**: Links dinâmicos conectando diretamente a tela do Pedido ao seu Orçamento de origem e vice-versa.

---


## 🎨 Padrões de Design & UX

- **Aesthetics**: Uso de paletas HSL coordenadas, sombras suaves e micro-animações para uma sensação premium.
- **Contraste & Dark Mode**: Interface otimizada para o tema escuro, com diferenciação clara entre campos editáveis e campos calculados (`read-only` com bordas tracejadas e fundos `muted`).
- **Inputs Monetários**: Formatação em tempo real (R$) com tratamento decimal rigoroso no banco de dados.
- **Responsividade**: Interfaces adaptáveis para diferentes resoluções, priorizando a visibilidade de dados críticos.

---

## 🛠️ Configuração do Desenvolvedor

### Variáveis de Ambiente
Crie um arquivo `.env` na raiz com:
```env
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
```

### Instalação
```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

---

## 🗺️ Roadmap / Próximos Passos
- [ ] Geração de Proposta Comercial em PDF.
- [ ] Módulo Financeiro (Contas a Receber/Pagar) integrado ao Fechamento e Notas Fiscais.
- [ ] Dashboard de performance de Agentes.

---

Desenvolvido com foco em eficiência operacional e excelência visual.




Comentários - Fellipe

última atualização do módulo (01/05/2026)

Titulo: ERP LFA UX v02. Estamos desenvolvendo um ERP/CRM próprio para representação e revenda no setor gráfico. Status atual do sistema: - Código versionado no GitHub - Frontend com edição em tempo real via Antigravity - Frontend: React 18 + Vite - Linguagem: TypeScript (Strict Mode) - Estilização: Tailwind CSS + Shadcn UI - Backend/Database: Supabase (PostgreSQL) Módulos já estruturados: - Clientes (UX v01 ok) - Fornecedores (UX v01 ok) -------------- - Evitamos refatorações amplas — trabalhamos de forma incremental Situação atual: IMPORTANTE: - Queremos análise crítica, não execução cega - Priorizar arquitetura e lógica antes de implementação - Evitar retrabalho estrutural Para essa thread, precisamos arredondar alguns pontos de UX, debater um pouco apresentação, telas, funcionalidades e outros para evitar retrabalhos, quando tivermos avanços de módulos.