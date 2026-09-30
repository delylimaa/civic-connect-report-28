# Cidadão Conectado

Crie um aplicativo web chamado "Alerta Cidadão: Tecnologia a Serviço da Sociedade".

CONTEXTO DO PROBLEMA:

Cidadãos não têm um canal acessível para reportar problemas de infraestrutura 

urbana (buracos nas vias, falhas de iluminação pública, acúmulo de lixo) 

diretamente à prefeitura, e não recebem retorno sobre o andamento dos chamados. 

O app resolve isso permitindo reporte com foto, geolocalização e acompanhamento 

transparente do status, funcionando como uma plataforma de tecnologia cívica.

STACK TÉCNICA:

- Frontend: React + TypeScript + Tailwind CSS + shadcn/ui

- Backend: Supabase (PostgreSQL, Auth, Storage, Realtime)

- Mapa: Leaflet (open-source) ou Mapbox GL

- Gráficos/estatísticas: Recharts, para o painel do gestor

- Atualizações em tempo real via Supabase Realtime (status muda na tela 

  do cidadão sem precisar recarregar a página)

DESIGN E QUALIDADE VISUAL:

- Design system consistente, com paleta de cores institucional (tons de azul 

  e verde, transmitindo confiança e serviço público)

- Componentes shadcn/ui customizados (cards, badges de status, dialogs)

- Micro-interações e transições suaves (loading skeletons, toasts de feedback)

- Layout mobile-first com bottom navigation no celular e sidebar no desktop

- Ícones consistentes (lucide-react)

PRIMEIRO PASSO: 

Ative a integração com Supabase para autenticação, banco de dados e storage.

AUTENTICAÇÃO E PERFIS:

- Cadastro/login por e-mail e senha (Supabase Auth)

- Dois perfis: "cidadao" e "gestor"

- Gestores acessam um painel administrativo extra com métricas e filtros

BANCO DE DADOS (Supabase / PostgreSQL):

1. profiles

   - id (uuid, referencia auth.users)

   - nome (text)

   - perfil (text: "cidadao" | "gestor")

   - criado_em (timestamp, default now())

2. ocorrencias

   - id (uuid, pk, default gen_random_uuid())

   - usuario_id (uuid, fk -> profiles.id)

   - titulo (text)

   - descricao (text)

   - categoria (text: "buraco_via" | "iluminacao_publica" | "lixo" | "outros")

   - foto_url (text)

   - latitude (float8)

   - longitude (float8)

   - status (text: "registrado" | "em_analise" | "em_atendimento" | "resolvido", 

     default "registrado")

   - criado_em (timestamp, default now())

   - atualizado_em (timestamp)

3. historico_status (tabela extra para rastreabilidade e transparência)

   - id (uuid, pk)

   - ocorrencia_id (uuid, fk -> ocorrencias.id)

   - status_anterior (text)

   - status_novo (text)

   - alterado_por (uuid, fk -> profiles.id)

   - alterado_em (timestamp, default now())

Configure Row Level Security (RLS):

- Cidadãos: podem inserir e visualizar apenas seus próprios registros

- Gestores: podem visualizar e atualizar todos os registros

- Toda atualização de status em "ocorrencias" deve gerar automaticamente 

  um registro em "historico_status" (via trigger no Supabase)

- Storage bucket de fotos: leitura pública, escrita restrita ao autor

MÓDULOS FUNCIONAIS:

1. REGISTRO DE OCORRÊNCIAS

   - Formulário em etapas mínimas, com validação de campos

   - Upload de foto com preview antes de enviar

   - Captura automática de geolocalização (Geolocation API), com fallback 

     manual (arrastar pino no mapa) se o usuário negar permissão

   - Categoria selecionável com ícones ilustrativos

   - Ao enviar: status inicial "registrado" + toast de confirmação

2. ACOMPANHAMENTO DE STATUS (tempo real)

   - Tela "Meus Chamados" com cards mostrando foto, categoria, data e 

     badge de status colorido

   - Linha do tempo visual (timeline) mostrando o histórico de status 

     de cada chamado (usando a tabela historico_status)

   - Atualização automática via Supabase Realtime quando o gestor 

     muda o status

3. MAPA INTERATIVO

   - Marcadores agrupados por proximidade (cluster) quando há muitas 

     ocorrências na mesma área

   - Cores diferentes por status

   - Popup com foto, descrição, categoria, status e data

   - Filtro por categoria e por status no próprio mapa

4. PAINEL DO GESTOR MUNICIPAL

   - Dashboard com cards de métricas (total de chamados, % resolvidos, 

     tempo médio de resolução)

   - Gráfico de ocorrências por categoria (Recharts)

   - Tabela/lista de todas as ocorrências com filtros (status, categoria, data)

   - Ação rápida para alterar status diretamente na lista

   - Visível apenas para perfil "gestor"

TELAS:

1. Landing/login com apresentação breve do propósito do app

2. Cadastro/login (Supabase Auth)

3. Dashboard do cidadão com botão destacado "Reportar Problema"

4. Formulário de nova ocorrência

5. Meus Chamados (lista + timeline de status)

6. Mapa interativo com filtros

7. Painel do Gestor (métricas + gráficos + gestão de status)

REQUISITOS DE UX/ACESSIBILIDADE:

- Interface acessível para usuários de diferentes idades e níveis de 

  familiaridade tecnológica

- Contraste adequado (WCAG AA) e textos claros, sem jargões técnicos

- Totalmente responsivo (mobile e desktop)

- Estados de loading (skeletons), sucesso e erro bem definidos em toda ação

- Navegação simples: bottom navigation no mobile, sidebar no desktop

Comece configurando a integração com Supabase, criando as tabelas e as 

políticas de RLS. Depois construa as telas na ordem listada acima, 

priorizando o módulo de Registro de Ocorrências primeiro.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1ab0065c-056c-4202-8a9e-970555ce4ea1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
