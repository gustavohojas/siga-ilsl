const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { verifyToken } = require('../middleware/auth');
const requireRole = require('../middleware/roles');

// Todas as rotas de usuários exigem autenticação e privilégios de 'admin'
router.use(verifyToken, requireRole('admin'));

// GET / - Listar todos os usuários
router.get('/', async (req, res) => {
    try {
        const { all } = getDb();
        const usuarios = await all('SELECT id, cpf, nome, tipo, criado_em FROM usuarios ORDER BY nome ASC');
        res.json(usuarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao listar usuários.' });
    }
});

// POST / - Criar um novo usuário
router.post('/', async (req, res) => {
    try {
        const { get, run } = getDb();
        const { cpf, nome, senha, tipo } = req.body;

        if (!cpf || !nome || !senha || !tipo) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios (cpf, nome, senha, tipo).' });
        }

        if (!['admin', 'suprimento'].includes(tipo)) {
            return res.status(400).json({ error: 'Tipo de usuário inválido.' });
        }

        const usuarioExistente = await get('SELECT id FROM usuarios WHERE cpf = $1', [cpf]);
        if (usuarioExistente) {
            return res.status(409).json({ error: 'Já existe um usuário cadastrado com este CPF.' });
        }

        const senhaHash = bcrypt.hashSync(senha, 10);

        const info = await run(
            'INSERT INTO usuarios (cpf, nome, senha_hash, tipo) VALUES ($1, $2, $3, $4)',
            [cpf, nome, senhaHash, tipo]
        );
        
        res.status(201).json({ id: info.lastInsertRowid, cpf, nome, tipo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar usuário.' });
    }
});

// PUT /:id - Atualizar usuário
router.put('/:id', async (req, res) => {
    try {
        const { get, run } = getDb();
        const { id } = req.params;
        const { cpf, nome, senha, tipo } = req.body;

        const usuarioAtual = await get('SELECT * FROM usuarios WHERE id = $1', [id]);
        if (!usuarioAtual) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        const cpfNovoExistente = await get('SELECT id FROM usuarios WHERE cpf = $1 AND id != $2', [cpf || usuarioAtual.cpf, id]);
        if (cpfNovoExistente) {
            return res.status(409).json({ error: 'Já existe outro usuário com este CPF.' });
        }

        let senhaHash = usuarioAtual.senha_hash;
        if (senha) {
            senhaHash = bcrypt.hashSync(senha, 10);
        }

        await run(`
            UPDATE usuarios 
            SET cpf = COALESCE($1, cpf), 
                nome = COALESCE($2, nome), 
                senha_hash = $3, 
                tipo = COALESCE($4, tipo)
            WHERE id = $5
        `, [cpf, nome, senhaHash, tipo, id]);

        res.json({ message: 'Usuário atualizado com sucesso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar usuário.' });
    }
});

// DELETE /:id - Excluir usuário (não pode excluir a si mesmo)
router.delete('/:id', async (req, res) => {
    try {
        const { run } = getDb();
        const idToDelete = parseInt(req.params.id, 10);

        if (idToDelete === req.user.id) {
            return res.status(403).json({ error: 'Não é possível excluir o próprio usuário autenticado.' });
        }

        const info = await run('DELETE FROM usuarios WHERE id = $1', [idToDelete]);
        
        if (info.changes === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.json({ message: 'Usuário excluído com sucesso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao excluir usuário.' });
    }
});

module.exports = router;
