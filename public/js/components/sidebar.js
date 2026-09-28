import { getUser } from '../api.js';

export function renderSidebar(container) {
    const user = getUser();
    const isAdmin = user && user.tipo === 'admin';

    container.innerHTML = `
        <div class="sidebar-logo">
            <a href="#dashboard" style="text-decoration: none; color: inherit; display: block;">
                <div class="brand-title">SIGA-ILSL</div>
                <div class="brand-subtitle">Sistema Integrado de Gestão de Almoxarifado</div>
            </a>
        </div>
        <nav class="nav-menu">
            <a href="#dashboard" class="nav-item active">📊 Dashboard</a>
            <a href="#empenho" class="nav-item">📋 Notas de Empenho</a>
            <a href="#recebimento" class="nav-item">📦 Recebimento</a>
            <a href="#centros" class="nav-item">🏢 Centros Consumidores</a>
            <a href="#dispensacao" class="nav-item">🔄 Dispensação</a>
            <a href="#relatorios" class="nav-item">📈 Relatórios</a>
            <a href="#natureza" class="nav-item">📑 Nat. de Despesa</a>
            ${isAdmin ? `<a href="#usuarios" class="nav-item">👥 Usuários</a>` : ''}
        </nav>
        <div class="sidebar-footer">
            <p>© 2026 SIGA-ILSL</p>
            <p>v1.0.0</p>
        </div>
    `;
}
