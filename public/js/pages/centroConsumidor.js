import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderCentroConsumidor(container) {
    container.innerHTML = `
        <div class="animate-fadeIn">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2>Centros Consumidores</h2>
                <button class="btn btn-primary" id="btn-novo-centro">+ Novo Centro</button>
            </div>
            
            <div class="card">
                <div class="card-body">
                    <table class="table" id="table-centros">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Nome</th>
                                <th style="width: 150px;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="3" class="text-center">Carregando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="modal-centro" class="modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: var(--bg-card); padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px;">
                <h3 id="modal-title" style="margin-bottom: 1.5rem;">Novo Centro Consumidor</h3>
                <form id="form-centro">
                    <input type="hidden" id="centro-id">
                    <div class="form-group">
                        <label class="form-label" for="centro-nome">Nome do Setor / Unidade</label>
                        <input type="text" id="centro-nome" class="form-control" required>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
                        <button type="button" class="btn btn-secondary" id="btn-cancel-centro">Cancelar</button>
                        <button type="submit" class="btn btn-primary" id="btn-save-centro">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const tableBody = document.querySelector('#table-centros tbody');
    const modal = document.getElementById('modal-centro');
    const form = document.getElementById('form-centro');
    const title = document.getElementById('modal-title');
    const idInput = document.getElementById('centro-id');
    const nomeInput = document.getElementById('centro-nome');

    const loadCentros = async () => {
        try {
            const data = await api.get('/centros-consumidores');
            if (data && data.length > 0) {
                tableBody.innerHTML = data.map(cc => `
                    <tr>
                        <td>${cc.codigo}</td>
                        <td>${cc.nome}</td>
                        <td>
                            <button class="btn btn-secondary btn-edit" data-id="${cc._id || cc.id}" data-nome="${cc.nome}" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">Editar</button>
                            <button class="btn btn-danger btn-delete" data-id="${cc._id || cc.id}" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">Excluir</button>
                        </td>
                    </tr>
                `).join('');

                document.querySelectorAll('.btn-edit').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = e.target.getAttribute('data-id');
                        const nome = e.target.getAttribute('data-nome');
                        title.textContent = 'Editar Centro Consumidor';
                        idInput.value = id;
                        nomeInput.value = nome;
                        modal.style.display = 'flex';
                    });
                });

                document.querySelectorAll('.btn-delete').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        if (confirm('Tem certeza que deseja excluir?')) {
                            try {
                                const id = e.target.getAttribute('data-id');
                                await api.del('/centros-consumidores/' + id);
                                showToast({ message: 'Excluído com sucesso', type: 'success' });
                                loadCentros();
                            } catch (error) {
                                showToast({ message: 'Erro ao excluir.', type: 'error' });
                            }
                        }
                    });
                });

            } else {
                tableBody.innerHTML = '<tr><td colspan="3" class="text-center">Nenhum centro consumidor encontrado.</td></tr>';
            }
        } catch (error) {
            tableBody.innerHTML = '<tr><td colspan="3" class="text-center">Erro ao carregar dados.</td></tr>';
        }
    };

    document.getElementById('btn-novo-centro').addEventListener('click', () => {
        form.reset();
        idInput.value = '';
        title.textContent = 'Novo Centro Consumidor';
        modal.style.display = 'flex';
    });

    document.getElementById('btn-cancel-centro').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = idInput.value;
        const nome = nomeInput.value;
        
        const btn = document.getElementById('btn-save-centro');
        btn.disabled = true;
        btn.textContent = 'Salvando...';

        try {
            if (id) {
                await api.put('/centros-consumidores/' + id, { nome });
                showToast({ message: 'Atualizado com sucesso!', type: 'success' });
            } else {
                await api.post('/centros-consumidores', { nome });
                showToast({ message: 'Criado com sucesso!', type: 'success' });
            }
            modal.style.display = 'none';
            loadCentros();
        } catch (error) {
            showToast({ message: 'Erro ao salvar.', type: 'error' });
        } finally {
            btn.disabled = false;
            btn.textContent = 'Salvar';
        }
    });

    loadCentros();
}
