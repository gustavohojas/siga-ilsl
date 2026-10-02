const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let pool = null;

// Converte placeholders estilo SQLite (?) para PostgreSQL ($1, $2, ...)
function formatSql(sql) {
    if (!sql || typeof sql !== 'string') return sql;
    let index = 1;
    // Substitui '?' que não estão entre aspas por $1, $2, etc.
    return sql.replace(/\?/g, () => `$${index++}`);
}

// Cria cliente/pool wrapper com os métodos all, get, run, exec
function createDbInterface(queryExecutor) {
    return {
        // Consulta que retorna múltiplas linhas (SELECT)
        async all(sql, params = []) {
            const formatted = formatSql(sql);
            const res = await queryExecutor.query(formatted, params);
            return res.rows;
        },

        // Consulta que retorna uma única linha
        async get(sql, params = []) {
            const formatted = formatSql(sql);
            const res = await queryExecutor.query(formatted, params);
            return res.rows.length > 0 ? res.rows[0] : undefined;
        },

        // Executa INSERT/UPDATE/DELETE e retorna { changes, lastInsertRowid }
        async run(sql, params = []) {
            let formatted = formatSql(sql);
            const isInsert = /^\s*INSERT\s+INTO/i.test(formatted);
            if (isInsert && !/\bRETURNING\b/i.test(formatted) && !/INSERT\s+INTO\s+configuracoes_sistema/i.test(formatted)) {
                formatted = formatted.trim().replace(/;+$/, '') + ' RETURNING id';
            }
            const res = await queryExecutor.query(formatted, params);
            const lastId = (res.rows && res.rows.length > 0 && res.rows[0].id !== undefined)
                ? res.rows[0].id
                : 0;
            return {
                changes: res.rowCount || 0,
                lastInsertRowid: lastId
            };
        },

        // Executa SQL bruto (para scripts, DDL de tabelas, etc.)
        async exec(sql) {
            return await queryExecutor.query(sql);
        }
    };
}

// Métodos padrão conectados ao pool principal
const defaultInterface = createDbInterface({
    query: (text, params) => pool.query(text, params)
});

// Executa uma função dentro de uma transação isolada
async function transaction(fn) {
    const client = await pool.connect();
    const tx = createDbInterface(client);
    try {
        await client.query('BEGIN');
        const result = await fn(tx);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (rbError) {
            // Ignora erro no rollback se conexão tiver sido perdida
        }
        throw error;
    } finally {
        client.release();
    }
}

async function initDb() {
    const connectionString = process.env.DATABASE_URL || 'postgresql://siga_user:SuaSenhaSegura123@db:5432/estoque';

    pool = new Pool({
        connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
    });

    pool.on('error', (err) => {
        console.error('Erro inesperado no pool do PostgreSQL:', err);
    });

    // Criação de todas as tabelas em PostgreSQL
    await pool.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            cpf TEXT UNIQUE NOT NULL,
            nome TEXT NOT NULL,
            senha_hash TEXT NOT NULL,
            tipo TEXT NOT NULL CHECK(tipo IN ('admin', 'suprimento')),
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS empresas (
            id SERIAL PRIMARY KEY,
            cnpj TEXT UNIQUE NOT NULL,
            razao_social TEXT NOT NULL,
            endereco TEXT,
            telefone TEXT
        );

        CREATE TABLE IF NOT EXISTS naturezas_despesa (
            id SERIAL PRIMARY KEY,
            nome TEXT UNIQUE NOT NULL,
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS notas_empenho (
            id SERIAL PRIMARY KEY,
            numero TEXT UNIQUE NOT NULL,
            tipo_licitacao TEXT NOT NULL CHECK(tipo_licitacao IN ('pregao', 'ata')),
            numero_licitacao TEXT NOT NULL,
            prazo TEXT NOT NULL,
            empresa_id INTEGER NOT NULL REFERENCES empresas(id),
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS itens_empenho (
            id SERIAL PRIMARY KEY,
            nota_empenho_id INTEGER NOT NULL REFERENCES notas_empenho(id) ON DELETE CASCADE,
            codigo_siafisico TEXT,
            codigo_compras TEXT,
            descricao TEXT NOT NULL,
            perecivel BOOLEAN DEFAULT FALSE,
            natureza_despesa TEXT,
            quantidade NUMERIC NOT NULL,
            unidade TEXT NOT NULL,
            valor_unitario NUMERIC DEFAULT 0,
            quantidade_recebida NUMERIC DEFAULT 0,
            garantia BOOLEAN DEFAULT FALSE,
            data_garantia DATE
        );

        CREATE TABLE IF NOT EXISTS doadores (
            id SERIAL PRIMARY KEY,
            cpf_cnpj TEXT UNIQUE NOT NULL,
            nome_razao_social TEXT NOT NULL,
            endereco TEXT,
            telefone TEXT
        );

        CREATE TABLE IF NOT EXISTS recebimentos (
            id SERIAL PRIMARY KEY,
            tipo TEXT NOT NULL CHECK(tipo IN ('empenho', 'doacao')),
            nota_empenho_id INTEGER REFERENCES notas_empenho(id),
            doador_id INTEGER REFERENCES doadores(id),
            nota_fiscal TEXT,
            data_entrega TEXT,
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS itens_recebimento (
            id SERIAL PRIMARY KEY,
            recebimento_id INTEGER NOT NULL REFERENCES recebimentos(id) ON DELETE CASCADE,
            item_empenho_id INTEGER REFERENCES itens_empenho(id),
            descricao TEXT,
            codigo_barras TEXT,
            lote TEXT,
            perecivel BOOLEAN DEFAULT FALSE,
            quantidade NUMERIC NOT NULL,
            unidade TEXT,
            valor_unitario NUMERIC DEFAULT 0,
            validade TEXT,
            nota_fiscal TEXT,
            data_entrega TEXT,
            garantia BOOLEAN DEFAULT FALSE,
            data_garantia DATE
        );

        CREATE TABLE IF NOT EXISTS estoque (
            id SERIAL PRIMARY KEY,
            item_recebimento_id INTEGER REFERENCES itens_recebimento(id),
            codigo_siafisico TEXT,
            codigo_compras TEXT,
            descricao TEXT NOT NULL,
            codigo_barras TEXT,
            lote TEXT,
            perecivel BOOLEAN DEFAULT FALSE,
            unidade TEXT NOT NULL,
            quantidade_atual NUMERIC NOT NULL,
            valor_unitario NUMERIC DEFAULT 0,
            validade TEXT,
            natureza_despesa TEXT,
            garantia BOOLEAN DEFAULT FALSE,
            data_garantia DATE,
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS centros_consumidores (
            id SERIAL PRIMARY KEY,
            codigo TEXT UNIQUE NOT NULL,
            nome TEXT NOT NULL,
            is_divisao BOOLEAN DEFAULT FALSE,
            divisao_id INTEGER REFERENCES centros_consumidores(id),
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS catalogo_itens (
            id SERIAL PRIMARY KEY,
            codigo_siafisico TEXT UNIQUE NOT NULL,
            codigo_compras TEXT NOT NULL,
            descricao TEXT NOT NULL,
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS guias_dispensacao (
            id SERIAL PRIMARY KEY,
            codigo TEXT UNIQUE NOT NULL,
            centro_consumidor_id INTEGER NOT NULL REFERENCES centros_consumidores(id),
            usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
            observacoes TEXT,
            pdf_conteudo BYTEA,
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS dispensacoes (
            id SERIAL PRIMARY KEY,
            guia_id INTEGER REFERENCES guias_dispensacao(id),
            estoque_id INTEGER NOT NULL REFERENCES estoque(id),
            centro_consumidor_id INTEGER NOT NULL REFERENCES centros_consumidores(id),
            quantidade NUMERIC NOT NULL,
            usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
            lote TEXT,
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS estornos_recebimento (
            id SERIAL PRIMARY KEY,
            item_recebimento_id INTEGER NOT NULL REFERENCES itens_recebimento(id),
            estoque_id INTEGER NOT NULL REFERENCES estoque(id),
            usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
            quantidade NUMERIC NOT NULL,
            tipo_motivo TEXT NOT NULL CHECK(tipo_motivo IN ('erro_digitacao', 'devolucao_fornecedor')),
            justificativa TEXT NOT NULL,
            pdf_conteudo BYTEA,
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS configuracoes_sistema (
            chave TEXT PRIMARY KEY,
            valor TEXT NOT NULL,
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    `);

    // Migrações seguras caso o banco já exista
    await pool.query(`
        ALTER TABLE itens_empenho ADD COLUMN IF NOT EXISTS garantia BOOLEAN DEFAULT FALSE;
        ALTER TABLE itens_empenho ADD COLUMN IF NOT EXISTS data_garantia DATE;
        ALTER TABLE itens_empenho ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC DEFAULT 0;
        ALTER TABLE itens_recebimento ADD COLUMN IF NOT EXISTS garantia BOOLEAN DEFAULT FALSE;
        ALTER TABLE itens_recebimento ADD COLUMN IF NOT EXISTS data_garantia DATE;
        ALTER TABLE itens_recebimento ADD COLUMN IF NOT EXISTS lote TEXT;
        ALTER TABLE itens_recebimento ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC DEFAULT 0;
        ALTER TABLE estoque ADD COLUMN IF NOT EXISTS garantia BOOLEAN DEFAULT FALSE;
        ALTER TABLE estoque ADD COLUMN IF NOT EXISTS data_garantia DATE;
        ALTER TABLE estoque ADD COLUMN IF NOT EXISTS lote TEXT;
        ALTER TABLE estoque ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC DEFAULT 0;
        ALTER TABLE centros_consumidores ADD COLUMN IF NOT EXISTS is_divisao BOOLEAN DEFAULT FALSE;
        ALTER TABLE centros_consumidores ADD COLUMN IF NOT EXISTS divisao_id INTEGER REFERENCES centros_consumidores(id);
        ALTER TABLE dispensacoes ADD COLUMN IF NOT EXISTS lote TEXT;
        CREATE TABLE IF NOT EXISTS guias_dispensacao (
            id SERIAL PRIMARY KEY,
            codigo TEXT UNIQUE NOT NULL,
            centro_consumidor_id INTEGER NOT NULL REFERENCES centros_consumidores(id),
            usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
            observacoes TEXT,
            pdf_conteudo BYTEA,
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        ALTER TABLE dispensacoes ADD COLUMN IF NOT EXISTS guia_id INTEGER REFERENCES guias_dispensacao(id);
        CREATE TABLE IF NOT EXISTS estornos_recebimento (
            id SERIAL PRIMARY KEY,
            item_recebimento_id INTEGER NOT NULL REFERENCES itens_recebimento(id),
            estoque_id INTEGER NOT NULL REFERENCES estoque(id),
            usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
            quantidade NUMERIC NOT NULL,
            tipo_motivo TEXT NOT NULL CHECK(tipo_motivo IN ('erro_digitacao', 'devolucao_fornecedor')),
            justificativa TEXT NOT NULL,
            pdf_conteudo BYTEA,
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS catalogo_itens (
            id SERIAL PRIMARY KEY,
            codigo_siafisico TEXT UNIQUE NOT NULL,
            codigo_compras TEXT NOT NULL,
            descricao TEXT NOT NULL,
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    `);

    // 1. Carga Inicial do Administrador (executada apenas uma vez; se o usuário excluir futuramente, não recria)
    const seedAdminDone = await defaultInterface.get('SELECT valor FROM configuracoes_sistema WHERE chave = $1', ['seed_admin_realizado']);
    if (!seedAdminDone) {
        const adminCheck = await defaultInterface.get('SELECT id FROM usuarios WHERE cpf = $1', ['40169736865']);
        if (!adminCheck) {
            const hash = bcrypt.hashSync('ILSL2026', 10);
            await defaultInterface.run(
                'INSERT INTO usuarios (cpf, nome, senha_hash, tipo) VALUES ($1, $2, $3, $4) ON CONFLICT (cpf) DO NOTHING',
                ['40169736865', 'Administrador', hash, 'admin']
            );
        }
        await defaultInterface.run(
            'INSERT INTO configuracoes_sistema (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO NOTHING',
            ['seed_admin_realizado', 'true']
        );
    }

    // 2. Carga Inicial dos 25 Centros Consumidores (executada apenas uma vez; se o usuário excluir futuramente, não recria)
    const seedCentrosDone = await defaultInterface.get('SELECT valor FROM configuracoes_sistema WHERE chave = $1', ['seed_centros_realizado']);
    if (!seedCentrosDone) {
        const centrosIniciais = [
            { codigo: 'CC-001', nome: 'Ambulatório' },
            { codigo: 'CC-002', nome: 'Análises Clínicas' },
            { codigo: 'CC-003', nome: 'Biblioteca' },
            { codigo: 'CC-004', nome: 'Conservação e Limpeza' },
            { codigo: 'CC-005', nome: 'Diretoria Técnica' },
            { codigo: 'CC-006', nome: 'Divisão de Dermatologia' },
            { codigo: 'CC-007', nome: 'Educação Continuada' },
            { codigo: 'CC-008', nome: 'Enfermagem' },
            { codigo: 'CC-009', nome: 'Farmácia' },
            { codigo: 'CC-010', nome: 'Finanças' },
            { codigo: 'CC-011', nome: 'Fisioterapia' },
            { codigo: 'CC-012', nome: 'Imunologia' },
            { codigo: 'CC-013', nome: 'Manutenção' },
            { codigo: 'CC-014', nome: 'Material e Patrimônio' },
            { codigo: 'CC-015', nome: 'Micologia' },
            { codigo: 'CC-016', nome: 'Nutrição' },
            { codigo: 'CC-017', nome: 'Patologia' },
            { codigo: 'CC-018', nome: 'Radiologia' },
            { codigo: 'CC-019', nome: 'Reabilitação' },
            { codigo: 'CC-020', nome: 'SAME' },
            { codigo: 'CC-021', nome: 'Seção de Pessoal' },
            { codigo: 'CC-022', nome: 'Sub Frota' },
            { codigo: 'CC-023', nome: 'Suprimento' },
            { codigo: 'CC-024', nome: 'Treinamento e Ensino' },
            { codigo: 'CC-025', nome: 'Unidade de Internação' }
        ];

        for (const cc of centrosIniciais) {
            await defaultInterface.run(
                'INSERT INTO centros_consumidores (codigo, nome) VALUES ($1, $2) ON CONFLICT (codigo) DO NOTHING',
                [cc.codigo, cc.nome]
            );
        }

        await defaultInterface.run(
            'INSERT INTO configuracoes_sistema (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO NOTHING',
            ['seed_centros_realizado', 'true']
        );
    }

    // 3. Reestruturação e Carga das 7 Divisões e 21 Centros Consumidores
    const seedDivisoesDone = await defaultInterface.get('SELECT valor FROM configuracoes_sistema WHERE chave = $1', ['reestruturacao_divisoes_v1']);
    if (!seedDivisoesDone) {
        // As 7 Divisões oficiais
        const divisoes = [
            { codigo: 'DIV-001', nome: 'Administração' },
            { codigo: 'DIV-002', nome: 'Dermatologia' },
            { codigo: 'DIV-003', nome: 'Diretoria Técnica' },
            { codigo: 'DIV-004', nome: 'Enfermagem' },
            { codigo: 'DIV-005', nome: 'Pesquisa e Ensino' },
            { codigo: 'DIV-006', nome: 'Reabilitação' },
            { codigo: 'DIV-007', nome: 'Serviços Técnicos Auxiliares' }
        ];

        for (const div of divisoes) {
            const existing = await defaultInterface.get('SELECT id FROM centros_consumidores WHERE codigo = $1', [div.codigo]);
            if (!existing) {
                await defaultInterface.run(
                    'INSERT INTO centros_consumidores (codigo, nome, is_divisao, divisao_id) VALUES ($1, $2, TRUE, NULL)',
                    [div.codigo, div.nome]
                );
            } else {
                await defaultInterface.run(
                    'UPDATE centros_consumidores SET nome = $1, is_divisao = TRUE, divisao_id = NULL WHERE codigo = $2',
                    [div.nome, div.codigo]
                );
            }
        }

        // Mapear nome da divisão -> id
        const divRows = await defaultInterface.all('SELECT id, nome FROM centros_consumidores WHERE is_divisao = TRUE');
        const divMap = {};
        for (const d of divRows) {
            divMap[d.nome] = d.id;
        }

        // Remover os antigos CCs promovidos a divisão que não possuem dispensações nem guias
        await defaultInterface.run(`
            DELETE FROM centros_consumidores 
            WHERE is_divisao = FALSE 
              AND nome IN ('Diretoria Técnica', 'Divisão de Dermatologia', 'Enfermagem', 'Reabilitação')
              AND id NOT IN (SELECT DISTINCT centro_consumidor_id FROM dispensacoes)
              AND id NOT IN (SELECT DISTINCT centro_consumidor_id FROM guias_dispensacao)
        `);

        // Os 21 Centros Consumidores oficiais e seus vínculos
        const ccs = [
            { codigo: 'CC-001', nome: 'Ambulatório', divisao: 'Enfermagem' },
            { codigo: 'CC-002', nome: 'Análises Clínicas', divisao: 'Dermatologia' },
            { codigo: 'CC-003', nome: 'Biblioteca', divisao: 'Pesquisa e Ensino' },
            { codigo: 'CC-004', nome: 'Conservação e Limpeza', divisao: 'Administração' },
            { codigo: 'CC-005', nome: 'Educação Continuada', divisao: 'Enfermagem' },
            { codigo: 'CC-006', nome: 'Farmácia', divisao: 'Serviços Técnicos Auxiliares' },
            { codigo: 'CC-007', nome: 'Finanças', divisao: 'Administração' },
            { codigo: 'CC-008', nome: 'Fisioterapia', divisao: 'Reabilitação' },
            { codigo: 'CC-009', nome: 'Imunologia', divisao: 'Pesquisa e Ensino' },
            { codigo: 'CC-010', nome: 'Manutenção', divisao: 'Administração' },
            { codigo: 'CC-011', nome: 'Material e Patrimônio', divisao: 'Administração' },
            { codigo: 'CC-012', nome: 'Micologia', divisao: 'Pesquisa e Ensino' },
            { codigo: 'CC-013', nome: 'Nutrição', divisao: 'Serviços Técnicos Auxiliares' },
            { codigo: 'CC-014', nome: 'Patologia', divisao: 'Pesquisa e Ensino' },
            { codigo: 'CC-015', nome: 'Radiologia', divisao: 'Dermatologia' },
            { codigo: 'CC-016', nome: 'SAME', divisao: 'Serviços Técnicos Auxiliares' },
            { codigo: 'CC-017', nome: 'Seção de Pessoal', divisao: 'Administração' },
            { codigo: 'CC-018', nome: 'Sub Frota', divisao: 'Administração' },
            { codigo: 'CC-019', nome: 'Suprimento', divisao: 'Administração' },
            { codigo: 'CC-020', nome: 'Treinamento e Ensino', divisao: 'Pesquisa e Ensino' },
            { codigo: 'CC-021', nome: 'Unidade de Internação', divisao: 'Enfermagem' }
        ];

        // Adicionar prefixo temporário nos códigos antigos de CC para evitar violação de UNIQUE ao reatribuir CC-001..CC-021
        await defaultInterface.run("UPDATE centros_consumidores SET codigo = 'TMP_' || codigo WHERE is_divisao = FALSE AND codigo NOT LIKE 'TMP_%'");

        for (const cc of ccs) {
            const divId = divMap[cc.divisao] || null;
            const existingByName = await defaultInterface.get(
                'SELECT id FROM centros_consumidores WHERE is_divisao = FALSE AND nome = $1',
                [cc.nome]
            );

            if (existingByName) {
                await defaultInterface.run(
                    'UPDATE centros_consumidores SET codigo = $1, is_divisao = FALSE, divisao_id = $2 WHERE id = $3',
                    [cc.codigo, divId, existingByName.id]
                );
            } else {
                await defaultInterface.run(
                    'INSERT INTO centros_consumidores (codigo, nome, is_divisao, divisao_id) VALUES ($1, $2, FALSE, $3)',
                    [cc.codigo, cc.nome, divId]
                );
            }
        }

        // Remover CCs temporários que não tenham dispensações
        await defaultInterface.run(`
            DELETE FROM centros_consumidores 
            WHERE codigo LIKE 'TMP_%' 
              AND id NOT IN (SELECT DISTINCT centro_consumidor_id FROM dispensacoes)
              AND id NOT IN (SELECT DISTINCT centro_consumidor_id FROM guias_dispensacao)
        `);

        await defaultInterface.run(
            'INSERT INTO configuracoes_sistema (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO NOTHING',
            ['reestruturacao_divisoes_v1', 'true']
        );
    }

    return {
        pool,
        ...defaultInterface,
        transaction
    };
}

module.exports = {
    initDb,
    getDb: () => ({
        pool,
        ...defaultInterface,
        transaction
    })
};
