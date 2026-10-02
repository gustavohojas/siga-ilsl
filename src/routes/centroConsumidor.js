const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/roles');

router.use(verifyToken, requireRole('admin', 'suprimento'));

// ==========================================
// ROTAS DE DIVISÕES
// ==========================================

// GET /divisoes - Listar todas as divisões com contagem de CCs vinculados e dispensações
router.get('/divisoes', async (req, res) => {
    try {
        const { all } = getDb();
        const divisoes = await all(`
            SELECT d.*, 
                   COUNT(DISTINCT cc.id) as total_ccs,
                   COUNT(DISTINCT disp.id) as total_dispensacoes
            FROM centros_consumidores d
            LEFT JOIN centros_consumidores cc ON cc.divisao_id = d.id
            LEFT JOIN dispensacoes disp ON disp.centro_consumidor_id = d.id
            WHERE d.is_divisao = TRUE
            GROUP BY d.id
            ORDER BY d.codigo ASC
        `);
        res.json(divisoes);
    } catch (error) {
        console.error('Erro ao listar divisões:', error);
        res.status(500).json({ error: 'Erro ao listar divisões.' });
    }
});

// POST /divisoes - Criar nova divisão (código DIV-XXX sequencial automático)
router.post('/divisoes', async (req, res) => {
    try {
        const { transaction } = getDb();
        const { nome } = req.body;

        if (!nome || !String(nome).trim()) {
            return res.status(400).json({ error: 'O nome da divisão é obrigatório.' });
        }

        const result = await transaction(async (tx) => {
            const allDivs = await tx.all("SELECT codigo FROM centros_consumidores WHERE is_divisao = TRUE AND codigo LIKE 'DIV-%'");
            let maxNum = 0;
            for (const d of allDivs) {
                if (d && d.codigo) {
                    const match = d.codigo.match(/\d+/);
                    if (match) {
                        const num = parseInt(match[0], 10);
                        if (num > maxNum) maxNum = num;
                    }
                }
            }
            const nextNum = maxNum + 1;
            const codigo = 'DIV-' + String(nextNum).padStart(3, '0');
            const info = await tx.run(
                'INSERT INTO centros_consumidores (codigo, nome, is_divisao, divisao_id) VALUES ($1, $2, TRUE, NULL)', 
                [codigo, String(nome).trim()]
            );

            return { id: info.lastInsertRowid, codigo, nome: String(nome).trim(), is_divisao: true };
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Erro ao criar divisão:', error);
        res.status(500).json({ error: 'Erro ao criar divisão.' });
    }
});

// PUT /divisoes/:id - Atualizar nome da divisão
router.put('/divisoes/:id', async (req, res) => {
    try {
        const { run } = getDb();
        const { id } = req.params;
        const { nome } = req.body;

        if (!nome || !String(nome).trim()) {
            return res.status(400).json({ error: 'O nome da divisão é obrigatório.' });
        }

        const info = await run(
            'UPDATE centros_consumidores SET nome = $1 WHERE id = $2 AND is_divisao = TRUE', 
            [String(nome).trim(), id]
        );

        if (info.changes === 0) {
            return res.status(404).json({ error: 'Divisão não encontrada.' });
        }

        res.json({ message: 'Divisão atualizada com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar divisão:', error);
        res.status(500).json({ error: 'Erro ao atualizar divisão.' });
    }
});

// DELETE /divisoes/:id - Excluir divisão (apenas se não houver CCs vinculados nem dispensações)
router.delete('/divisoes/:id', async (req, res) => {
    try {
        const { get, run } = getDb();
        const { id } = req.params;

        const ccsVinculados = await get(
            'SELECT id, nome FROM centros_consumidores WHERE divisao_id = $1 LIMIT 1', 
            [id]
        );
        if (ccsVinculados) {
            return res.status(400).json({ 
                error: 'Não é possível excluir: existem centros consumidores vinculados a esta divisão.' 
            });
        }

        const dispensacoes = await get(
            'SELECT id FROM dispensacoes WHERE centro_consumidor_id = $1 LIMIT 1', 
            [id]
        );
        if (dispensacoes) {
            return res.status(400).json({ 
                error: 'Não é possível excluir: existem dispensações associadas diretamente a esta divisão.' 
            });
        }

        const info = await run('DELETE FROM centros_consumidores WHERE id = $1 AND is_divisao = TRUE', [id]);
        if (info.changes === 0) {
            return res.status(404).json({ error: 'Divisão não encontrada.' });
        }

        res.json({ message: 'Divisão excluída com sucesso.' });
    } catch (error) {
        console.error('Erro ao excluir divisão:', error);
        res.status(500).json({ error: 'Erro ao excluir divisão.' });
    }
});

// ==========================================
// ROTAS DE CENTROS CONSUMIDORES
// ==========================================

// GET / - Listar centros consumidores (com suporte a ?tipo= e ?agrupado=true)
router.get('/', async (req, res) => {
    try {
        const { all } = getDb();
        const { tipo, agrupado } = req.query;

        // Se solicitado agrupado para o dropdown da dispensação:
        if (agrupado === 'true') {
            const divisoes = await all('SELECT id, codigo, nome FROM centros_consumidores WHERE is_divisao = TRUE ORDER BY codigo ASC');
            const ccs = await all('SELECT id, codigo, nome, divisao_id FROM centros_consumidores WHERE is_divisao = FALSE ORDER BY codigo ASC');

            const tree = divisoes.map(div => ({
                id: div.id,
                codigo: div.codigo,
                nome: div.nome,
                is_divisao: true,
                centros: ccs.filter(c => c.divisao_id === div.id)
            }));

            // Adiciona CCs sem divisão caso existam
            const semDivisao = ccs.filter(c => !c.divisao_id);
            if (semDivisao.length > 0) {
                tree.push({
                    id: 0,
                    codigo: 'OUTROS',
                    nome: 'Outros Setores',
                    is_divisao: true,
                    centros: semDivisao
                });
            }

            return res.json(tree);
        }

        if (tipo === 'divisoes') {
            const divisoes = await all('SELECT * FROM centros_consumidores WHERE is_divisao = TRUE ORDER BY codigo ASC');
            return res.json(divisoes);
        }

        let sql = `
            SELECT cc.*, 
                   d.nome as divisao_nome, 
                   d.codigo as divisao_codigo
            FROM centros_consumidores cc
            LEFT JOIN centros_consumidores d ON cc.divisao_id = d.id
        `;

        if (tipo === 'ccs') {
            sql += ' WHERE cc.is_divisao = FALSE';
        } else if (!tipo) {
            // Padrão: apenas CCs para manter compatibilidade com a tabela normal de centros
            sql += ' WHERE cc.is_divisao = FALSE';
        }

        sql += ' ORDER BY cc.codigo ASC';

        const centros = await all(sql);
        res.json(centros);
    } catch (error) {
        console.error('Erro ao buscar centros consumidores:', error);
        res.status(500).json({ error: 'Erro ao buscar centros consumidores.' });
    }
});

// POST / - Criar centro consumidor (código CC-XXX auto-gerado)
router.post('/', async (req, res) => {
    try {
        const { transaction } = getDb();
        const { nome, divisao_id } = req.body;
        
        if (!nome || !String(nome).trim()) {
            return res.status(400).json({ error: 'O nome é obrigatório.' });
        }

        const result = await transaction(async (tx) => {
            const allCentros = await tx.all("SELECT codigo FROM centros_consumidores WHERE is_divisao = FALSE AND codigo LIKE 'CC-%'");
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
            const divId = divisao_id ? parseInt(divisao_id, 10) : null;

            const info = await tx.run(
                'INSERT INTO centros_consumidores (codigo, nome, is_divisao, divisao_id) VALUES ($1, $2, FALSE, $3)', 
                [codigo, String(nome).trim(), divId]
            );
            
            return { id: info.lastInsertRowid, codigo, nome: String(nome).trim(), divisao_id: divId, is_divisao: false };
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Erro ao criar centro consumidor:', error);
        res.status(500).json({ error: 'Erro ao criar centro consumidor.' });
    }
});

// PUT /:id - Atualizar nome e divisão do centro consumidor
router.put('/:id', async (req, res) => {
    try {
        const { run } = getDb();
        const { id } = req.params;
        const { nome, divisao_id } = req.body;

        if (!nome || !String(nome).trim()) {
            return res.status(400).json({ error: 'O nome é obrigatório.' });
        }

        const divId = divisao_id ? parseInt(divisao_id, 10) : null;

        const info = await run(
            'UPDATE centros_consumidores SET nome = $1, divisao_id = $2 WHERE id = $3 AND is_divisao = FALSE', 
            [String(nome).trim(), divId, id]
        );
        
        if (info.changes === 0) {
            return res.status(404).json({ error: 'Centro consumidor não encontrado.' });
        }

        res.json({ message: 'Centro consumidor atualizado com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar centro consumidor:', error);
        res.status(500).json({ error: 'Erro ao atualizar centro consumidor.' });
    }
});

// DELETE /:id - Excluir centro consumidor (verificar se há dispensações)
router.delete('/:id', async (req, res) => {
    try {
        const { get, run } = getDb();
        const { id } = req.params;

        const dispensacoes = await get('SELECT id FROM dispensacoes WHERE centro_consumidor_id = $1 LIMIT 1', [id]);
        if (dispensacoes) {
            return res.status(400).json({ error: 'Não é possível excluir: existem dispensações associadas a este centro consumidor.' });
        }

        const info = await run('DELETE FROM centros_consumidores WHERE id = $1 AND is_divisao = FALSE', [id]);
        if (info.changes === 0) {
            return res.status(404).json({ error: 'Centro consumidor não encontrado.' });
        }

        res.json({ message: 'Centro consumidor excluído com sucesso.' });
    } catch (error) {
        console.error('Erro ao excluir centro consumidor:', error);
        res.status(500).json({ error: 'Erro ao excluir centro consumidor.' });
    }
});

module.exports = router;
