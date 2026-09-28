import { api, setToken } from '../api.js';
import { showToast } from '../components/toast.js';

export function renderLogin(container) {
    container.innerHTML = `
        <div class="login-container">
            <div class="login-card animate-fadeIn">
                <div class="login-logo">SIGA-ILSL</div>
                <div class="login-subtitle">Sistema Integrado de Gestão de Almoxarifado</div>
                
                <form id="login-form">
                    <div class="form-group">
                        <label class="form-label" for="cpf">CPF</label>
                        <input type="text" id="cpf" class="form-control" placeholder="000.000.000-00" required maxlength="14">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="senha">Senha</label>
                        <input type="password" id="senha" class="form-control" placeholder="••••••••" required>
                    </div>
                    <button type="submit" class="btn btn-primary w-full mt-2" id="btn-login">Entrar no Sistema</button>
                </form>
            </div>
        </div>
    `;

    // Máscara de CPF
    const cpfInput = document.getElementById('cpf');
    cpfInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 11) val = val.slice(0, 11);
        
        let masked = val;
        if (val.length > 9) masked = val.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
        else if (val.length > 6) masked = val.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
        else if (val.length > 3) masked = val.replace(/(\d{3})(\d{1,3})/, '$1.$2');
        
        e.target.value = masked;
    });

    // Submit do formulário
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const cpfClean = cpfInput.value.replace(/\D/g, '');
        const senha = document.getElementById('senha').value;
        const btn = document.getElementById('btn-login');

        if (cpfClean.length < 11) {
            showToast({ message: 'CPF inválido.', type: 'warning' });
            return;
        }

        try {
            btn.innerHTML = '<span style="opacity:0.7">⏳</span> Aguarde...';
            btn.disabled = true;

            const res = await api.post('/auth/login', { cpf: cpfClean, senha });
            if (res && res.token) {
                setToken(res.token);
                // Redirecionar para o dashboard (sem dependência circular)
                window.location.hash = '#dashboard';
                window.location.reload();
            } else {
                throw new Error('Token inválido');
            }
        } catch (error) {
            showToast({ message: error.message || 'Erro ao fazer login. Verifique as credenciais.', type: 'error' });
            btn.innerHTML = 'Entrar no Sistema';
            btn.disabled = false;
        }
    });
}
