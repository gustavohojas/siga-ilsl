const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/roles');

router.use(verifyToken, requireRole('admin', 'suprimento'));

// GET / - Listar todas
router.get('/', async (req, res) => {
    try {
        const { all } = getDb();
        const naturezas = await all('SELECT * FROM naturezas_despesa ORDER BY nome ASC');
        res.json(naturezas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar naturezas de despesa.' });
    }
});

// POST / - Criar
router.post('/', async (req, res) => {
    try {
        const { get, run } = getDb();
        const { nome } = req.body;
        if (!nome) {
            return res.status(400).json({ error: 'O nome é obrigatório.' });
        }

        const existente = await get('SELECT id FROM naturezas_despesa WHERE nome = $1', [nome]);
        if (existente) {
            return res.status(409).json({ error: 'Natureza de despesa já cadastrada.' });
        }

        const info = await run('INSERT INTO naturezas_despesa (nome) VALUES ($1)', [nome]);
        res.status(201).json({ id: info.lastInsertRowid, nome });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar natureza de despesa.' });
    }
});

// PUT /:id - Atualizar
router.put('/:id', async (req, res) => {
    try {
        const { get, run } = getDb();
        const { id } = req.params;
        const { nome } = req.body;

        if (!nome) {
            return res.status(400).json({ error: 'O nome é obrigatório.' });
        }

        const existente = await get('SELECT id FROM naturezas_despesa WHERE nome = $1 AND id != $2', [nome, id]);
        if (existente) {
            return res.status(409).json({ error: 'Já existe outra natureza de despesa com este nome.' });
        }

        const info = await run('UPDATE naturezas_despesa SET nome = $1 WHERE id = $2', [nome, id]);
        
        if (info.changes === 0) {
            return res.status(404).json({ error: 'Natureza de despesa não encontrada.' });
        }

        res.json({ message: 'Atualizado com sucesso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar natureza de despesa.' });
    }
});

// DELETE /:id - Excluir (verificando se está em uso primeiro)
router.delete('/:id', async (req, res) => {
    try {
        const { get, run } = getDb();
        const { id } = req.params;

        const natureza = await get('SELECT nome FROM naturezas_despesa WHERE id = $1', [id]);
        if (!natureza) {
            return res.status(404).json({ error: 'Natureza de despesa não encontrada.' });
        }

        // Verifica se a natureza está em uso nos itens de empenho
        const emUsoEmpenho = await get('SELECT id FROM itens_empenho WHERE natureza_despesa = $1 LIMIT 1', [natureza.nome]);
        
        // Verifica se a natureza está em uso no estoque
        const emUsoEstoque = await get('SELECT id FROM estoque WHERE natureza_despesa = $1 LIMIT 1', [natureza.nome]);

        if (emUsoEmpenho || emUsoEstoque) {
            return res.status(400).json({ error: 'Não é possível excluir: Natureza de despesa em uso.' });
        }

        await run('DELETE FROM naturezas_despesa WHERE id = $1', [id]);
        res.json({ message: 'Excluída com sucesso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao excluir natureza de despesa.' });
    }
});

module.exports = router;
