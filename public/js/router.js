let routes = {};

const routeTitles = {
    '#dashboard': 'Dashboard',
    '#empenho': 'Notas de Empenho',
    '#recebimento': 'Recebimento',
    '#centros': 'Centros Consumidores',
    '#dispensacao': 'Dispensação',
    '#relatorios': 'Relatórios',
    '#natureza': 'Natureza de Despesa',
    '#usuarios': 'Usuários'
};

export function registerRoutes(routeMap) {
    routes = routeMap;
}

export function navigate(path) {
    window.location.hash = path;
}

window.addEventListener('hashchange', () => {
    const fullHash = window.location.hash || '#dashboard';
    const [path] = fullHash.split('?');
    const renderFn = routes[path];
    
    if (renderFn) {
        // Update active class on sidebar
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === path) {
                item.classList.add('active');
            }
        });
        renderFn(routeTitles[path] || 'Página');
    }
});
