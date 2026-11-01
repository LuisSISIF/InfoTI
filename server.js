require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool, checkDatabaseConnection, initDatabaseSchema, getStatus } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API
app.use('/api/impressoras', require('./routes/impressoras'));
app.use('/api/contagem', require('./routes/contagem'));
app.use('/api/computadores', require('./routes/computadores'));
app.use('/api/licencas', require('./routes/licencas'));
app.use('/api/ramais', require('./routes/ramais'));
app.use('/api/avisos', require('./routes/avisos'));
app.use('/api/demandas', require('./routes/demandas'));

// Endpoint de Status e Diagnóstico do Sistema
app.get('/api/status', async (req, res) => {
  const dbHealth = await checkDatabaseConnection();
  res.json({
    app: 'InfoTI - Portal de Gestão de Tecnologia da Informação',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: dbHealth,
    serverUptime: process.uptime()
  });
});

// Endpoint consolidado do Dashboard Início
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [compCount] = await pool.query('SELECT count(*) as total, SUM(CASE WHEN status="Ativo" THEN 1 ELSE 0 END) as ativos, SUM(CASE WHEN backup="SIM" THEN 1 ELSE 0 END) as backupOk FROM computadores');
    const [impCount] = await pool.query('SELECT count(*) as total, SUM(CASE WHEN status="Ativo" THEN 1 ELSE 0 END) as ativas, SUM(CASE WHEN status="Defeito" THEN 1 ELSE 0 END) as defeito FROM impressoras');
    const [ramCount] = await pool.query('SELECT count(*) as total FROM ramais');
    const [licCount] = await pool.query('SELECT count(*) as total FROM inventarioLicencas');
    const [urgCount] = await pool.query('SELECT count(*) as total FROM avisosNotificacoes WHERE status="ativo" AND prioridade IN ("critica","alta")');
    const [demandasStats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pendente' AND data_prevista < NOW() THEN 1 ELSE 0 END) as atrasadas,
        SUM(CASE WHEN status = 'pendente' AND data_prevista >= NOW() THEN 1 ELSE 0 END) as pendentes
      FROM tarefas_execucoes
    `);

    res.json({
      success: true,
      data: {
        computadores: {
          total: compCount[0].total || 0,
          ativos: compCount[0].ativos || 0,
          backupOk: compCount[0].backupOk || 0
        },
        impressoras: {
          total: impCount[0].total || 0,
          ativas: impCount[0].ativas || 0,
          defeito: impCount[0].defeito || 0
        },
        ramais: {
          total: ramCount[0].total || 0
        },
        licencas: {
          total: licCount[0].total || 0
        },
        demandas: {
          total: demandasStats[0].total || 0,
          atrasadas: parseInt(demandasStats[0].atrasadas || 0, 10),
          pendentes: parseInt(demandasStats[0].pendentes || 0, 10)
        },
        alertasCriticos: urgCount[0].total || 0
      }
    });
  } catch (error) {
    console.error('Erro no dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Erro ao compilar estatísticas gerais' });
  }
});

// Fallback SPA - Serve index.html para qualquer rota não mapeada
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log('========================================================');
  console.log(`🚀 InfoTI Server rodando com sucesso!`);
  console.log(`🌐 Acesso Local: http://localhost:${PORT}`);
  console.log('========================================================');
  
  // Testar conexão com banco e inicializar tabelas
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.success) {
    console.log(`✓ Conectado ao MySQL em: ${dbStatus.host}`);
    await initDatabaseSchema();
  } else {
    console.warn(`! Atenção: Não foi possível conectar ao MySQL (${dbStatus.error}).`);
  }
});
