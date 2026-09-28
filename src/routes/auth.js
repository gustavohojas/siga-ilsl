const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const { verifyToken, SECRET } = require('../middleware/auth');

// POST /login - Autenticação com CPF e senha
router.post('/login', async (req, res) => {
    try {
        const { get } = getDb();
        const { cpf, senha } = req.body;
        
        if (!cpf || !senha) {
            return res.status(400).json({ error: 'CPF e senha são obrigatórios.' });
        }

        const usuario = await get('SELECT * FROM usuarios WHERE cpf = $1', [cpf]);
        
        if (!usuario) {
            return res.status(401).json({ error: 'CPF ou senha inválidos.' });
        }

        const senhaValida = bcrypt.compareSync(senha, usuario.senha_hash);
        if (!senhaValida) {
            return res.status(401).json({ error: 'CPF ou senha inválidos.' });
        }

        const payload = {
            id: usuario.id,
            cpf: usuario.cpf,
            nome: usuario.nome,
            tipo: usuario.tipo
        };

        const token = jwt.sign(payload, SECRET, { expiresIn: '24h' });

        res.json({ token, usuario: payload });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// GET /me - Retorna os dados do usuário atual a partir do token
router.get('/me', verifyToken, (req, res) => {
    res.json({ usuario: req.user });
});

module.exports = router;
