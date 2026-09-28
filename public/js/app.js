import { navigate, registerRoutes } from './router.js';
import { isAuthenticated, getUser } from './api.js';
import { renderSidebar } from './components/sidebar.js';
import { renderNavbar } from './components/navbar.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderEmpenho } from './pages/empenho.js';
import { renderRecebimento } from './pages/recebimento.js';
import { renderCentroConsumidor } from './pages/centroConsumidor.js';
import { renderDispensacao } from './pages/dispensacao.js';
import { renderRelatorios } from './pages/relatorios.js';
import { renderUsuarios } from './pages/usuarios.js';
import { renderNaturezaDespesa } from './pages/naturezaDespesa.js';

const appContainer = document.getElementById('app');

export function renderApp() {
    if (!isAuthenticated()) {
        renderLogin(appContainer);
        return;
    }

    appContainer.innerHTML = `
        <div class="app-layout">
            <aside class="sidebar" id="sidebar-container"></aside>
            <header class="navbar" id="navbar-container"></header>
            <main class="main-content" id="main-content">
                <!-- Page content will be injected here -->
            </main>
        </div>
    `;

    renderSidebar(document.getElementById('sidebar-container'));
    
    // Register application routes
    registerRoutes({
        '#dashboard': (title) => { renderNavbar(document.getElementById('navbar-container'), title); renderDashboard(document.getElementById('main-content')); },
        '#empenho': (title) => { renderNavbar(document.getElementById('navbar-container'), title); renderEmpenho(document.getElementById('main-content')); },
        '#recebimento': (title) => { renderNavbar(document.getElementById('navbar-container'), title); renderRecebimento(document.getElementById('main-content')); },
        '#centros': (title) => { renderNavbar(document.getElementById('navbar-container'), title); renderCentroConsumidor(document.getElementById('main-content')); },
        '#dispensacao': (title) => { renderNavbar(document.getElementById('navbar-container'), title); renderDispensacao(document.getElementById('main-content')); },
        '#relatorios': (title) => { renderNavbar(document.getElementById('navbar-container'), title); renderRelatorios(document.getElementById('main-content')); },
        '#natureza': (title) => { renderNavbar(document.getElementById('navbar-container'), title); renderNaturezaDespesa(document.getElementById('main-content')); },
        '#usuarios': (title) => { renderNavbar(document.getElementById('navbar-container'), title); renderUsuarios(document.getElementById('main-content')); },
    });

    // Default route
    if (!window.location.hash || window.location.hash === '#login') {
        navigate('#dashboard');
    } else {
        // Trigger initial route
        window.dispatchEvent(new Event('hashchange'));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderApp();
});
