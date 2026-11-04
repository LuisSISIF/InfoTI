require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT || "3307", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "123456",
  database: process.env.DB_NAME || "InfoTi",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  dateStrings: true,
});

// Test connection on load
let isConnected = false;
let connectionError = null;

async function checkDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    isConnected = true;
    connectionError = null;
    connection.release();
    return {
      success: true,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
    };
  } catch (err) {
    isConnected = false;
    connectionError = err.message;
    console.error("Falha na conexão com MySQL:", err.message);
    return { success: false, error: err.message };
  }
}

// Ensure required tables exist
async function initDatabaseSchema() {
  try {
    const conn = await pool.getConnection();

    // avisosNotificacoes
    await conn.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    conn.release();
    console.log("✓ Tabelas do banco de dados verificadas.");
  } catch (err) {
    console.warn("Aviso durante verificação de tabelas:", err.message);
  }
}

module.exports = {
  pool,
  checkDatabaseConnection,
  initDatabaseSchema,
  getStatus: () => ({
    isConnected,
    connectionError,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
  }),
};
