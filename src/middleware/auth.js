const jwt = require('jsonwebtoken');

const SECRET = 'estoque-system-secret-key-2026';

function verifyToken(req, res, next) {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido ou inválido.' });
    }

    try {
        const decoded = jwt.verify(token, SECRET);
        req.user = decoded; // { id, cpf, nome, tipo }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
}

module.exports = { verifyToken, SECRET };
