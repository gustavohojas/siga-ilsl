/**
 * Script de Carga de Dados Fictícios Completos — SIGA-ILSL
 * Alimenta desde Notas de Empenho até Dispensações para todos os 21 Centros Consumidores.
 * Todos os campos preenchidos, códigos de 5 dígitos para SIAFÍSICO e Compras.
 */

const { Pool } = require('pg');
const path = require('path');
const { gerarPdfGuiaDispensacao } = require('../src/utils/pdfGenerator');

const connectionString = process.env.DATABASE_URL || 'postgresql://siga_user:SuaSenhaSegura123@localhost:5433/estoque';
const pool = new Pool({ connectionString });

async function seed() {
    const client = await pool.connect();
    try {
        console.log('🔄 Iniciando carga completa de dados fictícios...');
        await client.query('BEGIN');

        // 1. Limpar tabelas dinâmicas mantendo usuários e centros consumidores
        console.log('🧹 Limpando tabelas operacionais anteriores...');
        await client.query(`
            TRUNCATE TABLE 
                dispensacoes, 
                guias_dispensacao, 
                estornos_recebimento, 
                estoque, 
                itens_recebimento, 
                recebimentos, 
                itens_empenho, 
                notas_empenho, 
                empresas, 
                doadores, 
                catalogo_itens, 
                naturezas_despesa 
            RESTART IDENTITY CASCADE;
        `);

        // 2. Naturezas de Despesa
        console.log('📦 Cadastrando Naturezas de Despesa...');
        const naturezasList = [
            'Material Hospitalar',
            'Medicamentos',
            'Material de Escritório',
            'Limpeza e Higienização',
            'Equipamentos e Peças'
        ];
        for (const nat of naturezasList) {
            await client.query('INSERT INTO naturezas_despesa (nome) VALUES ($1)', [nat]);
        }

        // 3. Empresas / Fornecedores
        console.log('🏢 Cadastrando Fornecedores (Empresas)...');
        const empresasData = [
            {
                cnpj: '12345678000190',
                razao_social: 'Cirúrgica São Paulo Distribuidora Ltda',
                endereco: 'Av. Nações Unidas, 1500 - Bauru/SP',
                telefone: '(14) 3234-5678'
            },
            {
                cnpj: '98765432000110',
                razao_social: 'MedHosp Equipamentos e Produtos Médicos Ltda',
                endereco: 'Rua Araújo Leite, 2200 - Bauru/SP',
                telefone: '(14) 3104-9988'
            },
            {
                cnpj: '45678901000123',
                razao_social: 'Papelaria e Suprimentos Central Ltda',
                endereco: 'Rua Batista de Carvalho, 450 - Bauru/SP',
                telefone: '(14) 3222-1100'
            },
            {
                cnpj: '56789012000134',
                razao_social: 'Higienix Soluções em Limpeza Profissional Eireli',
                endereco: 'Rod. Marechal Rondon, Km 340 - Bauru/SP',
                telefone: '(14) 3312-4455'
            },
            {
                cnpj: '67890123000145',
                razao_social: 'Auto Peças e Serviços Rondon Ltda',
                endereco: 'Av. Duque de Caxias, 800 - Bauru/SP',
                telefone: '(14) 3208-7700'
            }
        ];

        const empresaIds = [];
        for (const emp of empresasData) {
            const res = await client.query(`
                INSERT INTO empresas (cnpj, razao_social, endereco, telefone)
                VALUES ($1, $2, $3, $4) RETURNING id
            `, [emp.cnpj, emp.razao_social, emp.endereco, emp.telefone]);
            empresaIds.push(res.rows[0].id);
        }

        // 4. Doador (para recebimento via doação)
        console.log('🤝 Cadastrando Doador...');
        const resDoador = await client.query(`
            INSERT INTO doadores (cpf_cnpj, nome_razao_social, endereco, telefone)
            VALUES ($1, $2, $3, $4) RETURNING id
        `, ['05892114000177', 'Associação Beneficente Voluntários da Saúde de Bauru', 'Rua Gustavo Maciel, 900 - Bauru/SP', '(14) 3255-0011']);
        const doadorId = resDoador.rows[0].id;

        // 5. Obter ID do usuário admin
        const userRes = await client.query('SELECT id, nome, cpf FROM usuarios LIMIT 1');
        const adminUser = userRes.rows[0] || { id: 1, nome: 'Administrador', cpf: '40169736865' };

        // 6. Notas de Empenho (5 NEs)
        console.log('📋 Cadastrando Notas de Empenho...');
        const empenhosData = [
            {
                numero: '2026NE00142',
                tipo_licitacao: 'pregao',
                numero_licitacao: '012/2026',
                prazo: '2026-10-30',
                empresa_id: empresaIds[0]
            },
            {
                numero: '2026NE00143',
                tipo_licitacao: 'pregao',
                numero_licitacao: '015/2026',
                prazo: '2026-11-15',
                empresa_id: empresaIds[1]
            },
            {
                numero: '2026NE00144',
                tipo_licitacao: 'ata',
                numero_licitacao: '004/2026',
                prazo: '2026-10-20',
                empresa_id: empresaIds[2]
            },
            {
                numero: '2026NE00145',
                tipo_licitacao: 'pregao',
                numero_licitacao: '018/2026',
                prazo: '2026-11-05',
                empresa_id: empresaIds[3]
            },
            {
                numero: '2026NE00146',
                tipo_licitacao: 'ata',
                numero_licitacao: '008/2026',
                prazo: '2026-12-01',
                empresa_id: empresaIds[4]
            }
        ];

        const neIds = [];
        for (const ne of empenhosData) {
            const res = await client.query(`
                INSERT INTO notas_empenho (numero, tipo_licitacao, numero_licitacao, prazo, empresa_id)
                VALUES ($1, $2, $3, $4, $5) RETURNING id
            `, [ne.numero, ne.tipo_licitacao, ne.numero_licitacao, ne.prazo, ne.empresa_id]);
            neIds.push(res.rows[0].id);
        }

        // 7. Itens das Notas de Empenho
        console.log('📝 Cadastrando Itens de Empenho e Catálogo...');
        // Todos com códigos de 5 dígitos numéricos
        const itensConfig = [
            // NE 0 (Cirúrgica São Paulo)
            {
                neIndex: 0,
                codigo_siafisico: '14205',
                codigo_compras: '38291',
                descricao: 'Luva Cirúrgica Estéril Tam. M',
                perecivel: true,
                natureza: 'Material Hospitalar',
                quantidade: 2000,
                unidade: 'Par',
                valor_unitario: 1.85,
                garantia: false,
                data_garantia: null,
                lote: 'LT26-LUV01',
                validade: '2027-05-15',
                barcode: '7891000142051'
            },
            {
                neIndex: 0,
                codigo_siafisico: '28491',
                codigo_compras: '38291',
                descricao: 'Seringa Descartável 10ml com Agulha',
                perecivel: true,
                natureza: 'Material Hospitalar',
                quantidade: 3000,
                unidade: 'Unidade',
                valor_unitario: 0.48,
                garantia: false,
                data_garantia: null,
                lote: 'LT26-SRG02',
                validade: '2027-08-30',
                barcode: '7891000284912'
            },
            {
                neIndex: 0,
                codigo_siafisico: '59302',
                codigo_compras: '41029',
                descricao: 'Álcool Etílico 70% Frasco 1000ml',
                perecivel: true,
                natureza: 'Material Hospitalar',
                quantidade: 400,
                unidade: 'Frasco',
                valor_unitario: 6.20,
                garantia: false,
                data_garantia: null,
                lote: 'LT26-ALC03',
                validade: '2026-11-10', // Próximo do vencimento!
                barcode: '7891000593023'
            },
            {
                neIndex: 0,
                codigo_siafisico: '10482',
                codigo_compras: '51920',
                descricao: 'Gaze Estéril 7.5x7.5cm Pacote c/ 10 un',
                perecivel: true,
                natureza: 'Material Hospitalar',
                quantidade: 1500,
                unidade: 'Pacote',
                valor_unitario: 0.95,
                garantia: false,
                data_garantia: null,
                lote: 'LT26-GAZ04',
                validade: '2028-01-20',
                barcode: '7891000104824'
            },
            {
                neIndex: 0,
                codigo_siafisico: '18294',
                codigo_compras: '51920',
                descricao: 'Fita Microporosa Hipoalergênica 25mm x 10m',
                perecivel: true,
                natureza: 'Material Hospitalar',
                quantidade: 600,
                unidade: 'Rolo',
                valor_unitario: 3.80,
                garantia: false,
                data_garantia: null,
                lote: 'LT26-FIT05',
                validade: '2027-11-20',
                barcode: '7891000182945'
            },

            // NE 1 (MedHosp Equipamentos)
            {
                neIndex: 1,
                codigo_siafisico: '91029',
                codigo_compras: '93012',
                descricao: 'Tensionômetro Digital de Braço Clínico',
                perecivel: false,
                natureza: 'Equipamentos e Peças',
                quantidade: 25,
                unidade: 'Unidade',
                valor_unitario: 185.00,
                garantia: true,
                data_garantia: '2027-09-30', // Em garantia!
                lote: 'SER-TEN2026',
                validade: null,
                barcode: '7891000910296'
            },
            {
                neIndex: 1,
                codigo_siafisico: '92831',
                codigo_compras: '93012',
                descricao: 'Termômetro Clínico Digital Infravermelho',
                perecivel: false,
                natureza: 'Equipamentos e Peças',
                quantidade: 40,
                unidade: 'Unidade',
                valor_unitario: 115.00,
                garantia: true,
                data_garantia: '2027-06-15', // Em garantia!
                lote: 'SER-TRM2026',
                validade: null,
                barcode: '7891000928317'
            },
            {
                neIndex: 1,
                codigo_siafisico: '93842',
                codigo_compras: '93012',
                descricao: 'Oxímetro de Pulso Portátil de Dedo',
                perecivel: false,
                natureza: 'Equipamentos e Peças',
                quantidade: 35,
                unidade: 'Unidade',
                valor_unitario: 89.00,
                garantia: true,
                data_garantia: '2026-12-15', // Em garantia!
                lote: 'SER-OXI2026',
                validade: null,
                barcode: '7891000938428'
            },
            {
                neIndex: 1,
                codigo_siafisico: '30192',
                codigo_compras: '38291',
                descricao: 'Lâmina de Bisturi Aço Carbono nº 15',
                perecivel: true,
                natureza: 'Material Hospitalar',
                quantidade: 800,
                unidade: 'Unidade',
                valor_unitario: 0.65,
                garantia: false,
                data_garantia: null,
                lote: 'LT26-BST09',
                validade: '2028-03-30',
                barcode: '7891000301929'
            },

            // NE 2 (Papelaria Central)
            {
                neIndex: 2,
                codigo_siafisico: '72910',
                codigo_compras: '60293',
                descricao: 'Papel Sulfite A4 75g Resma 500 folhas',
                perecivel: false,
                natureza: 'Material de Escritório',
                quantidade: 500,
                unidade: 'Resma',
                valor_unitario: 26.50,
                garantia: false,
                data_garantia: null,
                lote: 'LT26-PAP10',
                validade: null,
                barcode: '7891000729100'
            },
            {
                neIndex: 2,
                codigo_siafisico: '83912',
                codigo_compras: '60293',
                descricao: 'Caneta Esferográfica Azul Escrita Média',
                perecivel: false,
                natureza: 'Material de Escritório',
                quantidade: 1000,
                unidade: 'Unidade',
                valor_unitario: 0.85,
                garantia: false,
                data_garantia: null,
                lote: 'LT26-CAN11',
                validade: null,
                barcode: '7891000839121'
            },
            {
                neIndex: 2,
                codigo_siafisico: '84920',
                codigo_compras: '60293',
                descricao: 'Grampeador de Mesa Médio 26/6 Metálico',
                perecivel: false,
                natureza: 'Material de Escritório',
                quantidade: 50,
                unidade: 'Unidade',
                valor_unitario: 24.90,
                garantia: true,
                data_garantia: '2027-08-30',
                lote: 'LT26-GRP12',
                validade: null,
                barcode: '7891000849202'
            },

            // NE 3 (Higienix Limpeza)
            {
                neIndex: 3,
                codigo_siafisico: '41920',
                codigo_compras: '71029',
                descricao: 'Detergente Desinfetante Hospitalar Clorado 5L',
                perecivel: true,
                natureza: 'Limpeza e Higienização',
                quantidade: 200,
                unidade: 'Galão',
                valor_unitario: 38.00,
                garantia: false,
                data_garantia: null,
                lote: 'LT26-DET13',
                validade: '2027-04-12',
                barcode: '7891000419203'
            },
            {
                neIndex: 3,
                codigo_siafisico: '62819',
                codigo_compras: '71029',
                descricao: 'Sabonete Líquido Antisséptico Triclosan 1000ml',
                perecivel: true,
                natureza: 'Limpeza e Higienização',
                quantidade: 350,
                unidade: 'Frasco',
                valor_unitario: 14.50,
                garantia: false,
                data_garantia: null,
                lote: 'LT26-SAB14',
                validade: '2026-10-28', // Próximo do vencimento!
                barcode: '7891000628194'
            },
            {
                neIndex: 3,
                codigo_siafisico: '48201',
                codigo_compras: '71029',
                descricao: 'Saco para Lixo Infectante Hospitalar 100L Branco',
                perecivel: false,
                natureza: 'Limpeza e Higienização',
                quantidade: 4000,
                unidade: 'Unidade',
                valor_unitario: 0.55,
                garantia: false,
                data_garantia: null,
                lote: 'LT26-SAC15',
                validade: null,
                barcode: '7891000482015'
            },
            {
                neIndex: 3,
                codigo_siafisico: '48202',
                codigo_compras: '71029',
                descricao: 'Papel Toalha Interfolhado 2 Dobras 100% Celulose',
                perecivel: false,
                natureza: 'Limpeza e Higienização',
                quantidade: 300,
                unidade: 'Pacote',
                valor_unitario: 12.80,
                garantia: false,
                data_garantia: null,
                lote: 'LT26-TOA16',
                validade: null,
                barcode: '7891000482026'
            },

            // NE 4 (Auto Peças Rondon)
            {
                neIndex: 4,
                codigo_siafisico: '67102',
                codigo_compras: '89012',
                descricao: 'Pneu Radial 175/70 R14 para Ambulância / Frota',
                perecivel: false,
                natureza: 'Equipamentos e Peças',
                quantidade: 20,
                unidade: 'Unidade',
                valor_unitario: 290.00,
                garantia: true,
                data_garantia: '2028-08-30', // Em garantia!
                lote: 'DOT-PNE2026',
                validade: null,
                barcode: '7891000671027'
            },
            {
                neIndex: 4,
                codigo_siafisico: '67103',
                codigo_compras: '89012',
                descricao: 'Óleo Lubrificante Motor Sintético 5W30 1L',
                perecivel: true,
                natureza: 'Equipamentos e Peças',
                quantidade: 120,
                unidade: 'Frasco',
                valor_unitario: 34.00,
                garantia: false,
                data_garantia: null,
                lote: 'LT26-OLE18',
                validade: '2029-01-01',
                barcode: '7891000671038'
            }
        ];

        // Inserir itens_empenho e popular catalogo_itens
        const itensCadastrados = [];
        for (const item of itensConfig) {
            const neId = neIds[item.neIndex];

            // 1. Catálogo
            await client.query(`
                INSERT INTO catalogo_itens (codigo_siafisico, codigo_compras, descricao)
                VALUES ($1, $2, $3)
                ON CONFLICT (codigo_siafisico) DO UPDATE 
                SET codigo_compras = EXCLUDED.codigo_compras, descricao = EXCLUDED.descricao, atualizado_em = NOW()
            `, [item.codigo_siafisico, item.codigo_compras, item.descricao]);

            // 2. Item Empenho
            const resItem = await client.query(`
                INSERT INTO itens_empenho (
                    nota_empenho_id, codigo_siafisico, codigo_compras, descricao, 
                    perecivel, natureza_despesa, quantidade, unidade, valor_unitario, 
                    quantidade_recebida, garantia, data_garantia
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id
            `, [
                neId, item.codigo_siafisico, item.codigo_compras, item.descricao,
                item.perecivel, item.natureza, item.quantidade, item.unidade, item.valor_unitario,
                item.quantidade, // todos já recebidos para compor estoque
                item.garantia, item.data_garantia
            ]);

            itensCadastrados.push({
                ...item,
                item_empenho_id: resItem.rows[0].id,
                ne_id: neId
            });
        }

        // 8. Recebimentos das Notas de Empenho
        console.log('🚚 Registrando Recebimentos das NEs e Entrada em Estoque...');
        const recebimentosData = [
            { neIndex: 0, nf: 'NF-008491', data: '2026-07-15' },
            { neIndex: 1, nf: 'NF-001248', data: '2026-08-05' },
            { neIndex: 2, nf: 'NF-005910', data: '2026-08-20' },
            { neIndex: 3, nf: 'NF-009823', data: '2026-09-02' },
            { neIndex: 4, nf: 'NF-004419', data: '2026-09-18' }
        ];

        const estoqueCriado = []; // guardará { estoque_id, ...item }

        for (const r of recebimentosData) {
            const neId = neIds[r.neIndex];
            const resRec = await client.query(`
                INSERT INTO recebimentos (tipo, nota_empenho_id, doador_id, nota_fiscal, data_entrega)
                VALUES ('empenho', $1, NULL, $2, $3) RETURNING id
            `, [neId, r.nf, r.data]);
            const recId = resRec.rows[0].id;

            // Itens pertencentes a esta NE
            const itensDestaNe = itensCadastrados.filter(it => it.neIndex === r.neIndex);
            for (const item of itensDestaNe) {
                // Insere item_recebimento
                const resItemRec = await client.query(`
                    INSERT INTO itens_recebimento (
                        recebimento_id, item_empenho_id, descricao, codigo_barras, lote, 
                        perecivel, quantidade, unidade, valor_unitario, validade, 
                        nota_fiscal, data_entrega, garantia, data_garantia
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    RETURNING id
                `, [
                    recId, item.item_empenho_id, item.descricao, item.barcode, item.lote,
                    item.perecivel, item.quantidade, item.unidade, item.valor_unitario, item.validade,
                    r.nf, r.data, item.garantia, item.data_garantia
                ]);
                const itemRecId = resItemRec.rows[0].id;

                // Insere estoque
                const resEst = await client.query(`
                    INSERT INTO estoque (
                        item_recebimento_id, codigo_siafisico, codigo_compras, descricao, 
                        codigo_barras, lote, perecivel, unidade, quantidade_atual, 
                        valor_unitario, validade, natureza_despesa, garantia, data_garantia
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    RETURNING id
                `, [
                    itemRecId, item.codigo_siafisico, item.codigo_compras, item.descricao,
                    item.barcode, item.lote, item.perecivel, item.unidade, item.quantidade,
                    item.valor_unitario, item.validade, item.natureza, item.garantia, item.data_garantia
                ]);

                estoqueCriado.push({
                    estoque_id: resEst.rows[0].id,
                    ...item
                });
            }
        }

        // 9. Recebimento Extra via Doação
        console.log('🎁 Registrando Recebimento via Doação...');
        const resDoacao = await client.query(`
            INSERT INTO recebimentos (tipo, nota_empenho_id, doador_id, nota_fiscal, data_entrega)
            VALUES ('doacao', NULL, $1, 'TERMO-DOA-001/2026', '2026-09-25') RETURNING id
        `, [doadorId]);
        const doacaoRecId = resDoacao.rows[0].id;

        const itensDoacao = [
            {
                codigo_siafisico: '39102',
                codigo_compras: '82019',
                descricao: 'Máscara N95 / PFF2 Descartável Hospitalar',
                perecivel: true,
                natureza: 'Material Hospitalar',
                quantidade: 800,
                unidade: 'Unidade',
                valor_unitario: 2.10,
                garantia: false,
                data_garantia: null,
                lote: 'LT26-MASC19',
                validade: '2028-06-15',
                barcode: '7891000391028'
            },
            {
                codigo_siafisico: '29401',
                codigo_compras: '38291',
                descricao: 'Coletor Universal de Amostras Estéril 80ml',
                perecivel: true,
                natureza: 'Material Hospitalar',
                quantidade: 600,
                unidade: 'Frasco',
                valor_unitario: 0.75,
                garantia: false,
                data_garantia: null,
                lote: 'LT26-COL20',
                validade: '2027-10-10',
                barcode: '7891000294019'
            }
        ];

        for (const item of itensDoacao) {
            await client.query(`
                INSERT INTO catalogo_itens (codigo_siafisico, codigo_compras, descricao)
                VALUES ($1, $2, $3)
                ON CONFLICT (codigo_siafisico) DO UPDATE 
                SET codigo_compras = EXCLUDED.codigo_compras, descricao = EXCLUDED.descricao, atualizado_em = NOW()
            `, [item.codigo_siafisico, item.codigo_compras, item.descricao]);

            const resItemRec = await client.query(`
                INSERT INTO itens_recebimento (
                    recebimento_id, item_empenho_id, descricao, codigo_barras, lote, 
                    perecivel, quantidade, unidade, valor_unitario, validade, 
                    nota_fiscal, data_entrega, garantia, data_garantia
                ) VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id
            `, [
                doacaoRecId, item.descricao, item.barcode, item.lote,
                item.perecivel, item.quantidade, item.unidade, item.valor_unitario, item.validade,
                'TERMO-DOA-001/2026', '2026-09-25', item.garantia, item.data_garantia
            ]);
            const itemRecId = resItemRec.rows[0].id;

            const resEst = await client.query(`
                INSERT INTO estoque (
                    item_recebimento_id, codigo_siafisico, codigo_compras, descricao, 
                    codigo_barras, lote, perecivel, unidade, quantidade_atual, 
                    valor_unitario, validade, natureza_despesa, garantia, data_garantia
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING id
            `, [
                itemRecId, item.codigo_siafisico, item.codigo_compras, item.descricao,
                item.barcode, item.lote, item.perecivel, item.unidade, item.quantidade,
                item.valor_unitario, item.validade, item.natureza, item.garantia, item.data_garantia
            ]);

            estoqueCriado.push({
                estoque_id: resEst.rows[0].id,
                ...item
            });
        }

        // 10. Obter Todos os 21 Centros Consumidores e 7 Divisões
        console.log('🏛️ Buscando Centros Consumidores e Divisões...');
        const ccsRows = await client.query(`
            SELECT id, codigo, nome, is_divisao 
            FROM centros_consumidores 
            ORDER BY is_divisao ASC, codigo ASC
        `);
        const todosCCs = ccsRows.rows.filter(c => !c.is_divisao); // 21 CCs
        const todasDivs = ccsRows.rows.filter(c => c.is_divisao); // 7 Divisões

        console.log(`Encontrados ${todosCCs.length} Centros Consumidores e ${todasDivs.length} Divisões.`);

        // 11. Gerar Dispensações para TODOS os 21 Centros Consumidores (e algumas Divisões diretas)
        console.log('📦 Gerando Dispensações com Guias e PDFs oficiais...');

        // Datas distribuídas por mês (Julho, Agosto, Setembro, Outubro de 2026) para alimentar gráficos
        const datasDispensacoes = [
            '2026-07-20 09:15:00',
            '2026-07-28 14:30:00',
            '2026-08-08 10:20:00',
            '2026-08-14 11:45:00',
            '2026-08-22 16:10:00',
            '2026-08-29 08:50:00',
            '2026-09-04 13:15:00',
            '2026-09-10 15:40:00',
            '2026-09-16 09:30:00',
            '2026-09-21 11:00:00',
            '2026-09-28 14:20:00',
            '2026-10-01 08:30:00',
            '2026-10-02 10:00:00'
        ];

        let guiaSeq = 1;

        // Distribuição de produtos coerentes para cada tipo de setor:
        // Materiais médicos/assistenciais -> Ambulatório, Internação, Farmácia, Fisioterapia, Enfermagem, etc.
        // Materiais laboratoriais -> Análises Clínicas, Micologia, Patologia, Imunologia, Pesquisa
        // Materiais de escritório e limpeza -> Administração, Finanças, Biblioteca, SAME, Treinamento, Seção de Pessoal, etc.
        // Automotivo -> Sub Frota, Manutenção

        const getItensParaSetor = (nomeCc) => {
            const n = nomeCc.toLowerCase();
            if (n.includes('análises') || n.includes('micologia') || n.includes('patologia') || n.includes('imunologia')) {
                // Laboratórios
                return [
                    { siaf: '14205', qtd: 20 }, // Luvas
                    { siaf: '29401', qtd: 30 }, // Coletores
                    { siaf: '39102', qtd: 15 }, // Máscaras
                    { siaf: '59302', qtd: 4 }   // Álcool
                ];
            } else if (n.includes('ambulatório') || n.includes('internação') || n.includes('enfermagem') || n.includes('farmácia')) {
                // Assistencial / Enfermagem
                return [
                    { siaf: '14205', qtd: 50 }, // Luvas
                    { siaf: '28491', qtd: 60 }, // Seringas
                    { siaf: '10482', qtd: 40 }, // Gazes
                    { siaf: '18294', qtd: 10 }, // Micropore
                    { siaf: '59302', qtd: 8 },  // Álcool 70
                    { siaf: '91029', qtd: 1 }   // Tensionômetro
                ];
            } else if (n.includes('fisioterapia') || n.includes('reabilitação')) {
                return [
                    { siaf: '14205', qtd: 25 },
                    { siaf: '59302', qtd: 5 },
                    { siaf: '93842', qtd: 1 },  // Oxímetro
                    { siaf: '62819', qtd: 3 }   // Sabonete
                ];
            } else if (n.includes('limpeza') || n.includes('conservação')) {
                return [
                    { siaf: '41920', qtd: 10 }, // Detergente 5L
                    { siaf: '62819', qtd: 15 }, // Sabonete
                    { siaf: '48201', qtd: 200 }, // Saco lixo
                    { siaf: '48202', qtd: 30 }  // Papel toalha
                ];
            } else if (n.includes('frota') || n.includes('manutenção')) {
                return [
                    { siaf: '67102', qtd: 2 },  // Pneus
                    { siaf: '67103', qtd: 4 },  // Óleo motor
                    { siaf: '72910', qtd: 2 }   // Papel sulfite
                ];
            } else {
                // Administrativo / Outros (Finanças, Biblioteca, Pessoal, SAME, etc.)
                return [
                    { siaf: '72910', qtd: 15 }, // Papel Sulfite
                    { siaf: '83912', qtd: 20 }, // Canetas
                    { siaf: '84920', qtd: 1 },  // Grampeador
                    { siaf: '48202', qtd: 8 }   // Papel toalha
                ];
            }
        };

        // Lista de todos os destinos a receberem dispensação: todos os 21 CCs + 4 divisões diretas
        const destinos = [
            ...todosCCs,
            todasDivs[0], // DIV-001 Administração
            todasDivs[1], // DIV-002 Dermatologia
            todasDivs[3], // DIV-004 Enfermagem
            todasDivs[4]  // DIV-005 Pesquisa e Ensino
        ];

        for (let i = 0; i < destinos.length; i++) {
            const destino = destinos[i];
            const dataHoraDispensacao = datasDispensacoes[i % datasDispensacoes.length];
            const codigoGuia = `DSP-2026-${String(guiaSeq++).padStart(4, '0')}`;
            const obs = `Atendimento programado de suprimento para ${destino.nome}.`;

            // Buscar itens que serão dispensados para este setor
            const itensConfigSetor = getItensParaSetor(destino.nome);
            const itensPdf = [];
            const itensDispensar = [];

            for (const itemPlan of itensConfigSetor) {
                const itemEst = estoqueCriado.find(e => e.codigo_siafisico === itemPlan.siaf);
                if (itemEst) {
                    itensDispensar.push({
                        estoque_id: itemEst.estoque_id,
                        quantidade: itemPlan.qtd,
                        itemEst: itemEst
                    });

                    itensPdf.push({
                        descricao: itemEst.descricao,
                        codigo_siafisico: itemEst.codigo_siafisico,
                        codigo_compras: itemEst.codigo_compras,
                        lote: itemEst.lote,
                        validade: itemEst.validade,
                        quantidade: itemPlan.qtd,
                        unidade: itemEst.unidade
                    });
                }
            }

            // Gerar o PDF Oficial da Guia de Dispensação (com o verde oficial do ILSL no cabeçalho!)
            const dataFormatadaPdf = new Date(dataHoraDispensacao.replace(' ', 'T')).toLocaleString('pt-BR');
            const pdfBuffer = await gerarPdfGuiaDispensacao({
                codigo: codigoGuia,
                dataHora: dataFormatadaPdf,
                centro: { codigo: destino.codigo, nome: destino.nome },
                usuario: { nome: adminUser.nome },
                observacoes: obs,
                itens: itensPdf
            });

            // Inserir registro da Guia
            const resGuia = await client.query(`
                INSERT INTO guias_dispensacao (codigo, centro_consumidor_id, usuario_id, observacoes, pdf_conteudo, criado_em)
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
            `, [codigoGuia, destino.id, adminUser.id, obs, pdfBuffer, dataHoraDispensacao]);
            const guiaId = resGuia.rows[0].id;

            // Inserir as dispensações e baixar o estoque
            for (const disp of itensDispensar) {
                await client.query(`
                    INSERT INTO dispensacoes (guia_id, estoque_id, centro_consumidor_id, quantidade, usuario_id, lote, criado_em)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    guiaId, disp.estoque_id, destino.id, disp.quantidade, adminUser.id,
                    disp.itemEst.lote || null, dataHoraDispensacao
                ]);

                // Atualizar quantidade_atual no estoque
                await client.query(`
                    UPDATE estoque 
                    SET quantidade_atual = GREATEST(0, quantidade_atual - $1)
                    WHERE id = $2
                `, [disp.quantidade, disp.estoque_id]);
            }
        }

        await client.query('COMMIT');
        console.log('✅ Sucesso! Base de dados alimentada com sucesso!');
        console.log(`- 5 Notas de Empenho completas (Pregão e ATA)`);
        console.log(`- 5 Fornecedores com dados completos`);
        console.log(`- 1 Doador e Recebimento de Doação`);
        console.log(`- 20 Itens cadastrados no Catálogo, Empenhos e Estoque`);
        console.log(`- 25 Guias de Dispensação com PDFs gerados`);
        console.log(`- Todos os 21 Centros Consumidores contemplados com dispensações reais`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro durante o seed do banco de dados:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
