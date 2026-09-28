const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/roles');

router.use(verifyToken, requireRole('admin', 'suprimento'));

// GET / - Listar centros consumidores (ordenado por código)
router.get('/', async (req, res) => {
    try {
        const { all } = getDb();
        const centros = await all('SELECT * FROM centros_consumidores ORDER BY codigo ASC');
        res.json(centros);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar centros consumidores.' });
    }
});

// POST / - Criar centro consumidor (código auto-gerado sequencial)
router.post('/', async (req, res) => {
    try {
        const { transaction } = getDb();
        const { nome } = req.body;
        
        if (!nome) {
            return res.status(400).json({ error: 'O nome é obrigatório.' });
        }

        const result = await transaction(async (tx) => {
            const allCentros = await tx.all('SELECT codigo FROM centros_consumidores');
            let maxNum = 0;
            for (const c of allCentros) {
                if (c && c.codigo) {
                    const match = c.codigo.match(/\d+/);
                    if (match) {
                        const num = parseInt(match[0], 10);
                        if (num > maxNum) maxNum = num;
                    }
                }
            }
            const nextNum = maxNum + 1;
            const codigo = 'CC-' + String(nextNum).padStart(3, '0');
            const info = await tx.run('INSERT INTO centros_consumidores (codigo, nome) VALUES ($1, $2)', [codigo, nome]);
            
            return { id: info.lastInsertRowid, codigo, nome };
        });

        res.status(201).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar centro consumidor.' });
    }
});

// PUT /:id - Atualizar nome
router.put('/:id', async (req, res) => {
    try {
        const { run } = getDb();
        const { id } = req.params;
        const { nome } = req.body;

        if (!nome) {
            return res.status(400).json({ error: 'O nome é obrigatório.' });
        }

        const info = await run('UPDATE centros_consumidores SET nome = $1 WHERE id = $2', [nome, id]);
        
        if (info.changes === 0) {
            return res.status(404).json({ error: 'Centro consumidor não encontrado.' });
        }

        res.json({ message: 'Centro consumidor atualizado com sucesso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar centro consumidor.' });
    }
});

// DELETE /:id - Excluir (verificar se há dispensações)
router.delete('/:id', async (req, res) => {
    try {
        const { get, run } = getDb();
        const { id } = req.params;

        const dispensacoes = await get('SELECT id FROM dispensacoes WHERE centro_consumidor_id = $1 LIMIT 1', [id]);
        
        if (dispensacoes) {
            return res.status(400).json({ error: 'Não é possível excluir: existem dispensações associadas a este centro consumidor.' });
        }

        const info = await run('DELETE FROM centros_consumidores WHERE id = $1', [id]);
        
        if (info.changes === 0) {
            return res.status(404).json({ error: 'Centro consumidor não encontrado.' });
        }

        res.json({ message: 'Centro consumidor excluído com sucesso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao excluir centro consumidor.' });
    }
});

module.exports = router;
