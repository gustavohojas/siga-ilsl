const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { gerarPdfGuiaDispensacao } = require('../utils/pdfGenerator');

router.use(verifyToken, requireRole('admin', 'suprimento'));

// GET / - Listar dispensações com joins
router.get('/', async (req, res) => {
    try {
        const { all } = getDb();
        const dispensacoes = await all(`
            SELECT d.id, d.guia_id, g.codigo as guia_codigo, d.quantidade, d.criado_em, 
                   COALESCE(d.lote, e.lote) as lote,
                   e.descricao as estoque_descricao, e.unidade,
                   cc.nome as centro_consumidor_nome, cc.codigo as centro_consumidor_codigo,
                   u.nome as usuario_nome
            FROM dispensacoes d
            LEFT JOIN guias_dispensacao g ON d.guia_id = g.id
            JOIN estoque e ON d.estoque_id = e.id
            JOIN centros_consumidores cc ON d.centro_consumidor_id = cc.id
            JOIN usuarios u ON d.usuario_id = u.id
            ORDER BY d.criado_em DESC
        `);
        res.json(dispensacoes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao listar dispensações.' });
    }
});

// GET /guias/:id/pdf - Obter PDF oficial da Guia de Dispensação
router.get('/guias/:id/pdf', async (req, res) => {
    try {
        const { get } = getDb();
        const { id } = req.params;

        const guia = await get('SELECT id, codigo, pdf_conteudo FROM guias_dispensacao WHERE id = $1', [id]);
        if (!guia || !guia.pdf_conteudo) {
            return res.status(404).json({ error: 'Guia de dispensação ou arquivo PDF não encontrado.' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${guia.codigo}.pdf"`);
        res.send(guia.pdf_conteudo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao recuperar PDF da guia.' });
    }
});

// GET /estoque/buscar - Buscar itens no estoque por código de barras ou termo
router.get('/estoque/buscar', async (req, res) => {
    try {
        const { all } = getDb();
        const { q, barcode } = req.query;
        let items = [];

        if (barcode) {
            // Busca exata por código de barras
            items = await all(`
                SELECT * FROM estoque 
                WHERE quantidade_atual > 0 AND codigo_barras = $1
                ORDER BY validade ASC NULLS LAST, lote ASC
            `, [barcode.trim()]);
        } else if (!q) {
            items = await all('SELECT * FROM estoque WHERE quantidade_atual > 0 ORDER BY descricao ASC');
        } else {
            const searchTerm = `%${q.trim()}%`;
            items = await all(`
                SELECT * FROM estoque 
                WHERE quantidade_atual > 0 AND (
                    codigo_barras ILIKE $1 OR 
                    codigo_siafisico ILIKE $1 OR 
                    codigo_compras ILIKE $1 OR 
                    descricao ILIKE $1 OR
                    lote ILIKE $1
                )
                ORDER BY descricao ASC, validade ASC NULLS LAST
            `, [searchTerm]);
        }

        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar itens no estoque.' });
    }
});

// POST / - Criar dispensação (suporta item único ou lote de múltiplos itens / cesta)
router.post('/', async (req, res) => {
    try {
        const { transaction } = getDb();
        const usuario_id = req.user.id;
        const usuario_nome = req.user.nome || 'Operador Almoxarifado';
        const { centro_consumidor_id, observacoes } = req.body;

        // Normaliza itens: pode vir array 'itens' ou 'estoque_id' + 'quantidade'
        let listaItens = [];
        if (Array.isArray(req.body.itens) && req.body.itens.length > 0) {
            listaItens = req.body.itens;
        } else if (req.body.estoque_id && req.body.quantidade) {
            listaItens = [{ estoque_id: req.body.estoque_id, quantidade: req.body.quantidade }];
        }

        if (!centro_consumidor_id || listaItens.length === 0) {
            return res.status(400).json({ error: 'Informe o centro consumidor e ao menos um item para dispensar.' });
        }

        const result = await transaction(async (tx) => {
            const centro = await tx.get('SELECT id, codigo, nome FROM centros_consumidores WHERE id = $1', [centro_consumidor_id]);
            if (!centro) {
                throw new Error('Centro consumidor não encontrado.');
            }

            // Gerar código único de Guia (Ex: DSP-2026-0001)
            const anoAtual = new Date().getFullYear();
            const prefixo = `DSP-${anoAtual}-`;
            const countRow = await tx.get('SELECT COUNT(*) as total FROM guias_dispensacao WHERE codigo LIKE $1', [`${prefixo}%`]);
            const seq = (parseInt(countRow.total) || 0) + 1;
            const codigoGuia = `${prefixo}${String(seq).padStart(4, '0')}`;

            // Criar registro da Guia
            const infoGuia = await tx.run(`
                INSERT INTO guias_dispensacao (codigo, centro_consumidor_id, usuario_id, observacoes)
                VALUES ($1, $2, $3, $4)
            `, [codigoGuia, centro_consumidor_id, usuario_id, observacoes ? String(observacoes).trim() : null]);
            const guiaId = infoGuia.lastInsertRowid;

            const itensPdf = [];

            for (const item of listaItens) {
                const estoqueId = item.estoque_id;
                const qtdSolicitada = parseFloat(item.quantidade);

                if (!estoqueId || !qtdSolicitada || qtdSolicitada <= 0) {
                    throw new Error('Quantidade inválida para um dos itens da dispensação.');
                }

                const itemEstoque = await tx.get(`
                    SELECT id, descricao, codigo_siafisico, codigo_compras, codigo_barras, lote, validade, unidade, quantidade_atual 
                    FROM estoque WHERE id = $1
                `, [estoqueId]);

                if (!itemEstoque) {
                    throw new Error(`Item de estoque #${estoqueId} não encontrado.`);
                }

                const qtdAtual = parseFloat(itemEstoque.quantidade_atual);
                if (qtdSolicitada > qtdAtual) {
                    throw new Error(`Saldo insuficiente para "${itemEstoque.descricao}" (Lote: ${itemEstoque.lote || 'Sem lote'}). Solicitado: ${qtdSolicitada}, Disponível: ${qtdAtual}.`);
                }

                // Baixar estoque
                await tx.run('UPDATE estoque SET quantidade_atual = quantidade_atual - $1 WHERE id = $2', [qtdSolicitada, estoqueId]);

                // Registrar dispensação vinculada à Guia
                await tx.run(`
                    INSERT INTO dispensacoes (guia_id, estoque_id, centro_consumidor_id, quantidade, usuario_id, lote)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [guiaId, estoqueId, centro_consumidor_id, qtdSolicitada, usuario_id, itemEstoque.lote || null]);

                itensPdf.push({
                    descricao: itemEstoque.descricao,
                    codigo_siafisico: itemEstoque.codigo_siafisico,
                    codigo_compras: itemEstoque.codigo_compras,
                    lote: itemEstoque.lote,
                    validade: itemEstoque.validade,
                    quantidade: qtdSolicitada,
                    unidade: itemEstoque.unidade
                });
            }

            // Gerar PDF oficial da Guia
            const dataHoraAtual = new Date().toLocaleString('pt-BR');
            const pdfBuffer = await gerarPdfGuiaDispensacao({
                codigo: codigoGuia,
                dataHora: dataHoraAtual,
                centro: { codigo: centro.codigo, nome: centro.nome },
                usuario: { nome: usuario_nome },
                observacoes: observacoes ? String(observacoes).trim() : null,
                itens: itensPdf
            });

            // Grava PDF no banco
            await tx.run('UPDATE guias_dispensacao SET pdf_conteudo = $1 WHERE id = $2', [pdfBuffer, guiaId]);

            return {
                guia_id: guiaId,
                codigo: codigoGuia,
                total_itens: itensPdf.length
            };
        });

        res.status(201).json({
            message: 'Dispensação realizada com sucesso.',
            guia_id: result.guia_id,
            codigo: result.codigo,
            pdf_url: `/api/dispensacoes/guias/${result.guia_id}/pdf`
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message || 'Erro ao realizar dispensação.' });
    }
});

module.exports = router;
