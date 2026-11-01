require('dotenv').config();
const mysql = require('mysql2/promise');

async function seedInitialData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  // 1. Seed Computadores se vazio
  const [compRows] = await connection.query('SELECT count(*) as total FROM computadores');
  if (compRows[0].total === 0) {
    console.log('Inserindo computadores iniciais...');
    await connection.query(`
      INSERT INTO computadores (colaborador, departamento, modelo, serialNumbner, serviceTag, observacao, backup, dataultimoBackup, nomeMaquina, status) VALUES
      ('Carlos Eduardo Silva', 'TI - Infraestrutura', 'Dell OptiPlex 7090', 'SN-DELL-88219', '7X99KL2', 'Estação principal de administração de redes', 'SIM', '2026-10-28', 'DESK-TI-01', 'Ativo'),
      ('Mariana Alves Rocha', 'Financeiro / Contábil', 'Lenovo ThinkCentre M70s', 'SN-LNV-44120', 'MJ09XQ1', 'Possui certificado digital A1 instalado', 'SIM', '2026-10-29', 'DESK-FIN-02', 'Ativo'),
      ('Roberto Mendes Costa', 'Recursos Humanos', 'Dell Latitude 3420', 'SN-DELL-11234', '3B88ZZ9', 'Notebook corporativo de uso híbrido', 'NAO', '2026-10-15', 'NOTE-RH-01', 'Ativo'),
      ('Juliana Martins Lima', 'Diretoria Executiva', 'HP ProBook 440 G8', 'SN-HP-99823', 'HP4409X', 'Backup em nuvem OneDrive sincronizado', 'SIM', '2026-10-29', 'NOTE-DIR-01', 'Ativo'),
      ('Lucas Gabriel Santos', 'Logística & Suprimentos', 'Dell OptiPlex 3080', 'SN-DELL-55612', '9K11AA3', 'Apresentando ruído no cooler - agendado reparo', 'SIM', '2026-10-25', 'DESK-LOG-03', 'Defeito'),
      ('Estação Backup 01', 'TI - Suporte', 'Lenovo V530s', 'SN-LNV-00982', 'LV001BK', 'Máquina reserva formatada e pronta para entrega', 'SIM', '2026-10-20', 'DESK-RES-01', 'Reserva');
    `);
  }

  // 2. Seed Impressoras se vazio
  const [impRows] = await connection.query('SELECT count(*) as total FROM impressoras');
  if (impRows[0].total === 0) {
    console.log('Inserindo impressoras iniciais...');
    await connection.query(`
      INSERT INTO impressoras (departamento, modelo, serialNumber, ip, valorUn, centroDeCusto, porcentRateio, observacao, status) VALUES
      ('Financeiro', 'HP LaserJet Enterprise M507', 'VNB3B09921', '192.168.1.50', 0.08, 'CC-FIN-102', 40.00, 'Impressora monocromática de alta velocidade para notas e relatórios', 'Ativo'),
      ('Recursos Humanos', 'Kyocera ECOSYS P3155dn', 'KCD8823104', '192.168.1.51', 0.07, 'CC-RH-105', 25.00, 'Impressora do setor de admissão e DP', 'Ativo'),
      ('Diretoria & Jurídico', 'Epson EcoTank L5290', 'EP99281729', '192.168.1.52', 0.12, 'CC-DIR-101', 20.00, 'Multifuncional colorida conectada via Wi-Fi e rede cabeada', 'Ativo'),
      ('Logística & Expedição', 'Zebra ZD220 Térmica', 'ZB11209844', '192.168.1.53', 0.04, 'CC-LOG-110', 15.00, 'Impressora térmica para etiquetas de despacho', 'Ativo'),
      ('TI - Manutenção', 'Brother HL-L6200DW', 'BRO7736201', '192.168.1.54', 0.06, 'CC-TI-100', 0.00, 'Sensor de papel com falha intermitente, aguardando peça', 'Defeito');
    `);
  }

  // 3. Seed Ramais se vazio
  const [ramRows] = await connection.query('SELECT count(*) as total FROM ramais');
  if (ramRows[0].total === 0) {
    console.log('Inserindo ramais iniciais...');
    await connection.query(`
      INSERT INTO ramais (departamento, numeroRamal) VALUES
      ('TI - Suporte / Helpdesk', '2001'),
      ('TI - Infraestrutura & Redes', '2002'),
      ('Financeiro / Contas a Pagar', '2010'),
      ('Controladoria & Custos', '2012'),
      ('Recursos Humanos / DP', '2020'),
      ('Diretoria Executiva', '2030'),
      ('Comercial & Vendas', '2040'),
      ('Logística & Expedição', '2050'),
      ('Recepção Principal', '2000');
    `);
  }

  // 4. Seed Licenças se vazio
  const [licRows] = await connection.query('SELECT count(*) as total FROM inventarioLicencas');
  if (licRows[0].total === 0) {
    console.log('Inserindo licenças iniciais...');
    // buscar ids de computadores cadastrados
    const [comps] = await connection.query('SELECT id FROM computadores ORDER BY id ASC LIMIT 4');
    if (comps.length > 0) {
      const c1 = comps[0].id;
      const c2 = comps[1] ? comps[1].id : c1;
      const c3 = comps[2] ? comps[2].id : c1;
      const c4 = comps[3] ? comps[3].id : c1;

      await connection.query(`
        INSERT INTO inventarioLicencas (chaveAtivacao, emailAtivacao, idComputador, tipoLicenca) VALUES
        ('XXXXX-YYYYY-ZZZZZ-11111-WIN11', 'carlos.silva@empresa.com.br', ${c1}, 'Windows 11 Pro OEM'),
        ('M365-BUS-99823-ROCHA-2026', 'mariana.rocha@empresa.com.br', ${c2}, 'Microsoft 365 Business Standard'),
        ('ESET-EP-PRO-4412-SEC', 'roberto.mendes@empresa.com.br', ${c3}, 'ESET Endpoint Security Antivirus'),
        ('ACAD-2026-ENG-88123-DIR', 'juliana.lima@empresa.com.br', ${c4}, 'Autodesk AutoCAD 2026 Commercial');
      `);
    }
  }

  // 5. Seed Avisos e Notificações se vazio
  const [aviRows] = await connection.query('SELECT count(*) as total FROM avisosNotificacoes');
  if (aviRows[0].total === 0) {
    console.log('Inserindo avisos e notificações...');
    await connection.query(`
      INSERT INTO avisosNotificacoes (titulo, descricao, tipo, prioridade, autor, dataPrevisao, status) VALUES
      ('Backup em Atraso no Setor RH', 'A máquina NOTE-RH-01 (Roberto Mendes) está com backup pendente há mais de 15 dias. Contatar usuário para sincronização imediata.', 'urgente', 'alta', 'Segurança da Informação', '2026-10-31', 'ativo'),
      ('Manutenção Preventiva de Impressoras', 'Visita técnica programada para limpeza óptica e revisão dos roletes das impressoras do Financeiro e Expedição.', 'manutencao', 'media', 'Infraestrutura', '2026-11-05', 'ativo'),
      ('Renovação de Licenças Antivírus Endpoint', 'Ciclo de renovação anual das 45 licenças de antivírus corporativo vence no final do próximo mês.', 'alerta', 'media', 'Gestão de Licenças', '2026-11-30', 'ativo'),
      ('Migração de Switch Core (Datacenter)', 'Janela de manutenção programada no sábado das 22h às 02h para troca de cabeamento estruturado e agregação de links.', 'urgente', 'critica', 'Redes & Infra', '2026-11-07', 'ativo');
    `);
  }

  // 6. Seed Contagem Impressão se vazio
  const [ctgRows] = await connection.query('SELECT count(*) as total FROM contagemiMpressao');
  if (ctgRows[0].total === 0) {
    const [imps] = await connection.query('SELECT id, valorUn FROM impressoras ORDER BY id ASC LIMIT 2');
    if (imps.length > 0) {
      await connection.query(`
        INSERT INTO contagemiMpressao (idImpressora, ctFolhasAnterior, ctFolhasAtual, ctImpressoes, custoTotal, dataContagem) VALUES
        (${imps[0].id}, 12450, 15890, 3440, ${(3440 * Number(imps[0].valorUn)).toFixed(2)}, '2026-09-30');
      `);
    }
  }

  console.log('Seed de dados concluído com sucesso!');
  await connection.end();
}

seedInitialData().catch(console.error);
