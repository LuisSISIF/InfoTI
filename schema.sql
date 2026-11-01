-- ========================================================
-- InfoTI - Schema do Banco de Dados MySQL
-- Execute este script no seu SGBD (MySQL Workbench, phpMyAdmin, DBeaver, etc.)
-- ========================================================

CREATE DATABASE IF NOT EXISTS InfoTi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE InfoTi;

-- 1. Tabela: computadores
CREATE TABLE IF NOT EXISTS computadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  colaborador VARCHAR(200) NOT NULL DEFAULT '',
  departamento VARCHAR(80) NOT NULL DEFAULT '',
  modelo VARCHAR(100) NOT NULL DEFAULT '',
  serialNumbner VARCHAR(100) NOT NULL DEFAULT '',
  serviceTag VARCHAR(100) NOT NULL DEFAULT '',
  nomeMaquina VARCHAR(45) NOT NULL DEFAULT '',
  backup ENUM('SIM', 'NAO') DEFAULT 'NAO',
  dataultimoBackup DATE NULL,
  status ENUM('Ativo', 'Defeito', 'Reserva') DEFAULT 'Ativo',
  observacao TEXT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela: impressoras
CREATE TABLE IF NOT EXISTS impressoras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  departamento VARCHAR(120) NOT NULL DEFAULT '',
  modelo VARCHAR(100) NOT NULL DEFAULT '',
  serialNumber VARCHAR(100) NOT NULL DEFAULT '',
  ip VARCHAR(45) NOT NULL DEFAULT '',
  valorUn DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  centroDeCusto VARCHAR(45) NOT NULL DEFAULT '',
  porcentRateio DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  status ENUM('Ativo', 'Defeito', 'Reserva') DEFAULT 'Ativo',
  observacao TEXT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela: contagemiMpressao
CREATE TABLE IF NOT EXISTS contagemiMpressao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idImpressora INT NOT NULL,
  ctFolhasAnterior INT NOT NULL DEFAULT 0,
  ctFolhasAtual INT NOT NULL DEFAULT 0,
  ctImpressoes INT NOT NULL DEFAULT 0,
  custoTotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  dataContagem DATE NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (idImpressora) REFERENCES impressoras(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela: inventarioLicencas
CREATE TABLE IF NOT EXISTS inventarioLicencas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipoLicenca VARCHAR(100) NOT NULL,
  chaveAtivacao VARCHAR(120) NOT NULL,
  emailAtivacao VARCHAR(180) NULL,
  idComputador INT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (idComputador) REFERENCES computadores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabela: ramais
CREATE TABLE IF NOT EXISTS ramais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  departamento VARCHAR(100) NOT NULL,
  numeroRamal VARCHAR(45) NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabela: avisosNotificacoes
CREATE TABLE IF NOT EXISTS avisosNotificacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT,
  tipo ENUM('urgente', 'alerta', 'info', 'manutencao') DEFAULT 'info',
  prioridade ENUM('baixa', 'media', 'alta', 'critica') DEFAULT 'media',
  autor VARCHAR(100) DEFAULT 'TI Suporte',
  dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  dataPrevisao DATE NULL,
  status ENUM('ativo', 'resolvido', 'arquivado') DEFAULT 'ativo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabela: tarefas (Demandas Matriz)
CREATE TABLE IF NOT EXISTS tarefas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo_recorrencia ENUM('unica', 'diaria', 'semanal', 'mensal', 'anual', 'intervalo') DEFAULT 'unica',
  intervalo INT DEFAULT 1,
  unidade_intervalo ENUM('dias', 'semanas', 'meses', 'anos') NULL,
  data_inicio DATETIME NOT NULL,
  proxima_execucao DATETIME NULL,
  prioridade ENUM('baixa', 'media', 'alta', 'critica') DEFAULT 'media',
  ativo TINYINT(1) DEFAULT 1,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabela: tarefas_execucoes (Ocorrências de Execução de Demandas)
CREATE TABLE IF NOT EXISTS tarefas_execucoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tarefa_id INT NOT NULL,
  data_prevista DATETIME NOT NULL,
  data_conclusao DATETIME NULL,
  responsavel_id INT NULL,
  status ENUM('pendente', 'concluida', 'cancelada') DEFAULT 'pendente',
  observacao TEXT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
