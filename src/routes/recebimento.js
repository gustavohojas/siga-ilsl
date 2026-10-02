const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { gerarPdfGuiaDevolucao } = require('../utils/pdfGenerator');

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

// GET /historico - Listar itens recebidos com saldo atual e dados para estorno/auditoria
router.get('/historico', async (req, res) => {
    try {
        const { all } = getDb();
        const historico = await all(`
            SELECT 
                ir.id,
                ir.recebimento_id,
                ir.item_empenho_id,
                ir.descricao,
                ir.unidade,
                ir.lote,
                ir.validade,
                ir.quantidade as quantidade_recebida,
                r.criado_em,
                r.tipo as origem,
                r.nota_fiscal,
                r.data_entrega,
                ne.numero as numero_empenho,
                COALESCE(emp.razao_social, d.nome_razao_social) as fornecedor_nome,
                COALESCE((SELECT quantidade_atual FROM estoque WHERE item_recebimento_id = ir.id LIMIT 1), 0) as saldo_estoque_atual,
                COALESCE((SELECT SUM(quantidade) FROM estornos_recebimento WHERE item_recebimento_id = ir.id), 0) as total_estornado
            FROM itens_recebimento ir
            JOIN recebimentos r ON ir.recebimento_id = r.id
            LEFT JOIN notas_empenho ne ON r.nota_empenho_id = ne.id
            LEFT JOIN empresas emp ON ne.empresa_id = emp.id
            LEFT JOIN doadores d ON r.doador_id = d.id
            ORDER BY r.criado_em DESC, ir.id DESC
        `);
        res.json(historico);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar histórico de recebimentos.' });
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

                // Lote do material
                const loteFinal = item.lote && String(item.lote).trim() ? String(item.lote).trim() : null;

                // Cria item_recebimento
                const valorUnitario = parseFloat(itemEmpenho.valor_unitario) || 0;
                const infoIR = await tx.run(`
                    INSERT INTO itens_recebimento (recebimento_id, item_empenho_id, descricao, codigo_barras, lote, perecivel, quantidade, unidade, valor_unitario, validade, nota_fiscal, data_entrega, garantia, data_garantia)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                `, [
                    recebimento_id,
                    item.item_empenho_id,
                    itemEmpenho.descricao,
                    item.codigo_barras || null,
                    loteFinal,
                    isPerecivel,
                    item.quantidade,
                    itemEmpenho.unidade,
                    valorUnitario,
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

                // Verifica se já existe no estoque com mesma descrição/validade/código/garantia/lote
                const estoqueExistente = await tx.get(`
                    SELECT id FROM estoque 
                    WHERE descricao = $1 
                    AND validade IS NOT DISTINCT FROM $2
                    AND codigo_barras IS NOT DISTINCT FROM $3
                    AND data_garantia IS NOT DISTINCT FROM $4
                    AND lote IS NOT DISTINCT FROM $5
                `, [
                    itemEmpenho.descricao, 
                    validadeFinal,
                    item.codigo_barras || null,
                    garantiaFinal,
                    loteFinal
                ]);

                if (estoqueExistente) {
                    await tx.run(
                        'UPDATE estoque SET quantidade_atual = quantidade_atual + $1, valor_unitario = CASE WHEN valor_unitario = 0 OR valor_unitario IS NULL THEN $3 ELSE valor_unitario END WHERE id = $2',
                        [item.quantidade, estoqueExistente.id, valorUnitario]
                    );
                } else {
                    await tx.run(`
                        INSERT INTO estoque (item_recebimento_id, codigo_siafisico, codigo_compras, descricao, codigo_barras, lote, perecivel, unidade, quantidade_atual, valor_unitario, validade, natureza_despesa, garantia, data_garantia)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    `, [
                        item_recebimento_id,
                        itemEmpenho.codigo_siafisico,
                        itemEmpenho.codigo_compras,
                        itemEmpenho.descricao,
                        item.codigo_barras || null,
                        loteFinal,
                        isPerecivel,
                        itemEmpenho.unidade,
                        item.quantidade,
                        valorUnitario,
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

        if (!nota_fiscal || !String(nota_fiscal).trim()) {
            return res.status(400).json({ error: 'Nota Fiscal é obrigatória para o recebimento de doação.' });
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
                ['doacao', doador_id, String(nota_fiscal).trim(), data_entrega || null]
            );
            const recebimento_id = infoRecebimento.lastInsertRowid;

            for (let idx = 0; idx < itens.length; idx++) {
                const item = itens[idx];
                if (!item.codigo_siafisico || !String(item.codigo_siafisico).trim()) {
                    throw new Error(`Cód. Siafísico é obrigatório para o item #${idx + 1}.`);
                }
                if (!item.codigo_compras || !String(item.codigo_compras).trim()) {
                    throw new Error(`Cód. Compras é obrigatório para o item #${idx + 1}.`);
                }
            }

            for (const item of itens) {
                const isPerecivel = Boolean(item.perecivel);
                const validadeFinal = isPerecivel ? (item.validade || null) : null;
                const isGarantia = Boolean(item.garantia);
                const garantiaFinal = isGarantia ? (item.data_garantia || null) : null;
                const loteFinal = item.lote && String(item.lote).trim() ? String(item.lote).trim() : null;
                const valorUnitario = parseFloat(item.valor_unitario) || 0;
                const siaf = String(item.codigo_siafisico).trim();
                const comp = String(item.codigo_compras).trim();
                const desc = String(item.descricao).trim();

                const infoIR = await tx.run(`
                    INSERT INTO itens_recebimento (recebimento_id, descricao, codigo_barras, lote, perecivel, quantidade, unidade, valor_unitario, validade, nota_fiscal, data_entrega, garantia, data_garantia)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                `, [
                    recebimento_id,
                    desc,
                    item.codigo_barras || null,
                    loteFinal,
                    isPerecivel,
                    item.quantidade,
                    item.unidade,
                    valorUnitario,
                    validadeFinal,
                    String(nota_fiscal).trim(),
                    data_entrega || null,
                    isGarantia,
                    garantiaFinal
                ]);
                const item_recebimento_id = infoIR.lastInsertRowid;

                // Auto-registro no catálogo
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

                // Verifica estoque existente considerando validade, código, garantia e lote
                const estoqueExistente = await tx.get(`
                    SELECT id FROM estoque 
                    WHERE descricao = $1 
                    AND validade IS NOT DISTINCT FROM $2
                    AND codigo_barras IS NOT DISTINCT FROM $3
                    AND data_garantia IS NOT DISTINCT FROM $4
                    AND lote IS NOT DISTINCT FROM $5
                `, [
                    desc, 
                    validadeFinal,
                    item.codigo_barras || null,
                    garantiaFinal,
                    loteFinal
                ]);

                if (estoqueExistente) {
                    await tx.run(
                        'UPDATE estoque SET quantidade_atual = quantidade_atual + $1, valor_unitario = CASE WHEN valor_unitario = 0 OR valor_unitario IS NULL THEN $3 ELSE valor_unitario END WHERE id = $2',
                        [item.quantidade, estoqueExistente.id, valorUnitario]
                    );
                } else {
                    await tx.run(`
                        INSERT INTO estoque (item_recebimento_id, codigo_siafisico, codigo_compras, descricao, codigo_barras, lote, perecivel, unidade, quantidade_atual, valor_unitario, validade, natureza_despesa, garantia, data_garantia)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    `, [
                        item_recebimento_id,
                        siaf,
                        comp,
                        desc,
                        item.codigo_barras || null,
                        loteFinal,
                        isPerecivel,
                        item.unidade,
                        item.quantidade,
                        valorUnitario,
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

// GET /historico - Listar itens recebidos para conferência e estorno
router.get('/historico', async (req, res) => {
    try {
        const { all } = getDb();
        const itens = await all(`
            SELECT 
                ir.id as item_recebimento_id,
                ir.recebimento_id,
                r.tipo as tipo_recebimento,
                r.nota_fiscal,
                r.data_entrega,
                r.criado_em as data_recebimento,
                ir.descricao,
                ir.lote,
                ir.validade,
                ir.quantidade as quantidade_recebida,
                ir.unidade,
                ir.item_empenho_id,
                ne.numero as numero_empenho,
                COALESCE(emp.razao_social, d.nome_razao_social) as fornecedor_doador,
                emp.cnpj as fornecedor_cnpj,
                e.id as estoque_id,
                COALESCE(e.quantidade_atual, 0) as saldo_estoque_atual,
                COALESCE(estornos.total_estornado, 0) as total_estornado
            FROM itens_recebimento ir
            JOIN recebimentos r ON ir.recebimento_id = r.id
            LEFT JOIN notas_empenho ne ON r.nota_empenho_id = ne.id
            LEFT JOIN empresas emp ON ne.empresa_id = emp.id
            LEFT JOIN doadores d ON r.doador_id = d.id
            LEFT JOIN estoque e ON (
                e.item_recebimento_id = ir.id OR (
                    e.descricao = ir.descricao AND
                    e.lote IS NOT DISTINCT FROM ir.lote AND
                    e.validade IS NOT DISTINCT FROM ir.validade
                )
            )
            LEFT JOIN (
                SELECT item_recebimento_id, SUM(quantidade) as total_estornado
                FROM estornos_recebimento
                GROUP BY item_recebimento_id
            ) estornos ON estornos.item_recebimento_id = ir.id
            ORDER BY r.criado_em DESC, ir.id DESC
        `);
        res.json(itens);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao listar histórico de recebimentos.' });
    }
});

// POST /estorno - Realizar estorno de item recebido
router.post('/estorno', async (req, res) => {
    try {
        const { transaction } = getDb();
        const usuario_id = req.user.id;
        const usuario_nome = req.user.nome || 'Operador Almoxarifado';
        const { item_recebimento_id, quantidade, tipo_motivo, justificativa } = req.body;

        if (!item_recebimento_id || !quantidade || parseFloat(quantidade) <= 0) {
            return res.status(400).json({ error: 'Informe o item e uma quantidade válida para estorno.' });
        }

        if (!tipo_motivo || !['erro_digitacao', 'devolucao_fornecedor'].includes(tipo_motivo)) {
            return res.status(400).json({ error: 'Selecione um motivo válido: Erro de Digitação ou Devolução ao Fornecedor.' });
        }

        if (!justificativa || String(justificativa).trim().length < 5) {
            return res.status(400).json({ error: 'A justificativa por extenso é obrigatória (mínimo de 5 caracteres).' });
        }

        const qtdEstornar = parseFloat(quantidade);

        const result = await transaction(async (tx) => {
            // 1. Busca dados do item_recebimento
            const ir = await tx.get(`
                SELECT ir.*, r.tipo as tipo_recebimento, r.nota_empenho_id, r.nota_fiscal, r.data_entrega,
                       ne.numero as numero_empenho, emp.razao_social as fornecedor_nome, emp.cnpj as fornecedor_cnpj,
                       d.nome_razao_social as doador_nome
                FROM itens_recebimento ir
                JOIN recebimentos r ON ir.recebimento_id = r.id
                LEFT JOIN notas_empenho ne ON r.nota_empenho_id = ne.id
                LEFT JOIN empresas emp ON ne.empresa_id = emp.id
                LEFT JOIN doadores d ON r.doador_id = d.id
                WHERE ir.id = $1
            `, [item_recebimento_id]);

            if (!ir) {
                throw new Error('Item de recebimento não encontrado.');
            }

            // Total já estornado deste item
            const estornoAnterior = await tx.get(
                'SELECT COALESCE(SUM(quantidade), 0) as total FROM estornos_recebimento WHERE item_recebimento_id = $1',
                [item_recebimento_id]
            );
            const totalJaEstornado = parseFloat(estornoAnterior.total || 0);
            const qtdRestanteRecebida = parseFloat(ir.quantidade) - totalJaEstornado;

            if (qtdEstornar > qtdRestanteRecebida) {
                throw new Error(`Quantidade a estornar (${qtdEstornar}) excede a quantidade restante disponível deste recebimento (${qtdRestanteRecebida}).`);
            }

            // 2. Localiza o estoque correspondente
            const itemEstoque = await tx.get(`
                SELECT id, quantidade_atual, lote, validade, descricao, unidade
                FROM estoque
                WHERE item_recebimento_id = $1 OR (
                    descricao = $2 AND
                    lote IS NOT DISTINCT FROM $3 AND
                    validade IS NOT DISTINCT FROM $4
                )
                ORDER BY (item_recebimento_id = $1) DESC
                LIMIT 1
            `, [item_recebimento_id, ir.descricao, ir.lote || null, ir.validade || null]);

            if (!itemEstoque) {
                throw new Error('Registro correspondente no estoque não encontrado.');
            }

            const saldoEstoqueAtual = parseFloat(itemEstoque.quantidade_atual);
            if (qtdEstornar > saldoEstoqueAtual) {
                throw new Error(`Saldo insuficiente no estoque (Disponível: ${saldoEstoqueAtual}, Solicitado: ${qtdEstornar}). Parte dos itens pode já ter sido dispensada para os setores.`);
            }

            // 3. Deduz do estoque
            await tx.run('UPDATE estoque SET quantidade_atual = quantidade_atual - $1 WHERE id = $2', [qtdEstornar, itemEstoque.id]);

            // 4. Se for Nota de Empenho, deduz de quantidade_recebida para recompor o saldo pendente da NE
            if (ir.item_empenho_id) {
                await tx.run(
                    'UPDATE itens_empenho SET quantidade_recebida = GREATEST(0, quantidade_recebida - $1) WHERE id = $2',
                    [qtdEstornar, ir.item_empenho_id]
                );
            }

            // 5. Se for Devolução ao Fornecedor, gera o PDF da Guia de Devolução
            let pdfBuffer = null;
            let codigoDevolucao = null;
            if (tipo_motivo === 'devolucao_fornecedor') {
                const anoAtual = new Date().getFullYear();
                const prefixo = `DEV-${anoAtual}-`;
                const countRow = await tx.get(
                    "SELECT COUNT(*) as total FROM estornos_recebimento WHERE tipo_motivo = 'devolucao_fornecedor'"
                );
                const seq = (parseInt(countRow.total) || 0) + 1;
                codigoDevolucao = `${prefixo}${String(seq).padStart(4, '0')}`;

                let valFormatada = '-';
                if (ir.validade) {
                    try {
                        const [ano, mes, dia] = ir.validade.split('T')[0].split('-');
                        valFormatada = `${dia}/${mes}/${ano}`;
                    } catch (e) {
                        valFormatada = ir.validade;
                    }
                }

                pdfBuffer = await gerarPdfGuiaDevolucao({
                    codigo: codigoDevolucao,
                    dataHora: new Date().toLocaleString('pt-BR'),
                    fornecedor: ir.fornecedor_nome || ir.doador_nome || 'Fornecedor Externo',
                    cnpj: ir.fornecedor_cnpj || '-',
                    notaFiscal: ir.nota_fiscal || '-',
                    empenho: ir.numero_empenho || '-',
                    usuarioNome: usuario_nome,
                    justificativa: String(justificativa).trim(),
                    itemDescricao: ir.descricao,
                    lote: ir.lote || 'Sem lote',
                    validade: valFormatada,
                    quantidade: qtdEstornar,
                    unidade: ir.unidade || 'un'
                });
            }

            // 6. Insere o registro de estorno para auditoria
            const infoEstorno = await tx.run(`
                INSERT INTO estornos_recebimento (
                    item_recebimento_id, estoque_id, usuario_id, quantidade, tipo_motivo, justificativa, pdf_conteudo
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                item_recebimento_id,
                itemEstoque.id,
                usuario_id,
                qtdEstornar,
                tipo_motivo,
                String(justificativa).trim(),
                pdfBuffer
            ]);

            return {
                id: infoEstorno.lastInsertRowid,
                tipo_motivo,
                codigo_devolucao: codigoDevolucao,
                saldo_estoque_restante: saldoEstoqueAtual - qtdEstornar,
                tem_pdf: Boolean(pdfBuffer)
            };
        });

        const msg = result.tipo_motivo === 'erro_digitacao'
            ? 'Estorno por erro de digitação realizado com sucesso. Saldo de estoque e NE ajustados.'
            : 'Devolução ao fornecedor registrada com sucesso. Saldo de estoque e NE ajustados.';

        res.status(201).json({
            message: msg,
            mensagem: msg,
            estorno_id: result.id,
            guia_devolucao_id: result.tem_pdf ? result.id : null,
            saldo_estoque_restante: result.saldo_estoque_restante,
            tem_pdf: result.tem_pdf,
            pdf_url: result.tem_pdf ? `/api/recebimentos/estornos/${result.id}/pdf` : null
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message || 'Erro ao processar estorno.' });
    }
});

// GET /estornos/:id/pdf - Visualizar PDF da Guia de Devolução
router.get('/estornos/:id/pdf', async (req, res) => {
    try {
        const { get } = getDb();
        const { id } = req.params;

        const estorno = await get('SELECT id, pdf_conteudo FROM estornos_recebimento WHERE id = $1', [id]);
        if (!estorno || !estorno.pdf_conteudo) {
            return res.status(404).json({ error: 'Guia de devolução não encontrada para este estorno.' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="guia_devolucao_${estorno.id}.pdf"`);
        res.send(estorno.pdf_conteudo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao recuperar Guia de Devolução.' });
    }
});

module.exports = router;

