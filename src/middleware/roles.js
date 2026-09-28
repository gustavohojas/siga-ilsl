function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !req.user.tipo) {
            return res.status(401).json({ error: 'Usuário não autenticado.' });
        }

        if (!roles.includes(req.user.tipo)) {
            return res.status(403).json({ error: 'Acesso negado. Privilégios insuficientes.' });
        }

        next();
    };
}

module.exports = requireRole;
