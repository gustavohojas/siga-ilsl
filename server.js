const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./src/db');

async function startServer() {
    // Initialize database first
    await initDb();
    
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    // Rotas da API
    app.use('/api/auth', require('./src/routes/auth'));
    app.use('/api/usuarios', require('./src/routes/usuarios'));
    app.use('/api/naturezas-despesa', require('./src/routes/naturezasDespesa'));
    app.use('/api/empenhos', require('./src/routes/empenho'));
    app.use('/api/recebimentos', require('./src/routes/recebimento'));
    app.use('/api/centros-consumidores', require('./src/routes/centroConsumidor'));
    app.use('/api/dispensacoes', require('./src/routes/dispensacao'));
    app.use('/api/relatorios', require('./src/routes/relatorios'));
    app.use('/api/catalogo', require('./src/routes/catalogo'));

    // SPA fallback: servir index.html para rotas não-API
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        } else {
            res.status(404).json({ error: 'Endpoint não encontrado' });
        }
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
        console.log(`Acesse: http://localhost:${PORT}`);
    });
}

startServer().catch(err => {
    console.error('Erro ao iniciar o servidor:', err);
    process.exit(1);
});
