const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/roles');

router.use(verifyToken, requireRole('admin', 'suprimento'));

// GET / - Listar empenhos com dados da empresa
router.get('/', async (req, res) => {
    try {
        const { all } = getDb();
        const empenhos = await all(`
            SELECT ne.*, e.cnpj, e.razao_social, e.endereco, e.telefone
            FROM notas_empenho ne
            JOIN empresas e ON ne.empresa_id = e.id
            ORDER BY ne.criado_em DESC
        `);
        res.json(empenhos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao listar empenhos.' });
    }
});

// GET /:id - Buscar empenho com empresa e itens
router.get('/:id', async (req, res) => {
    try {
        const { get, all } = getDb();
        const { id } = req.params;
        const empenho = await get(`
            SELECT ne.*, e.cnpj, e.razao_social, e.endereco, e.telefone
            FROM notas_empenho ne
            JOIN empresas e ON ne.empresa_id = e.id
            WHERE ne.id = $1
        `, [id]);

        if (!empenho) {
            return res.status(404).json({ error: 'Empenho não encontrado.' });
        }

        const itens = await all('SELECT * FROM itens_empenho WHERE nota_empenho_id = $1 ORDER BY id ASC', [id]);
        empenho.itens = itens;

        res.json(empenho);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar empenho.' });
    }
});

// POST / - Criar empenho com empresa e itens
router.post('/', async (req, res) => {
    try {
        const { transaction } = getDb();
        const { numero, tipo_licitacao, numero_licitacao, prazo, empresa, itens } = req.body;

        if (!numero || !tipo_licitacao || !numero_licitacao || !prazo || !empresa || !itens || itens.length === 0) {
            return res.status(400).json({ error: 'Dados incompletos para cadastro do empenho.' });
        }

        for (let idx = 0; idx < itens.length; idx++) {
            const item = itens[idx];
            if (!item.codigo_siafisico || !String(item.codigo_siafisico).trim()) {
                return res.status(400).json({ error: `Cód. Siafísico é obrigatório para o item #${idx + 1}.` });
            }
            if (!item.codigo_compras || !String(item.codigo_compras).trim()) {
                return res.status(400).json({ error: `Cód. Compras é obrigatório para o item #${idx + 1}.` });
            }
        }

        let normalizedTipo = String(tipo_licitacao || '').toLowerCase();
        if (normalizedTipo.includes('preg') || normalizedTipo === 'pregao') {
            normalizedTipo = 'pregao';
        } else {
            normalizedTipo = 'ata';
        }

        const cnpjClean = String(empresa.cnpj || '').replace(/\D/g, '');

        const result = await transaction(async (tx) => {
            // Verifica ou insere empresa
            let empresa_id;
            const empresaExistente = await tx.get('SELECT id FROM empresas WHERE cnpj = $1', [cnpjClean]);
            
            if (empresaExistente) {
                empresa_id = empresaExistente.id;
                // Atualiza dados da empresa existente
                await tx.run(
                    'UPDATE empresas SET razao_social = $1, endereco = $2, telefone = $3 WHERE id = $4',
                    [empresa.razao_social, empresa.endereco || null, empresa.telefone || null, empresa_id]
                );
            } else {
                const infoEmpresa = await tx.run(
                    'INSERT INTO empresas (cnpj, razao_social, endereco, telefone) VALUES ($1, $2, $3, $4)', 
                    [cnpjClean, empresa.razao_social, empresa.endereco || null, empresa.telefone || null]
                );
                empresa_id = infoEmpresa.lastInsertRowid;
            }

            // Insere Nota de Empenho
            const infoNE = await tx.run(
                'INSERT INTO notas_empenho (numero, tipo_licitacao, numero_licitacao, prazo, empresa_id) VALUES ($1, $2, $3, $4, $5)', 
                [numero, normalizedTipo, numero_licitacao, String(prazo), empresa_id]
            );
            const nota_empenho_id = infoNE.lastInsertRowid;

            // Insere Itens
            for (const item of itens) {
                const temGarantia = Boolean(item.garantia);
                const dataGarantia = temGarantia && item.data_garantia ? item.data_garantia : null;
                const vUnit = parseFloat(item.valor_unitario) || 0;
                await tx.run(`
                    INSERT INTO itens_empenho (nota_empenho_id, codigo_siafisico, codigo_compras, descricao, perecivel, natureza_despesa, quantidade, unidade, valor_unitario, garantia, data_garantia)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [
                    nota_empenho_id,
                    item.codigo_siafisico || null,
                    item.codigo_compras || null,
                    item.descricao,
                    Boolean(item.perecivel),
                    item.natureza_despesa || item.natureza_despesa_id || null,
                    parseFloat(item.quantidade) || 0,
                    item.unidade || 'Unidade',
                    vUnit,
                    temGarantia,
                    dataGarantia
                ]);

                // Auto-registro no catálogo de itens
                if (item.codigo_siafisico && item.codigo_compras && item.descricao) {
                    const siaf = String(item.codigo_siafisico).trim();
                    const comp = String(item.codigo_compras).trim();
                    const desc = String(item.descricao).trim();
                    const catExist = await tx.get(
                        'SELECT id, descricao FROM catalogo_itens WHERE UPPER(TRIM(codigo_siafisico)) = UPPER(TRIM($1))',
                        [siaf]
                    );
                    if (!catExist) {
                        await tx.run(
                            'INSERT INTO catalogo_itens (codigo_siafisico, codigo_compras, descricao) VALUES ($1, $2, $3)',
                            [siaf, comp, desc]
                        );
                    } else if (item.substituir_catalogo) {
                        await tx.run(
                            'UPDATE catalogo_itens SET codigo_compras = $1, descricao = $2, atualizado_em = NOW() WHERE id = $3',
                            [comp, desc, catExist.id]
                        );
                    }
                }
            }

            return { id: nota_empenho_id };
        });

        res.status(201).json({ message: 'Empenho criado com sucesso.', id: result.id });
    } catch (error) {
        console.error(error);
        if (error.message && (error.message.includes('unique') || error.message.includes('UNIQUE'))) {
             res.status(409).json({ error: 'Número de empenho já existe.' });
        } else {
             res.status(500).json({ error: error.message || 'Erro ao criar empenho.' });
        }
    }
});

// PUT /:id - Atualizar empenho
router.put('/:id', async (req, res) => {
    try {
        const { run } = getDb();
        const { id } = req.params;
        const { numero, tipo_licitacao, numero_licitacao, prazo } = req.body;

        const info = await run(`
            UPDATE notas_empenho 
            SET numero = COALESCE($1, numero),
                tipo_licitacao = COALESCE($2, tipo_licitacao),
                numero_licitacao = COALESCE($3, numero_licitacao),
                prazo = COALESCE($4, prazo)
            WHERE id = $5
        `, [numero, tipo_licitacao, numero_licitacao, prazo, id]);

        if (info.changes === 0) {
            return res.status(404).json({ error: 'Empenho não encontrado.' });
        }

        res.json({ message: 'Empenho atualizado com sucesso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar empenho.' });
    }
});

// DELETE /:id - Excluir empenho e seus itens
router.delete('/:id', async (req, res) => {
    try {
        const { run } = getDb();
        const { id } = req.params;

        const info = await run('DELETE FROM notas_empenho WHERE id = $1', [id]);
        
        if (info.changes === 0) {
            return res.status(404).json({ error: 'Empenho não encontrado.' });
        }

        res.json({ message: 'Empenho excluído com sucesso.' });
    } catch (error) {
        console.error(error);
        if (error.message && (error.message.includes('foreign key') || error.message.includes('violates foreign key'))) {
            res.status(400).json({ error: 'Não é possível excluir empenho pois já existem recebimentos vinculados a ele.' });
        } else {
            res.status(500).json({ error: 'Erro ao excluir empenho.' });
        }
    }
});

module.exports = router;
