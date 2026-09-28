const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/roles');

router.use(verifyToken, requireRole('admin', 'suprimento'));

// GET / - Listar recebimentos
router.get('/', async (req, res) => {
    try {
        const { all } = getDb();
        const recebimentos = await all(`
            SELECT r.*, ne.numero as numero_empenho, d.nome_razao_social as doador_nome
            FROM recebimentos r
            LEFT JOIN notas_empenho ne ON r.nota_empenho_id = ne.id
            LEFT JOIN doadores d ON r.doador_id = d.id
            ORDER BY r.criado_em DESC
        `);
        res.json(recebimentos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao listar recebimentos.' });
    }
});

// POST /empenho - Recebimento via Nota de Empenho
router.post('/empenho', async (req, res) => {
    try {
        const { transaction } = getDb();
        const { nota_empenho_id, nota_fiscal, data_entrega, itens } = req.body;

        if (!nota_empenho_id || !itens || itens.length === 0) {
            return res.status(400).json({ error: 'Dados incompletos para recebimento de empenho.' });
        }

        const result = await transaction(async (tx) => {
            const infoRecebimento = await tx.run(
                'INSERT INTO recebimentos (tipo, nota_empenho_id, nota_fiscal, data_entrega) VALUES ($1, $2, $3, $4)', 
                ['empenho', nota_empenho_id, nota_fiscal || null, data_entrega || null]
            );
            const recebimento_id = infoRecebimento.lastInsertRowid;

            for (const item of itens) {
                // Busca dados do item_empenho
                const itemEmpenho = await tx.get(
                    'SELECT * FROM itens_empenho WHERE id = $1 AND nota_empenho_id = $2',
                    [item.item_empenho_id, nota_empenho_id]
                );
                if (!itemEmpenho) {
                    throw new Error(`Item de empenho ${item.item_empenho_id} não encontrado na nota de empenho.`);
                }

                // Perecível pode ser corrigido no recebimento pelo conferente
                const isPerecivel = item.perecivel !== undefined ? Boolean(item.perecivel) : Boolean(itemEmpenho.perecivel);
                const validadeFinal = isPerecivel ? (item.validade || null) : null;

                // Se foi corrigido para perecível no recebimento, atualiza a NE para os próximos lotes
                if (isPerecivel && !itemEmpenho.perecivel) {
                    await tx.run('UPDATE itens_empenho SET perecivel = TRUE WHERE id = $1', [item.item_empenho_id]);
                }

                // Garantia pode ser informada/corrigida no recebimento
                const isGarantia = item.garantia !== undefined ? Boolean(item.garantia) : Boolean(itemEmpenho.garantia);
                const garantiaFinal = isGarantia ? (item.data_garantia || itemEmpenho.data_garantia || null) : null;

                if (isGarantia && !itemEmpenho.garantia) {
                    await tx.run('UPDATE itens_empenho SET garantia = TRUE, data_garantia = $1 WHERE id = $2', [garantiaFinal, item.item_empenho_id]);
                }

                // Cria item_recebimento
                const infoIR = await tx.run(`
                    INSERT INTO itens_recebimento (recebimento_id, item_empenho_id, descricao, codigo_barras, perecivel, quantidade, unidade, validade, nota_fiscal, data_entrega, garantia, data_garantia)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [
                    recebimento_id,
                    item.item_empenho_id,
                    itemEmpenho.descricao,
                    item.codigo_barras || null,
                    isPerecivel,
                    item.quantidade,
                    itemEmpenho.unidade,
                    validadeFinal,
                    item.nota_fiscal || nota_fiscal || null,
                    item.data_entrega || data_entrega || null,
                    isGarantia,
                    garantiaFinal
                ]);
                const item_recebimento_id = infoIR.lastInsertRowid;

                // Atualiza quantidade recebida no empenho
                await tx.run(
                    'UPDATE itens_empenho SET quantidade_recebida = quantidade_recebida + $1 WHERE id = $2',
                    [item.quantidade, item.item_empenho_id]
                );

                // Verifica se já existe no estoque com mesma descrição/validade/código/garantia
                const estoqueExistente = await tx.get(`
                    SELECT id FROM estoque 
                    WHERE descricao = $1 
                    AND validade IS NOT DISTINCT FROM $2
                    AND codigo_barras IS NOT DISTINCT FROM $3
                    AND data_garantia IS NOT DISTINCT FROM $4
                `, [
                    itemEmpenho.descricao, 
                    validadeFinal,
                    item.codigo_barras || null,
                    garantiaFinal
                ]);

                if (estoqueExistente) {
                    await tx.run(
                        'UPDATE estoque SET quantidade_atual = quantidade_atual + $1 WHERE id = $2',
                        [item.quantidade, estoqueExistente.id]
                    );
                } else {
                    await tx.run(`
                        INSERT INTO estoque (item_recebimento_id, codigo_siafisico, codigo_compras, descricao, codigo_barras, perecivel, unidade, quantidade_atual, validade, natureza_despesa, garantia, data_garantia)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    `, [
                        item_recebimento_id,
                        itemEmpenho.codigo_siafisico,
                        itemEmpenho.codigo_compras,
                        itemEmpenho.descricao,
                        item.codigo_barras || null,
                        isPerecivel,
                        itemEmpenho.unidade,
                        item.quantidade,
                        validadeFinal,
                        itemEmpenho.natureza_despesa,
                        isGarantia,
                        garantiaFinal
                    ]);
                }
            }
            
            return { id: recebimento_id };
        });

        res.status(201).json({ message: 'Recebimento de empenho registrado com sucesso.', id: result.id });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message || 'Erro ao processar recebimento.' });
    }
});

// POST /doacao - Recebimento via Doação
router.post('/doacao', async (req, res) => {
    try {
        const { transaction } = getDb();
        const { doador, nota_fiscal, data_entrega, itens } = req.body;

        if (!doador || !itens || itens.length === 0) {
            return res.status(400).json({ error: 'Dados incompletos para recebimento de doação.' });
        }

        const result = await transaction(async (tx) => {
            let doador_id;
            const doadorExistente = await tx.get('SELECT id FROM doadores WHERE cpf_cnpj = $1', [doador.cpf_cnpj]);

            if (doadorExistente) {
                doador_id = doadorExistente.id;
                // Atualiza dados do doador
                await tx.run(
                    'UPDATE doadores SET nome_razao_social = $1, endereco = $2, telefone = $3 WHERE id = $4',
                    [doador.nome_razao_social, doador.endereco || null, doador.telefone || null, doador_id]
                );
            } else {
                const infoDoador = await tx.run(
                    'INSERT INTO doadores (cpf_cnpj, nome_razao_social, endereco, telefone) VALUES ($1, $2, $3, $4)', 
                    [doador.cpf_cnpj, doador.nome_razao_social, doador.endereco || null, doador.telefone || null]
                );
                doador_id = infoDoador.lastInsertRowid;
            }

            const infoRecebimento = await tx.run(
                'INSERT INTO recebimentos (tipo, doador_id, nota_fiscal, data_entrega) VALUES ($1, $2, $3, $4)', 
                ['doacao', doador_id, nota_fiscal || null, data_entrega || null]
            );
            const recebimento_id = infoRecebimento.lastInsertRowid;

            for (const item of itens) {
                const isPerecivel = Boolean(item.perecivel);
                const validadeFinal = isPerecivel ? (item.validade || null) : null;
                const isGarantia = Boolean(item.garantia);
                const garantiaFinal = isGarantia ? (item.data_garantia || null) : null;

                const infoIR = await tx.run(`
                    INSERT INTO itens_recebimento (recebimento_id, descricao, codigo_barras, perecivel, quantidade, unidade, validade, nota_fiscal, data_entrega, garantia, data_garantia)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [
                    recebimento_id,
                    item.descricao,
                    item.codigo_barras || null,
                    isPerecivel,
                    item.quantidade,
                    item.unidade,
                    validadeFinal,
                    nota_fiscal || null,
                    data_entrega || null,
                    isGarantia,
                    garantiaFinal
                ]);
                const item_recebimento_id = infoIR.lastInsertRowid;

                // Verifica estoque existente considerando validade, código e garantia
                const estoqueExistente = await tx.get(`
                    SELECT id FROM estoque 
                    WHERE descricao = $1 
                    AND validade IS NOT DISTINCT FROM $2
                    AND codigo_barras IS NOT DISTINCT FROM $3
                    AND data_garantia IS NOT DISTINCT FROM $4
                `, [
                    item.descricao, 
                    validadeFinal,
                    item.codigo_barras || null,
                    garantiaFinal
                ]);

                if (estoqueExistente) {
                    await tx.run(
                        'UPDATE estoque SET quantidade_atual = quantidade_atual + $1 WHERE id = $2',
                        [item.quantidade, estoqueExistente.id]
                    );
                } else {
                    await tx.run(`
                        INSERT INTO estoque (item_recebimento_id, descricao, codigo_barras, perecivel, unidade, quantidade_atual, validade, natureza_despesa, garantia, data_garantia)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    `, [
                        item_recebimento_id,
                        item.descricao,
                        item.codigo_barras || null,
                        isPerecivel,
                        item.unidade,
                        item.quantidade,
                        validadeFinal,
                        'DOACAO',
                        isGarantia,
                        garantiaFinal
                    ]);
                }
            }

            return { id: recebimento_id };
        });

        res.status(201).json({ message: 'Recebimento de doação registrado com sucesso.', id: result.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Erro ao processar doação.' });
    }
});

module.exports = router;
