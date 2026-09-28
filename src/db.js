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
            perecivel BOOLEAN DEFAULT FALSE,
            quantidade NUMERIC NOT NULL,
            unidade TEXT,
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
            perecivel BOOLEAN DEFAULT FALSE,
            unidade TEXT NOT NULL,
            quantidade_atual NUMERIC NOT NULL,
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
            criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS dispensacoes (
            id SERIAL PRIMARY KEY,
            estoque_id INTEGER NOT NULL REFERENCES estoque(id),
            centro_consumidor_id INTEGER NOT NULL REFERENCES centros_consumidores(id),
            quantidade NUMERIC NOT NULL,
            usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
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
        ALTER TABLE itens_recebimento ADD COLUMN IF NOT EXISTS garantia BOOLEAN DEFAULT FALSE;
        ALTER TABLE itens_recebimento ADD COLUMN IF NOT EXISTS data_garantia DATE;
        ALTER TABLE estoque ADD COLUMN IF NOT EXISTS garantia BOOLEAN DEFAULT FALSE;
        ALTER TABLE estoque ADD COLUMN IF NOT EXISTS data_garantia DATE;
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
