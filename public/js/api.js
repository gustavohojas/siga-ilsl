// ============================================================
// API Module - Comunicação com o backend
// ============================================================

const API_BASE = '/api';

// ---- Token Management ----
export function setToken(token) {
    localStorage.setItem('estoque_token', token);
}

export function getToken() {
    return localStorage.getItem('estoque_token');
}

export function removeToken() {
    localStorage.removeItem('estoque_token');
}

export function isAuthenticated() {
    const token = getToken();
    if (!token) return false;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Verificar se o token não expirou
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            removeToken();
            return false;
        }
        return true;
    } catch (e) {
        return false;
    }
}

export function getUser() {
    const token = getToken();
    if (!token) return null;
    try {
        const payload = token.split('.')[1];
        if (!payload) return null;
        return JSON.parse(atob(payload));
    } catch (e) {
        return null;
    }
}

// ---- Requisições HTTP ----
export async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        ...(options.headers || {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    // Adicionar Content-Type apenas para requests com body JSON
    if (options.body && typeof options.body === 'string') {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    // Se receber 401, fazer logout automático
    if (response.status === 401) {
        removeToken();
        window.location.hash = '#login';
        throw new Error('Sessão expirada. Faça login novamente.');
    }

    // Verificar se a resposta é um arquivo (Excel export)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('spreadsheetml') || contentType.includes('octet-stream')) {
        if (!response.ok) {
            throw new Error('Erro ao exportar arquivo');
        }
        const blob = await response.blob();
        const disposition = response.headers.get('content-disposition') || '';
        const match = disposition.match(/filename="?([^"]+)"?/);
        const filename = match ? match[1] : 'relatorio.xlsx';
        
        // Baixar o arquivo automaticamente
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { downloaded: true, filename };
    }

    // Resposta JSON padrão
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || data.message || 'Erro na requisição');
    }

    return data;
}

// ---- Atalhos de métodos HTTP ----
export const api = {
    get: (endpoint) => request(endpoint, { method: 'GET' }),
    post: (endpoint, data) => request(endpoint, { method: 'POST', body: JSON.stringify(data) }),
    put: (endpoint, data) => request(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
    del: (endpoint) => request(endpoint, { method: 'DELETE' })
};
