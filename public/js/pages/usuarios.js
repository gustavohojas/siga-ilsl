import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderUsuarios(container) {
    container.innerHTML = `
        <div class="animate-fadeIn">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2>Usuários</h2>
                <button class="btn btn-primary" id="btn-novo-usuario">+ Novo Usuário</button>
            </div>
            
            <div class="card">
                <div class="card-body">
                    <table class="table" id="table-usuarios">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>CPF</th>
                                <th>Tipo de Acesso</th>
                                <th style="width: 150px;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="4" class="text-center">Carregando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="modal-usuario" class="modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: var(--bg-card); padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px;">
                <h3 id="modal-title" style="margin-bottom: 1.5rem;">Novo Usuário</h3>
                <form id="form-usuario">
                    <input type="hidden" id="user-id">
                    
                    <div class="form-group">
                        <label class="form-label" for="user-nome">Nome Completo</label>
                        <input type="text" id="user-nome" class="form-control" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="user-cpf">CPF</label>
                        <input type="text" id="user-cpf" class="form-control" placeholder="000.000.000-00" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="user-tipo">Tipo de Acesso</label>
                        <select id="user-tipo" class="form-control" required>
                            <option value="admin">Administrador</option>
                            <option value="suprimento">Suprimento</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="user-senha">Senha <small id="senha-help"></small></label>
                        <input type="password" id="user-senha" class="form-control" required>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
                        <button type="button" class="btn btn-secondary" id="btn-cancel-usuario">Cancelar</button>
                        <button type="submit" class="btn btn-primary" id="btn-save-usuario">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const tableBody = document.querySelector('#table-usuarios tbody');
    const modal = document.getElementById('modal-usuario');
    const form = document.getElementById('form-usuario');
    const title = document.getElementById('modal-title');
    const idInput = document.getElementById('user-id');
    const nomeInput = document.getElementById('user-nome');
    const cpfInput = document.getElementById('user-cpf');
    const tipoInput = document.getElementById('user-tipo');
    const senhaInput = document.getElementById('user-senha');
    const senhaHelp = document.getElementById('senha-help');

    cpfInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 11) val = val.slice(0, 11);
        
        let masked = val;
        if (val.length > 9) masked = val.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        else if (val.length > 6) masked = val.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
        else if (val.length > 3) masked = val.replace(/(\d{3})(\d{1,3})/, '$1.$2');
        
        e.target.value = masked;
    });

    const formatCpf = (cpf) => {
        if (!cpf) return '';
        const val = cpf.replace(/\D/g, '');
        return val.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    };

    const loadUsuarios = async () => {
        try {
            const data = await api.get('/usuarios');
            if (data && data.length > 0) {
                tableBody.innerHTML = data.map(u => `
                    <tr>
                        <td>${u.nome}</td>
                        <td>${formatCpf(u.cpf)}</td>
                        <td>${u.tipo === 'admin' ? 'Administrador' : 'Suprimento'}</td>
                        <td>
                            <button class="btn btn-secondary btn-edit" 
                                data-id="${u._id || u.id}" 
                                data-nome="${u.nome}" 
                                data-cpf="${formatCpf(u.cpf)}" 
                                data-tipo="${u.tipo}" 
                                style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">Editar</button>
                            <button class="btn btn-danger btn-delete" 
                                data-id="${u._id || u.id}" 
                                style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">Excluir</button>
                        </td>
                    </tr>
                `).join('');

                document.querySelectorAll('.btn-edit').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        title.textContent = 'Editar Usuário';
                        idInput.value = e.target.getAttribute('data-id');
                        nomeInput.value = e.target.getAttribute('data-nome');
                        cpfInput.value = e.target.getAttribute('data-cpf');
                        cpfInput.disabled = true; // prevent changing CPF
                        tipoInput.value = e.target.getAttribute('data-tipo');
                        senhaInput.required = false;
                        senhaInput.value = '';
                        senhaHelp.textContent = '(Preencha apenas se for alterar)';
                        modal.style.display = 'flex';
                    });
                });

                document.querySelectorAll('.btn-delete').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        if (confirm('Tem certeza que deseja excluir este usuário?')) {
                            try {
                                const id = e.target.getAttribute('data-id');
                                await api.del('/usuarios/' + id);
                                showToast({ message: 'Usuário excluído', type: 'success' });
                                loadUsuarios();
                            } catch (error) {
                                showToast({ message: 'Erro ao excluir usuário.', type: 'error' });
                            }
                        }
                    });
                });

            } else {
                tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum usuário encontrado.</td></tr>';
            }
        } catch (error) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Erro ao carregar dados.</td></tr>';
        }
    };

    document.getElementById('btn-novo-usuario').addEventListener('click', () => {
        form.reset();
        idInput.value = '';
        cpfInput.disabled = false;
        senhaInput.required = true;
        senhaHelp.textContent = '';
        title.textContent = 'Novo Usuário';
        modal.style.display = 'flex';
    });

    document.getElementById('btn-cancel-usuario').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = idInput.value;
        const btn = document.getElementById('btn-save-usuario');
        
        btn.disabled = true;
        btn.textContent = 'Salvando...';

        try {
            const body = {
                nome: nomeInput.value,
                tipo: tipoInput.value
            };

            if (senhaInput.value) {
                body.senha = senhaInput.value;
            }

            if (id) {
                await api.put('/usuarios/' + id, body);
                showToast({ message: 'Usuário atualizado com sucesso!', type: 'success' });
            } else {
                body.cpf = cpfInput.value.replace(/\D/g, '');
                await api.post('/usuarios', body);
                showToast({ message: 'Usuário criado com sucesso!', type: 'success' });
            }
            modal.style.display = 'none';
            loadUsuarios();
        } catch (error) {
            showToast({ message: 'Erro ao salvar usuário.', type: 'error' });
        } finally {
            btn.disabled = false;
            btn.textContent = 'Salvar';
        }
    });

    loadUsuarios();
}
