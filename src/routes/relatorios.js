const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const ExcelJS = require('exceljs');

router.use(verifyToken, requireRole('admin', 'suprimento'));

// Função auxiliar para exportar para Excel
async function exportToExcel(res, data, columns, filename) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório');
    
    worksheet.columns = columns;
    data.forEach(row => worksheet.addRow(row));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
}

// GET /estoque/total - all stock items with current quantities
router.get('/estoque/total', async (req, res) => {
    try {
        const { all } = getDb();
        const query = `
            SELECT id, codigo_siafisico, codigo_compras, descricao, quantidade_atual, unidade, validade, garantia, data_garantia, natureza_despesa
            FROM estoque
            ORDER BY descricao ASC
        `;
        const data = await all(query);

        if (req.query.export === 'excel') {
            const columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Cód. Siafisico', key: 'codigo_siafisico', width: 15 },
                { header: 'Cód. Compras', key: 'codigo_compras', width: 15 },
                { header: 'Descrição', key: 'descricao', width: 40 },
                { header: 'Qtd Atual', key: 'quantidade_atual', width: 15 },
                { header: 'Unidade', key: 'unidade', width: 10 },
                { header: 'Validade', key: 'validade', width: 15 },
                { header: 'Garantia', key: 'data_garantia', width: 15 },
                { header: 'Natureza de Despesa', key: 'natureza_despesa', width: 20 }
            ];
            await exportToExcel(res, data, columns, 'estoque_total');
        } else {
            res.json(data);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar relatório.' });
    }
});

// GET /estoque/item/:id - specific item details
router.get('/estoque/item/:id', async (req, res) => {
    try {
        const { get } = getDb();
        const item = await get('SELECT * FROM estoque WHERE id = $1', [req.params.id]);
        if (!item) {
            return res.status(404).json({ error: 'Item não encontrado.' });
        }
        res.json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar detalhes do item.' });
    }
});

// GET /estoque/item/:id/historico - entry and exit history for an item
router.get('/estoque/item/:id/historico', async (req, res) => {
    try {
        const { all } = getDb();
        const id = req.params.id;
        
        // Exits (Dispensações)
        const saidas = await all(`
            SELECT d.criado_em as data, d.quantidade as qtd, 'SAIDA' as tipo, cc.nome as origem_destino
            FROM dispensacoes d
            JOIN centros_consumidores cc ON d.centro_consumidor_id = cc.id
            WHERE d.estoque_id = $1
        `, [id]);

        // Entries (Recebimentos)
        const entradas = await all(`
            SELECT r.data_entrega as data, ir.quantidade as qtd, 'ENTRADA' as tipo, 
                   COALESCE(e.razao_social, d.nome_razao_social) as origem_destino
            FROM estoque est
            JOIN itens_recebimento ir ON est.item_recebimento_id = ir.id
            JOIN recebimentos r ON ir.recebimento_id = r.id
            LEFT JOIN notas_empenho ne ON r.nota_empenho_id = ne.id
            LEFT JOIN empresas e ON ne.empresa_id = e.id
            LEFT JOIN doadores d ON r.doador_id = d.id
            WHERE est.id = $1
        `, [id]);

        const historico = [...entradas, ...saidas].sort((a, b) => new Date(b.data) - new Date(a.data));

        if (req.query.export === 'excel') {
            const columns = [
                { header: 'Data', key: 'data', width: 20 },
                { header: 'Tipo', key: 'tipo', width: 15 },
                { header: 'Quantidade', key: 'qtd', width: 15 },
                { header: 'Origem/Destino', key: 'origem_destino', width: 40 }
            ];
            await exportToExcel(res, historico, columns, `historico_item_${id}`);
        } else {
            res.json(historico);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar histórico.' });
    }
});

// GET /estoque/validade - perishable items ordered by expiration date
router.get('/estoque/validade', async (req, res) => {
    try {
        const { all } = getDb();
        const query = `
            SELECT id, descricao, quantidade_atual, validade
            FROM estoque
            WHERE perecivel = TRUE AND validade IS NOT NULL AND quantidade_atual > 0
            ORDER BY validade ASC
        `;
        const data = await all(query);

        if (req.query.export === 'excel') {
            const columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Descrição', key: 'descricao', width: 40 },
                { header: 'Quantidade', key: 'quantidade_atual', width: 15 },
                { header: 'Validade', key: 'validade', width: 15 }
            ];
            await exportToExcel(res, data, columns, 'estoque_validade');
        } else {
            res.json(data);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar relatório.' });
    }
});

// GET /estoque/garantia - products under warranty (active and expired)
router.get('/estoque/garantia', async (req, res) => {
    try {
        const { all } = getDb();
        const query = `
            SELECT id, codigo_siafisico, codigo_compras, descricao, quantidade_atual, unidade, validade, garantia, data_garantia
            FROM estoque
            WHERE garantia = TRUE AND data_garantia IS NOT NULL AND quantidade_atual > 0
            ORDER BY data_garantia ASC
        `;
        const data = await all(query);

        if (req.query.export === 'excel') {
            const columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Descrição', key: 'descricao', width: 40 },
                { header: 'Quantidade', key: 'quantidade_atual', width: 15 },
                { header: 'Unidade', key: 'unidade', width: 10 },
                { header: 'Data da Garantia', key: 'data_garantia_fmt', width: 18 },
                { header: 'Situação', key: 'situacao', width: 18 }
            ];
            const rows = data.map(item => {
                const hoje = new Date().toISOString().split('T')[0];
                const dataG = item.data_garantia ? (typeof item.data_garantia === 'string' ? item.data_garantia : item.data_garantia.toISOString().split('T')[0]) : '';
                const vencida = dataG && dataG < hoje;
                return {
                    ...item,
                    data_garantia_fmt: dataG ? dataG.split('-').reverse().join('/') : '-',
                    situacao: vencida ? 'Garantia Vencida' : 'Em Garantia'
                };
            });
            await exportToExcel(res, rows, columns, 'estoque_garantia');
        } else {
            res.json(data);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar relatório de garantias.' });
    }
});

// GET /empresa - list all empresas
router.get('/empresa', async (req, res) => {
    try {
        const { all } = getDb();
        const empresas = await all('SELECT id, razao_social, cnpj FROM empresas ORDER BY razao_social ASC');
        res.json(empresas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar empresas.' });
    }
});

// GET /empresa/:id/entregues - items delivered by empresa
router.get('/empresa/:id/entregues', async (req, res) => {
    try {
        const { all } = getDb();
        const query = `
            SELECT ir.descricao, ir.quantidade, ir.data_entrega, ne.numero as numero_empenho
            FROM itens_recebimento ir
            JOIN recebimentos r ON ir.recebimento_id = r.id
            JOIN notas_empenho ne ON r.nota_empenho_id = ne.id
            WHERE ne.empresa_id = $1
            ORDER BY ir.data_entrega DESC
        `;
        const data = await all(query, [req.params.id]);

        if (req.query.export === 'excel') {
            const columns = [
                { header: 'Descrição', key: 'descricao', width: 40 },
                { header: 'Quantidade', key: 'quantidade', width: 15 },
                { header: 'Data de Entrega', key: 'data_entrega', width: 20 },
                { header: 'Nº Empenho', key: 'numero_empenho', width: 20 }
            ];
            await exportToExcel(res, data, columns, `entregas_empresa_${req.params.id}`);
        } else {
            res.json(data);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar relatório.' });
    }
});

// GET /empresa/:id/atraso - overdue items
router.get('/empresa/:id/atraso', async (req, res) => {
    try {
        const { all } = getDb();
        const query = `
            SELECT ie.descricao, ie.quantidade, ie.quantidade_recebida, 
                   (ie.quantidade - ie.quantidade_recebida) as quantidade_pendente,
                   ne.numero as numero_empenho, ne.prazo
            FROM itens_empenho ie
            JOIN notas_empenho ne ON ie.nota_empenho_id = ne.id
            WHERE ne.empresa_id = $1 
              AND ne.prazo < CURRENT_DATE::text
              AND ie.quantidade_recebida < ie.quantidade
            ORDER BY ne.prazo ASC
        `;
        const data = await all(query, [req.params.id]);

        if (req.query.export === 'excel') {
            const columns = [
                { header: 'Descrição', key: 'descricao', width: 40 },
                { header: 'Qtd Total', key: 'quantidade', width: 15 },
                { header: 'Qtd Recebida', key: 'quantidade_recebida', width: 15 },
                { header: 'Qtd Pendente', key: 'quantidade_pendente', width: 15 },
                { header: 'Nº Empenho', key: 'numero_empenho', width: 20 },
                { header: 'Prazo', key: 'prazo', width: 15 }
            ];
            await exportToExcel(res, data, columns, `atrasos_empresa_${req.params.id}`);
        } else {
            res.json(data);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar relatório.' });
    }
});

// GET /centro/:id/historico - dispensation history for centro consumidor
router.get('/centro/:id/historico', async (req, res) => {
    try {
        const { all } = getDb();
        const query = `
            SELECT e.descricao, d.quantidade, e.unidade, d.criado_em as data, u.nome as usuario_responsavel
            FROM dispensacoes d
            JOIN estoque e ON d.estoque_id = e.id
            JOIN usuarios u ON d.usuario_id = u.id
            WHERE d.centro_consumidor_id = $1
            ORDER BY d.criado_em DESC
        `;
        const data = await all(query, [req.params.id]);

        if (req.query.export === 'excel') {
            const columns = [
                { header: 'Descrição', key: 'descricao', width: 40 },
                { header: 'Quantidade', key: 'quantidade', width: 15 },
                { header: 'Unidade', key: 'unidade', width: 10 },
                { header: 'Data', key: 'data', width: 20 },
                { header: 'Responsável', key: 'usuario_responsavel', width: 30 }
            ];
            await exportToExcel(res, data, columns, `historico_centro_${req.params.id}`);
        } else {
            res.json(data);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar histórico.' });
    }
});

// GET /centro/:id/item - items consumed by centro (aggregated)
router.get('/centro/:id/item', async (req, res) => {
    try {
        const { all } = getDb();
        const query = `
            SELECT e.descricao, SUM(d.quantidade) as total_consumido, e.unidade
            FROM dispensacoes d
            JOIN estoque e ON d.estoque_id = e.id
            WHERE d.centro_consumidor_id = $1
            GROUP BY e.id, e.descricao, e.unidade
            ORDER BY total_consumido DESC
        `;
        const data = await all(query, [req.params.id]);

        if (req.query.export === 'excel') {
            const columns = [
                { header: 'Descrição', key: 'descricao', width: 40 },
                { header: 'Total Consumido', key: 'total_consumido', width: 20 },
                { header: 'Unidade', key: 'unidade', width: 10 }
            ];
            await exportToExcel(res, data, columns, `consumo_itens_centro_${req.params.id}`);
        } else {
            res.json(data);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar relatório.' });
    }
});

// GET /lote/rastreabilidade - Relatório de rastreabilidade Produto x Lote
router.get('/lote/rastreabilidade', async (req, res) => {
    try {
        const { all } = getDb();
        const { q, situacao } = req.query;
        const queryTerm = (q || '').trim();
        const searchPattern = `%${queryTerm}%`;
        const filtroSituacao = situacao || 'todos';

        let estoqueData = [];
        let dispensadoData = [];

        // Itens em estoque
        if (filtroSituacao === 'todos' || filtroSituacao === 'estoque') {
            const sqlEstoque = `
                SELECT 
                    e.id as estoque_id,
                    e.descricao,
                    e.codigo_siafisico,
                    e.codigo_compras,
                    e.codigo_barras,
                    e.lote,
                    e.quantidade_atual as quantidade,
                    e.unidade,
                    e.validade,
                    'Em Estoque' as situacao,
                    'Almoxarifado' as localizacao_destino,
                    e.criado_em as data_registro,
                    'Estoque Central' as operador
                FROM estoque e
                WHERE e.quantidade_atual > 0
                  ${queryTerm ? `AND (
                    e.lote ILIKE $1 OR 
                    e.descricao ILIKE $1 OR 
                    e.codigo_siafisico ILIKE $1 OR 
                    e.codigo_compras ILIKE $1 OR 
                    e.codigo_barras ILIKE $1
                  )` : ''}
                ORDER BY e.descricao ASC
            `;
            estoqueData = await all(sqlEstoque, queryTerm ? [searchPattern] : []);
        }

        // Itens dispensados (rastreabilidade de destino)
        if (filtroSituacao === 'todos' || filtroSituacao === 'dispensado') {
            const sqlDispensados = `
                SELECT 
                    d.id as dispensacao_id,
                    e.descricao,
                    e.codigo_siafisico,
                    e.codigo_compras,
                    e.codigo_barras,
                    COALESCE(d.lote, e.lote) as lote,
                    d.quantidade,
                    e.unidade,
                    e.validade,
                    'Dispensado' as situacao,
                    CONCAT(cc.codigo, ' - ', cc.nome) as localizacao_destino,
                    d.criado_em as data_registro,
                    u.nome as operador
                FROM dispensacoes d
                JOIN estoque e ON d.estoque_id = e.id
                JOIN centros_consumidores cc ON d.centro_consumidor_id = cc.id
                JOIN usuarios u ON d.usuario_id = u.id
                ${queryTerm ? `WHERE (
                    COALESCE(d.lote, e.lote) ILIKE $1 OR 
                    e.descricao ILIKE $1 OR 
                    e.codigo_siafisico ILIKE $1 OR 
                    e.codigo_compras ILIKE $1 OR 
                    e.codigo_barras ILIKE $1
                )` : ''}
                ORDER BY d.criado_em DESC
            `;
            dispensadoData = await all(sqlDispensados, queryTerm ? [searchPattern] : []);
        }

        let combined = [...estoqueData, ...dispensadoData].sort((a, b) => {
            return new Date(b.data_registro || 0) - new Date(a.data_registro || 0);
        });

        if (req.query.export === 'excel') {
            const exportData = combined.map(row => ({
                situacao: row.situacao,
                lote: row.lote || 'Sem Lote',
                descricao: row.descricao,
                codigo_siafisico: row.codigo_siafisico || '-',
                codigo_compras: row.codigo_compras || '-',
                quantidade: row.quantidade,
                unidade: row.unidade || '',
                validade: row.validade || '-',
                localizacao_destino: row.localizacao_destino,
                data_formatada: row.data_registro ? new Date(row.data_registro).toLocaleString('pt-BR') : '-',
                operador: row.operador || '-'
            }));

            const columns = [
                { header: 'Situação', key: 'situacao', width: 15 },
                { header: 'Lote', key: 'lote', width: 20 },
                { header: 'Descrição do Produto', key: 'descricao', width: 35 },
                { header: 'Cód. Siafísico', key: 'codigo_siafisico', width: 15 },
                { header: 'Cód. Compras', key: 'codigo_compras', width: 15 },
                { header: 'Quantidade', key: 'quantidade', width: 12 },
                { header: 'Unidade', key: 'unidade', width: 10 },
                { header: 'Validade', key: 'validade', width: 12 },
                { header: 'Localização / Destino', key: 'localizacao_destino', width: 30 },
                { header: 'Data do Registro', key: 'data_formatada', width: 20 },
                { header: 'Responsável', key: 'operador', width: 25 }
            ];
            await exportToExcel(res, exportData, columns, `rastreabilidade_lote_${Date.now()}`);
        } else {
            res.json(combined);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar relatório de rastreabilidade de lote.' });
    }
});

// GET /estornos/auditoria - Relatório de Auditoria de Estornos e Devoluções
router.get('/estornos/auditoria', async (req, res) => {
    try {
        const { all } = getDb();
        const { q, motivo } = req.query;
        const queryTerm = (q || '').trim();
        const filtroMotivo = motivo || 'todos';

        let sql = `
            SELECT 
                est.id,
                est.criado_em as data_estorno,
                u.nome as usuario_nome,
                est.tipo_motivo,
                est.quantidade as quantidade_estornada,
                est.justificativa,
                ir.descricao as item_descricao,
                ir.lote,
                ir.validade,
                ir.unidade,
                r.tipo as tipo_origem,
                r.nota_fiscal,
                ne.numero as numero_empenho,
                COALESCE(emp.razao_social, d.nome_razao_social) as fornecedor_doador,
                CASE WHEN est.pdf_conteudo IS NOT NULL THEN TRUE ELSE FALSE END as tem_pdf
            FROM estornos_recebimento est
            JOIN itens_recebimento ir ON est.item_recebimento_id = ir.id
            JOIN recebimentos r ON ir.recebimento_id = r.id
            JOIN usuarios u ON est.usuario_id = u.id
            LEFT JOIN notas_empenho ne ON r.nota_empenho_id = ne.id
            LEFT JOIN empresas emp ON ne.empresa_id = emp.id
            LEFT JOIN doadores d ON r.doador_id = d.id
            WHERE 1=1
        `;

        const params = [];

        if (filtroMotivo !== 'todos') {
            params.push(filtroMotivo);
            sql += ` AND est.tipo_motivo = $${params.length}`;
        }

        if (queryTerm) {
            params.push(`%${queryTerm}%`);
            const pIdx = params.length;
            sql += ` AND (
                ir.descricao ILIKE $${pIdx} OR 
                ir.lote ILIKE $${pIdx} OR 
                est.justificativa ILIKE $${pIdx} OR 
                u.nome ILIKE $${pIdx} OR
                COALESCE(emp.razao_social, d.nome_razao_social) ILIKE $${pIdx} OR
                ne.numero ILIKE $${pIdx} OR
                r.nota_fiscal ILIKE $${pIdx}
            )`;
        }

        sql += ' ORDER BY est.criado_em DESC';

        const data = await all(sql, params);

        if (req.query.export === 'excel') {
            const exportData = data.map(row => ({
                id: row.id,
                data: row.data_estorno ? new Date(row.data_estorno).toLocaleString('pt-BR') : '-',
                usuario: row.usuario_nome,
                motivo: row.tipo_motivo === 'erro_digitacao' ? 'Erro de Digitação' : 'Devolução ao Fornecedor',
                item: row.item_descricao,
                lote: row.lote || '-',
                quantidade: row.quantidade_estornada,
                unidade: row.unidade || '',
                empenho: row.numero_empenho || '-',
                nota_fiscal: row.nota_fiscal || '-',
                fornecedor: row.fornecedor_doador || '-',
                justificativa: row.justificativa
            }));

            const columns = [
                { header: 'ID', key: 'id', width: 8 },
                { header: 'Data/Hora', key: 'data', width: 20 },
                { header: 'Responsável', key: 'usuario', width: 25 },
                { header: 'Tipo de Motivo', key: 'motivo', width: 25 },
                { header: 'Item / Material', key: 'item', width: 35 },
                { header: 'Lote', key: 'lote', width: 18 },
                { header: 'Qtd Estornada', key: 'quantidade', width: 15 },
                { header: 'Unidade', key: 'unidade', width: 10 },
                { header: 'Nº Empenho', key: 'empenho', width: 18 },
                { header: 'Nota Fiscal', key: 'nota_fiscal', width: 18 },
                { header: 'Fornecedor / Doador', key: 'fornecedor', width: 30 },
                { header: 'Justificativa por Extenso', key: 'justificativa', width: 50 }
            ];
            await exportToExcel(res, exportData, columns, `auditoria_estornos_${Date.now()}`);
        } else {
            res.json(data);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar relatório de auditoria de estornos.' });
    }
});

module.exports = router;


