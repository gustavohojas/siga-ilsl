import { getUser, removeToken } from '../api.js';

export function renderNavbar(container, title = 'Dashboard') {
    const user = getUser();
    const userName = user ? user.nome : 'Usuário';
    const userRole = user ? user.tipo : 'admin';
    const roleDisplay = userRole === 'admin' ? 'Administrador' : 'Suprimento';

    container.innerHTML = `
        <div class="navbar-title">
            <h2 class="text-primary">${title}</h2>
        </div>
        <div class="navbar-user flex flex-center gap-3">
            <div class="text-right">
                <div style="font-weight: 500;">${userName}</div>
                <div class="badge badge-role mt-1">${roleDisplay}</div>
            </div>
            <button id="btn-logout" class="btn btn-outline btn-sm">Sair</button>
        </div>
    `;

    document.getElementById('btn-logout').addEventListener('click', () => {
        removeToken();
        window.location.hash = '';
        window.location.reload();
    });
}
