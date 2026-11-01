# 🚀 InfoTI - Portal de Gestão de Tecnologia da Informação & Infraestrutura

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18.x+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Licen%C3%A7a-MIT-blue.svg?style=for-the-badge" alt="MIT License" />
</p>

<p align="center">
  <b>Central de comando unificada para controle de inventário de hardware, outsourcing de impressão, gestão de licenças, ramais corporativos e automação de demandas técnicas de TI.</b>
</p>

---

## 📌 Sumário

- [Visão Geral e Propósito](#-visão-geral-e-propósito)
- [Funcionalidades Principais](#-funcionalidades-principais)
  - [1. Dashboard Central & Painel de Urgências](#1--dashboard-central--painel-de-urgências)
  - [2. Gestão de Impressoras & Custos de Outsourcing](#2--gestão-de-impressoras--custos-de-outsourcing)
  - [3. Controle de Computadores & Inventário de Hardware](#3--controle-de-computadores--inventário-de-hardware)
  - [4. Inventário de Licenças de Software](#4--inventário-de-licenças-de-software)
  - [5. Diretório Telefônico de Ramais](#5--diretório-telefônico-de-ramais)
  - [6. Gestão de Demandas & Tarefas Recorrentes](#6--gestão-de-demandas--tarefas-recorrentes)
  - [7. Alternador de Tema Dark / Light](#7--alternador-de-tema-dark--light)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Como Baixar e Rodar o Projeto Localmente](#-como-baixar-e-rodar-o-projeto-localmente)
  - [Pré-requisitos](#pré-requisitos)
  - [Passo a Passo](#passo-a-passo)
- [Importação de Planilhas de Teste](#-importação-de-planilhas-de-teste)
- [Estrutura de Diretórios](#-estrutura-de-diretórios)
- [Rotas da API REST](#-rotas-da-api-rest)
- [Contribuindo com o Projeto](#-contribuindo-com-o-projeto)
- [Licença](#-licença)

---

## 🎯 Visão Geral e Propósito

Nas rotinas diárias de setores de **Tecnologia da Informação**, o controle de ativos corporativos frequentemente fica disperso entre múltiplas planilhas desatualizadas, blocos de notas e chamados não centralizados. Essa desorganização gera problemas recorrentes:
- **Perda de histórico de backups** e risco de perda de dados;
- **Dificuldade na apuração de custos** e rateios mensais de impressões terceirizadas;
- **Chaves de ativação de software perdidas** ou desvinculadas dos computadores da empresa;
- **Rotinas preventivas e manutenções esquecidas** por falta de agendamento automático de demandas recorrentes;
- **Dificuldade de comunicação interna** para localização rápida de ramais de contato dos setores.

O **InfoTI** foi concebido e estruturado especificamente para resolver essas dores. Trata-se de uma aplicação web robusta, ágil e intuitiva que centraliza a administração do ecossistema de TI corporativo em um único portal, entregando métricas em tempo real, relatórios exportáveis e automação operacional para técnicos, analistas e gestores.

---

## ⚡ Funcionalidades Principais

### 1. 📊 Dashboard Central & Painel de Urgências
- **Contadores e KPIs em Tempo Real:** Visualização instantânea do total de computadores cadastrados, percentual de conformidade de backup, status de impressoras ativas/defeito, ramais cadastrados e demandas pendentes.
- **Mural de Avisos & Urgências:** Destaque de criticidade com badges e cores dedicadas (*Crítica*, *Alta*, *Média* e *Baixa*).
- **Janelas de Manutenção:** Calendário e cronograma técnico para trocas de peças, manutenções preventivas e janelas técnicas de servidores/redes.
- **Gestão de Comunicados:** Inclusão ágil de avisos com prazos, responsáveis e marcação de conclusão.

### 2. 🖨️ Gestão de Impressoras & Custos de Outsourcing
- **Ficha Técnica Completa:** Cadastro de marca, modelo, número de série, endereço IP (com botão de cópia instantânea), centro de custo, valor por folha impressa e percentual de rateio (0% a 100%).
- **Lançamento Mensal de Contagens:**
  - Modal interativo listando todas as impressoras com contagem anterior e campo para digitação do contador atual.
  - Cálculo instantâneo em tempo real de **páginas impressas no mês** e **custo financeiro total estimado (R$)**.
- **Histórico Consolidado de Contagens:**
  - Consulta detalhada mês a mês de todas as impressões realizadas.
  - Indicadores no topo com o total de páginas impressas e valor total consolidado do período.
  - **Exportação para Excel (.xlsx):** Gera automaticamente planilhas completas com cabeçalhos formatados, dados tabulados e linha de totais gerais.

### 3. 💻 Controle de Computadores & Inventário de Hardware
- **Monitoramento Proativo de Backups:** Identificação imediata de computadores com backup desatualizado (*SIM* vs *NÃO*) com barra visual de progresso e data do último backup.
- **Inventário de Equipamentos:** Cadastro completo com nome da máquina (Hostname), colaborador vinculado, departamento, modelo, Service Tag (com cópia em 1 clique), Serial Number e status operacional (*Ativo*, *Defeito*, *Reserva Técnica*).
- **📥 Importador Inteligente de Planilhas Excel (.xlsx, .xls, .csv):**
  - Permite arrastar e soltar (Drag & Drop) planilhas corporativas pré-existentes.
  - Processa automaticamente os dados em lote.
  - **Vinculação Relacional Inteligente:** Caso a linha possua chave de licença de software preenchida, o sistema insere o computador e vincula automaticamente a licença correspondente na tabela de inventário.

### 4. 🔑 Inventário de Licenças de Software
- **Gestão de Chaves de Ativação:** Cadastro de licenças de sistemas operacionais (Windows 11 Pro), pacotes de escritório (Microsoft 365), antivírus e softwares de engenharia/design (AutoCAD, Adobe, etc.).
- **Segurança Visual:** Chaves de ativação mascaradas por padrão com botões dedicados para **revelar/ocultar** e **copiar para a área de transferência**.
- **Vínculo com Equipamentos:** Associação direta com o computador corporativo correspondente.

### 5. 📞 Diretório Telefônico de Ramais
- **Consulta Rápida em Tempo Real:** Pesquisa instantânea por departamento ou número do ramal com filtragem em milissegundos.
- **Cópia Instantânea:** Botão para cópia rápida do número para discadores ou comunicadores corporativos.
- **CRUD Completo:** Inclusão, edição e remoção facilitada de ramais.

### 6. 📋 Gestão de Demandas & Tarefas Recorrentes
- **Automação de Rotinas de TI:** Gerenciamento de demandas diárias, semanais, mensais, anuais ou com intervalos customizados (ex: a cada 15 dias, 3 meses).
- **Ação Rápida em 1 Clique:** Ao marcar uma demanda recorrente como concluída, o sistema calcula e **agenda automaticamente a próxima execução** com base na regra de periodicidade.
- **Monitoramento de Prazos:** Identificação automática de demandas pendentes e atrasadas com alerta visual pulsante.
- **Filtros Avançados:** Segmentação por data (Hoje, Semana, Mês, Customizado), status (*Pendente*, *Concluída*, *Atrasada*) e nível de prioridade.

### 7. ☀️🌙 Alternador de Tema Dark / Light
- Alternância instantânea entre o tema **Dark Tech** (fundo escuro moderno de alto contraste) e o **Tema Claro**.
- Persistência automática da preferência do usuário salva no `localStorage` do navegador.

---

## 🛠️ Tecnologias Utilizadas

### **Backend:**
- **[Node.js](https://nodejs.org/):** Ambiente de execução JavaScript server-side.
- **[Express](https://expressjs.com/):** Framework web minimalista e flexível para as rotas e APIs RESTful.
- **[MySQL2 (Promise Pool)](https://github.com/sidorares/node-mysql2):** Driver de alta performance com pool de conexões assíncronas para MySQL 8.0+.
- **[Multer](https://github.com/expressjs/multer):** Middleware para processamento de uploads de arquivos.
- **[XLSX (SheetJS)](https://sheetjs.com/):** Biblioteca para leitura, parsing e geração de planilhas Excel.
- **[Dotenv](https://github.com/motdotla/dotenv):** Gerenciamento seguro de variáveis de ambiente.
- **[CORS](https://github.com/expressjs/cors):** Habilitação de Cross-Origin Resource Sharing.

### **Frontend:**
- **HTML5 Semântico:** Estruturação limpa e acessível.
- **JavaScript (Vanilla ES6+):** Código modular e reativo sem sobrecarga de frameworks pesados.
- **[Tailwind CSS (CDN)](https://tailwindcss.com/):** Estilização utilitária de ponta com modo escuro nativo.
- **[FontAwesome 6](https://fontawesome.com/):** Conjunto completo de ícones corporativos.

---

## 🚀 Como Baixar e Rodar o Projeto Localmente

Siga o passo a passo abaixo para clonar, configurar e executar a aplicação em seu ambiente local de desenvolvimento.

### Pré-requisitos

Certifique-se de ter instalado em sua máquina:
1. **[Git](https://git-scm.com/)**
2. **[Node.js](https://nodejs.org/)** (versão 18.x ou superior recomendada)
3. **[MySQL Server](https://dev.mysql.com/downloads/installer/)** (versão 8.0 ou superior)

---

### Passo a Passo

#### 1. Clonar o Repositório
Abra o terminal e execute:
```bash
git clone https://github.com/SEU-USUARIO/infoTi.git
cd infoTi
```

#### 2. Instalar as Dependências
Execute o comando do gerenciador de pacotes para baixar todas as dependências do `package.json`:
```bash
npm install
```

#### 3. Configurar as Variáveis de Ambiente
Copie o arquivo de exemplo `.env.example` criando o arquivo `.env`:

**No Windows (PowerShell / CMD):**
```bash
copy .env.example .env
```

**No Linux / macOS:**
```bash
cp .env.example .env
```

Abra o arquivo `.env` gerado e preencha com as credenciais do seu banco de dados MySQL:
```env
# Configurações do Banco de Dados MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=sua_senha_mysql
DB_NAME=InfoTi

# Porta do Servidor Web
PORT=3000
```

#### 4. Criar as Tabelas no Banco de Dados
Você pode criar o banco de dados e todas as tabelas executando o script SQL pronto que acompanha o projeto:

- Abra seu cliente MySQL favorito (ex: **MySQL Workbench**, **DBeaver**, **HeidiSQL**, **phpMyAdmin** ou o terminal `mysql`).
- Execute o arquivo [`schema.sql`](file:///schema.sql) localizado na raiz do projeto.

> *Dica via terminal MySQL:*
> ```bash
> mysql -u root -p < schema.sql
> ```

#### 5. Popular com Dados Iniciais de Demonstração (Opcional)
Para iniciar o sistema já com equipamentos, impressoras, ramais e tarefas fictícias de teste, execute o script de sementes (seed):
```bash
npm run seed
```

#### 6. Iniciar o Servidor
Execute o comando:
```bash
npm start
```
*(ou `node server.js`)*

Se tudo estiver correto, você verá no terminal a confirmação:
```
========================================================
🚀 InfoTI Server rodando com sucesso!
🌐 Acesso Local: http://localhost:3000
========================================================
✓ Conectado ao MySQL em: localhost
✓ Tabelas do banco de dados verificadas.
```

#### 7. Acessar o Portal
Abra o seu navegador web e digite:
```
http://localhost:3000
```

---

## 📊 Importação de Planilhas de Teste

O projeto inclui o arquivo [`planilha_exemplo_teste.xlsx`](file:///planilha_exemplo_teste.xlsx) na raiz.

Você pode utilizar esse arquivo para testar a funcionalidade de importação em lote:
1. Acesse o menu **Controle de Máquinas**;
2. Clique no botão **"Importar Planilha"** no topo da tela;
3. Arraste ou selecione o arquivo `planilha_exemplo_teste.xlsx`;
4. Visualize a prévia dos computadores e licenças mapeadas;
5. Confirme a gravação para registrar dezenas de itens no MySQL em segundos.

---

## 📁 Estrutura de Diretórios

```text
infoTi/
├── config/
│   └── database.js          # Pool de conexões MySQL2 e verificação de integridade
├── public/                  # Frontend estático servido pelo Express
│   ├── css/
│   │   └── style.css        # Estilos customizados, temas e scrollbars
│   ├── js/
│   │   ├── app.js           # Orquestrador SPA, navegação e tema Dark/Light
│   │   ├── avisos.js        # Módulo de Avisos, Urgências e Manutenções
│   │   ├── computadores.js  # Módulo de Máquinas e Importador de Planilhas
│   │   ├── demandas.js      # Módulo de Demandas e Tarefas Recorrentes
│   │   ├── impressoras.js   # Módulo de Impressoras e Contagem Mensal
│   │   ├── licencas.js      # Módulo de Inventário de Licenças de Software
│   │   └── ramais.js        # Módulo do Diretório Telefônico de Ramais
│   └── index.html           # Aplicação Single Page (SPA) completa
├── routes/                  # Endpoints e rotas da API REST
│   ├── avisos.js            # Endpoints de comunicados e alertas
│   ├── computadores.js      # Endpoints de computadores e processamento de planilhas
│   ├── contagem.js          # Endpoints de contagens de páginas e exportação Excel
│   ├── demandas.js          # Endpoints de tarefas matriz e execuções agendadas
│   ├── impressoras.js       # Endpoints de impressoras e custos
│   ├── licencas.js          # Endpoints de licenças e vínculos
│   └── ramais.js            # Endpoints do diretório de ramais
├── .env.example             # Modelo das variáveis de ambiente
├── .gitignore               # Arquivos e diretórios ignorados pelo Git
├── package.json             # Manifesto de dependências e scripts Node.js
├── planilha_exemplo_teste.xlsx # Planilha modelo para teste de importação
├── README.md                # Documentação técnica oficial do projeto
├── schema.sql               # Script DDL completo para criação das tabelas MySQL
├── seed.js                  # Povoamento com dados iniciais de demonstração
└── server.js                # Ponto de entrada do servidor Express
```

---

## 🔌 Rotas da API REST

A API disponibiliza endpoints estruturados em padrão REST com respostas em formato JSON:

| Módulo | Método | Rota | Descrição |
| :--- | :---: | :--- | :--- |
| **Status** | `GET` | `/api/status` | Diagnóstico de conexão e uptime da aplicação |
| **Dashboard** | `GET` | `/api/dashboard/stats` | Indicadores consolidados do painel inicial |
| **Computadores** | `GET` | `/api/computadores` | Lista todos os computadores cadastrados |
| | `POST` | `/api/computadores` | Cadastra um novo computador corporativo |
| | `POST` | `/api/computadores/importar-planilha` | Upload e importação em lote (.xlsx, .xls, .csv) |
| | `PUT` | `/api/computadores/:id` | Atualiza dados de um computador existente |
| | `DELETE` | `/api/computadores/:id` | Remove um computador e desvincula licenças |
| **Impressoras** | `GET` | `/api/impressoras` | Lista impressoras e dados de outsourcing |
| | `POST` | `/api/impressoras` | Cadastra nova impressora na rede |
| | `PUT` | `/api/impressoras/:id` | Edita dados técnicos e rateio de impressora |
| | `DELETE` | `/api/impressoras/:id` | Exclui registro de impressora |
| **Contagens** | `GET` | `/api/contagem/historico` | Consulta histórico de contagens por mês/ano |
| | `POST` | `/api/contagem/salvar-mensal` | Registra medição mensal em lote |
| | `GET` | `/api/contagem/exportar-excel` | Exporta relatório consolidado em arquivo `.xlsx` |
| **Licenças** | `GET` | `/api/licencas` | Lista inventário de softwares e licenças |
| | `POST` | `/api/licencas` | Cadastra nova licença vinculada a máquina |
| | `PUT` | `/api/licencas/:id` | Atualiza dados e chave da licença |
| | `DELETE` | `/api/licencas/:id` | Exclui licença do inventário |
| **Demandas** | `GET` | `/api/demandas/dashboard` | Indicadores de demandas do dia (concluídas/atrasadas) |
| | `GET` | `/api/demandas/execucoes` | Lista tarefas agendadas com filtros |
| | `POST` | `/api/demandas/tarefas` | Cria tarefa matriz e primeira execução |
| | `PUT` | `/api/demandas/execucoes/:id/concluir` | **1 Clique:** Conclui execução e agenda próxima |
| | `DELETE` | `/api/demandas/tarefas/:id` | Exclui tarefa matriz e histórico de execuções |
| **Ramais** | `GET` | `/api/ramais` | Lista diretório de ramais telefônicos |
| | `POST` | `/api/ramais` | Adiciona ramal por departamento |
| | `PUT` | `/api/ramais/:id` | Atualiza número ou departamento do ramal |
| | `DELETE` | `/api/ramais/:id` | Remove ramal da lista corporativa |
| **Avisos** | `GET` | `/api/avisos` | Lista alertas e comunicados ativos |
| | `POST` | `/api/avisos` | Publica comunicado com prioridade e prazo |
| | `PUT` | `/api/avisos/:id/concluir` | Marca aviso/manutenção como resolvido |

---

## 🤝 Contribuindo com o Projeto

Contribuições são sempre bem-vindas! Se você deseja colaborar:

1. Faça um **Fork** deste repositório;
2. Crie uma branch para sua funcionalidade ou correção:
   ```bash
   git checkout -b feature/minha-nova-funcionalidade
   ```
3. Realize o commit de suas alterações:
   ```bash
   git commit -m "feat: adiciona nova funcionalidade ao módulo X"
   ```
4. Envie para o repositório remoto:
   ```bash
   git push origin feature/minha-nova-funcionalidade
   ```
5. Abra um **Pull Request**.

---

## 📄 Licença

Este projeto é distribuído sob os termos da licença **MIT**. Consulte o arquivo `LICENSE` ou a definição no `package.json` para obter mais detalhes.

---

<p align="center">
  Desenvolvido com foco em produtividade, controle e excelência na gestão de TI. 🚀
</p>
