const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/roles');

router.use(verifyToken, requireRole('admin', 'suprimento'));

// GET / - Buscar item no catálogo por SIAFÍSICO ou COMPRAS
router.get('/', async (req, res) => {
    try {
        const { get, all } = getDb();
        const { siafisico, compras, q } = req.query;

        if (siafisico) {
            const item = await get(
                'SELECT * FROM catalogo_itens WHERE UPPER(TRIM(codigo_siafisico)) = UPPER(TRIM($1))', 
                [siafisico]
            );
            if (!item) {
                return res.status(404).json({ error: 'Item não encontrado no catálogo.' });
            }
            return res.json(item);
        }

        if (compras) {
            const itens = await all(
                'SELECT * FROM catalogo_itens WHERE UPPER(TRIM(codigo_compras)) = UPPER(TRIM($1)) ORDER BY descricao ASC', 
                [compras]
            );
            return res.json(itens);
        }

        if (q) {
            const term = `%${q.trim()}%`;
            const itens = await all(
                'SELECT * FROM catalogo_itens WHERE codigo_siafisico ILIKE $1 OR codigo_compras ILIKE $1 OR descricao ILIKE $1 ORDER BY descricao ASC LIMIT 20',
                [term]
            );
            return res.json(itens);
        }

        const todos = await all('SELECT * FROM catalogo_itens ORDER BY atualizado_em DESC LIMIT 100');
        res.json(todos);
    } catch (error) {
        console.error('Erro ao consultar catálogo:', error);
        res.status(500).json({ error: 'Erro ao consultar catálogo de itens.' });
    }
});

// POST / - Registrar ou atualizar item no catálogo
router.post('/', async (req, res) => {
    try {
        const { get, run } = getDb();
        const { codigo_siafisico, codigo_compras, descricao, forcar_atualizacao } = req.body;

        if (!codigo_siafisico || !codigo_compras || !descricao) {
            return res.status(400).json({ error: 'Código SIAFÍSICO, Código Compras e Descrição são obrigatórios.' });
        }

        const siaf = String(codigo_siafisico).trim();
        const comp = String(codigo_compras).trim();
        const desc = String(descricao).trim();

        const existente = await get(
            'SELECT * FROM catalogo_itens WHERE UPPER(TRIM(codigo_siafisico)) = UPPER(TRIM($1))', 
            [siaf]
        );

        if (existente) {
            if (forcar_atualizacao) {
                await run(
                    'UPDATE catalogo_itens SET codigo_compras = $1, descricao = $2, atualizado_em = NOW() WHERE id = $3',
                    [comp, desc, existente.id]
                );
                return res.json({ message: 'Item do catálogo atualizado com sucesso.', id: existente.id });
            } else {
                return res.json({ message: 'Item já existente no catálogo mantido.', id: existente.id, existente });
            }
        }

        const info = await run(
            'INSERT INTO catalogo_itens (codigo_siafisico, codigo_compras, descricao) VALUES ($1, $2, $3)',
            [siaf, comp, desc]
        );

        res.status(201).json({ message: 'Item inserido no catálogo.', id: info.lastInsertRowid });
    } catch (error) {
        console.error('Erro ao salvar item no catálogo:', error);
        res.status(500).json({ error: 'Erro ao salvar item no catálogo.' });
    }
});

module.exports = router;
