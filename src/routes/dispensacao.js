const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/roles');

router.use(verifyToken, requireRole('admin', 'suprimento'));

// GET / - Listar dispensações com joins
router.get('/', async (req, res) => {
    try {
        const { all } = getDb();
        const dispensacoes = await all(`
            SELECT d.id, d.quantidade, d.criado_em, 
                   e.descricao as estoque_descricao, e.unidade,
                   cc.nome as centro_consumidor_nome, cc.codigo as centro_consumidor_codigo,
                   u.nome as usuario_nome
            FROM dispensacoes d
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

// GET /estoque/buscar?q=term - Buscar itens no estoque
router.get('/estoque/buscar', async (req, res) => {
    try {
        const { all } = getDb();
        const { q } = req.query;
        let items = [];

        if (!q) {
            items = await all('SELECT * FROM estoque WHERE quantidade_atual > 0 ORDER BY descricao ASC');
        } else {
            const searchTerm = `%${q}%`;
            items = await all(`
                SELECT * FROM estoque 
                WHERE quantidade_atual > 0 AND (
                    codigo_siafisico ILIKE $1 OR 
                    codigo_compras ILIKE $1 OR 
                    descricao ILIKE $1
                )
                ORDER BY descricao ASC
            `, [searchTerm]);
        }

        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar itens no estoque.' });
    }
});

// POST / - Criar dispensação
router.post('/', async (req, res) => {
    try {
        const { transaction } = getDb();
        const { estoque_id, centro_consumidor_id, quantidade } = req.body;
        const usuario_id = req.user.id;

        if (!estoque_id || !centro_consumidor_id || !quantidade || quantidade <= 0) {
            return res.status(400).json({ error: 'Dados inválidos para dispensação.' });
        }

        const result = await transaction(async (tx) => {
            const itemEstoque = await tx.get('SELECT quantidade_atual FROM estoque WHERE id = $1', [estoque_id]);
            
            if (!itemEstoque) {
                throw new Error('Item de estoque não encontrado.');
            }
            
            const qtdAtual = parseFloat(itemEstoque.quantidade_atual);
            const qtdSolicitada = parseFloat(quantidade);

            if (qtdSolicitada > qtdAtual) {
                throw new Error(`Quantidade solicitada (${qtdSolicitada}) é maior que o estoque atual (${qtdAtual}).`);
            }

            const centro = await tx.get('SELECT id FROM centros_consumidores WHERE id = $1', [centro_consumidor_id]);
            if (!centro) {
                throw new Error('Centro consumidor não encontrado.');
            }

            await tx.run('UPDATE estoque SET quantidade_atual = quantidade_atual - $1 WHERE id = $2', [qtdSolicitada, estoque_id]);

            const info = await tx.run(`
                INSERT INTO dispensacoes (estoque_id, centro_consumidor_id, quantidade, usuario_id)
                VALUES ($1, $2, $3, $4)
            `, [estoque_id, centro_consumidor_id, qtdSolicitada, usuario_id]);

            return { id: info.lastInsertRowid };
        });

        res.status(201).json({ message: 'Dispensação realizada com sucesso.', id: result.id });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message || 'Erro ao realizar dispensação.' });
    }
});

module.exports = router;
