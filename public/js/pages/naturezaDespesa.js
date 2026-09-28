import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderNaturezaDespesa(container) {
    container.innerHTML = `
        <div class="animate-fadeIn">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2>Naturezas de Despesa</h2>
                <button class="btn btn-primary" id="btn-nova-natureza">+ Nova Natureza</button>
            </div>
            
            <div class="card">
                <div class="card-body">
                    <table class="table" id="table-naturezas">
                        <thead>
                            <tr>
                                <th>Nome / Descrição</th>
                                <th style="width: 150px;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="2" class="text-center">Carregando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="modal-natureza" class="modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: var(--bg-card); padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px;">
                <h3 id="modal-title" style="margin-bottom: 1.5rem;">Nova Natureza de Despesa</h3>
                <form id="form-natureza">
                    <input type="hidden" id="natureza-id">
                    <div class="form-group">
                        <label class="form-label" for="natureza-nome">Nome</label>
                        <input type="text" id="natureza-nome" class="form-control" required>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
                        <button type="button" class="btn btn-secondary" id="btn-cancel-natureza">Cancelar</button>
                        <button type="submit" class="btn btn-primary" id="btn-save-natureza">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const tableBody = document.querySelector('#table-naturezas tbody');
    const modal = document.getElementById('modal-natureza');
    const form = document.getElementById('form-natureza');
    const title = document.getElementById('modal-title');
    const idInput = document.getElementById('natureza-id');
    const nomeInput = document.getElementById('natureza-nome');

    const loadNaturezas = async () => {
        try {
            const data = await api.get('/naturezas-despesa');
            if (data && data.length > 0) {
                tableBody.innerHTML = data.map(n => `
                    <tr>
                        <td>${n.nome}</td>
                        <td>
                            <button class="btn btn-secondary btn-edit" data-id="${n._id || n.id}" data-nome="${n.nome}" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">Editar</button>
                            <button class="btn btn-danger btn-delete" data-id="${n._id || n.id}" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">Excluir</button>
                        </td>
                    </tr>
                `).join('');

                document.querySelectorAll('.btn-edit').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        title.textContent = 'Editar Natureza de Despesa';
                        idInput.value = e.target.getAttribute('data-id');
                        nomeInput.value = e.target.getAttribute('data-nome');
                        modal.style.display = 'flex';
                    });
                });

                document.querySelectorAll('.btn-delete').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        if (confirm('Tem certeza que deseja excluir?')) {
                            try {
                                const id = e.target.getAttribute('data-id');
                                await api.del('/naturezas-despesa/' + id);
                                showToast({ message: 'Excluído com sucesso', type: 'success' });
                                loadNaturezas();
                            } catch (error) {
                                showToast({ message: 'Erro ao excluir.', type: 'error' });
                            }
                        }
                    });
                });

            } else {
                tableBody.innerHTML = '<tr><td colspan="2" class="text-center">Nenhuma natureza de despesa encontrada.</td></tr>';
            }
        } catch (error) {
            tableBody.innerHTML = '<tr><td colspan="2" class="text-center">Erro ao carregar dados.</td></tr>';
        }
    };

    document.getElementById('btn-nova-natureza').addEventListener('click', () => {
        form.reset();
        idInput.value = '';
        title.textContent = 'Nova Natureza de Despesa';
        modal.style.display = 'flex';
    });

    document.getElementById('btn-cancel-natureza').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = idInput.value;
        const nome = nomeInput.value;
        
        const btn = document.getElementById('btn-save-natureza');
        btn.disabled = true;
        btn.textContent = 'Salvando...';

        try {
            if (id) {
                await api.put('/naturezas-despesa/' + id, { nome });
                showToast({ message: 'Atualizado com sucesso!', type: 'success' });
            } else {
                await api.post('/naturezas-despesa', { nome });
                showToast({ message: 'Criado com sucesso!', type: 'success' });
            }
            modal.style.display = 'none';
            loadNaturezas();
        } catch (error) {
            showToast({ message: 'Erro ao salvar.', type: 'error' });
        } finally {
            btn.disabled = false;
            btn.textContent = 'Salvar';
        }
    });

    loadNaturezas();
}
