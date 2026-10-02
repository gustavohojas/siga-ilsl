import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderCentroConsumidor(container) {
    container.innerHTML = `
        <div class="animate-fadeIn">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                <h2>Estrutura Organizacional</h2>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-primary" id="btn-novo-cc">+ Novo Centro Consumidor</button>
                    <button class="btn btn-outline" id="btn-nova-divisao">+ Nova Divisão</button>
                </div>
            </div>

            <!-- TABS DE NAVEGAÇÃO -->
            <div class="card mb-4">
                <div class="card-header" style="display: flex; gap: 1rem; border-bottom: 1px solid var(--border-glass);">
                    <button class="btn btn-primary tab-org-btn" id="tab-btn-ccs" data-target="view-ccs">
                        🏢 Centros Consumidores
                    </button>
                    <button class="btn btn-outline tab-org-btn" id="tab-btn-divisoes" data-target="view-divisoes">
                        🏛️ Divisões Organizacionais
                    </button>
                </div>

                <!-- VIEW CENTROS CONSUMIDORES -->
                <div class="card-body" id="view-ccs">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap;">
                        <input type="text" id="filter-ccs" class="form-control" placeholder="Buscar por código, centro ou divisão..." style="max-width: 320px;">
                        <span id="total-ccs-badge" class="badge badge-info" style="font-size: 0.85rem;">0 centros</span>
                    </div>
                    <div style="overflow-x: auto;">
                        <table class="table" id="table-centros">
                            <thead>
                                <tr>
                                    <th style="width: 110px;">Código</th>
                                    <th>Nome do Centro Consumidor</th>
                                    <th>Divisão Vinculada</th>
                                    <th style="width: 160px; text-align: center;">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="4" class="text-center">Carregando centros...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- VIEW DIVISÕES -->
                <div class="card-body" id="view-divisoes" style="display: none;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap;">
                        <input type="text" id="filter-divisoes" class="form-control" placeholder="Buscar divisão..." style="max-width: 320px;">
                        <span id="total-divisoes-badge" class="badge badge-primary" style="font-size: 0.85rem;">0 divisões</span>
                    </div>
                    <div style="overflow-x: auto;">
                        <table class="table" id="table-divisoes">
                            <thead>
                                <tr>
                                    <th style="width: 110px;">Código</th>
                                    <th>Nome da Divisão</th>
                                    <th style="text-align: center;">CCs Vinculados</th>
                                    <th style="width: 160px; text-align: center;">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="4" class="text-center">Carregando divisões...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL CENTRO CONSUMIDOR -->
        <div id="modal-cc" class="modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: var(--bg-card); padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <h3 id="modal-cc-title" style="margin-bottom: 1.5rem;">Novo Centro Consumidor</h3>
                <form id="form-cc">
                    <input type="hidden" id="cc-id">
                    <div class="form-group">
                        <label class="form-label" for="cc-nome">Nome do Setor / Centro Consumidor *</label>
                        <input type="text" id="cc-nome" class="form-control" required placeholder="Ex: Farmácia">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="cc-divisao">Divisão Vinculada *</label>
                        <select id="cc-divisao" class="form-control" required>
                            <option value="">Carregando divisões...</option>
                        </select>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
                        <button type="button" class="btn btn-secondary" id="btn-cancel-cc">Cancelar</button>
                        <button type="submit" class="btn btn-primary" id="btn-save-cc">Salvar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL DIVISÃO -->
        <div id="modal-divisao" class="modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: var(--bg-card); padding: 2rem; border-radius: 8px; width: 90%; max-width: 480px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <h3 id="modal-div-title" style="margin-bottom: 1.5rem;">Nova Divisão</h3>
                <form id="form-divisao">
                    <input type="hidden" id="div-id">
                    <div class="form-group">
                        <label class="form-label" for="div-nome">Nome da Divisão *</label>
                        <input type="text" id="div-nome" class="form-control" required placeholder="Ex: Serviços Técnicos Auxiliares">
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
                        <button type="button" class="btn btn-secondary" id="btn-cancel-div">Cancelar</button>
                        <button type="submit" class="btn btn-primary" id="btn-save-div">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Elementos das Abas
    const tabBtnCcs = document.getElementById('tab-btn-ccs');
    const tabBtnDivisoes = document.getElementById('tab-btn-divisoes');
    const viewCcs = document.getElementById('view-ccs');
    const viewDivisoes = document.getElementById('view-divisoes');

    const switchTab = (tab) => {
        if (tab === 'ccs') {
            tabBtnCcs.className = 'btn btn-primary tab-org-btn';
            tabBtnDivisoes.className = 'btn btn-outline tab-org-btn';
            viewCcs.style.display = 'block';
            viewDivisoes.style.display = 'none';
        } else {
            tabBtnDivisoes.className = 'btn btn-primary tab-org-btn';
            tabBtnCcs.className = 'btn btn-outline tab-org-btn';
            viewDivisoes.style.display = 'block';
            viewCcs.style.display = 'none';
            loadDivisoes();
        }
    };

    tabBtnCcs.addEventListener('click', () => switchTab('ccs'));
    tabBtnDivisoes.addEventListener('click', () => switchTab('divisoes'));

    // Dados em memória
    let ccsData = [];
    let divisoesData = [];

    const tableCcsBody = document.querySelector('#table-centros tbody');
    const tableDivsBody = document.querySelector('#table-divisoes tbody');

    // Modais
    const modalCc = document.getElementById('modal-cc');
    const formCc = document.getElementById('form-cc');
    const modalCcTitle = document.getElementById('modal-cc-title');
    const ccIdInput = document.getElementById('cc-id');
    const ccNomeInput = document.getElementById('cc-nome');
    const ccDivisaoSelect = document.getElementById('cc-divisao');

    const modalDiv = document.getElementById('modal-divisao');
    const formDiv = document.getElementById('form-divisao');
    const modalDivTitle = document.getElementById('modal-div-title');
    const divIdInput = document.getElementById('div-id');
    const divNomeInput = document.getElementById('div-nome');

    // Carregar Divisões no Select do modal de CC
    const popularSelectDivisoes = async () => {
        try {
            const divs = await api.get('/centros-consumidores/divisoes');
            divisoesData = Array.isArray(divs) ? divs : [];
            ccDivisaoSelect.innerHTML = '<option value="">Selecione a divisão...</option>' +
                divisoesData.map(d => `<option value="${d.id}">${d.nome} (${d.codigo})</option>`).join('');
        } catch (e) {
            ccDivisaoSelect.innerHTML = '<option value="">Erro ao carregar divisões</option>';
        }
    };

    // Renderizar Tabela de CCs
    const renderTableCcs = (lista) => {
        document.getElementById('total-ccs-badge').textContent = `${lista.length} centros`;
        if (lista.length === 0) {
            tableCcsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted" style="padding: 1.5rem;">Nenhum centro consumidor encontrado.</td></tr>';
            return;
        }

        tableCcsBody.innerHTML = lista.map(cc => `
            <tr>
                <td><span style="font-family:monospace; font-weight:600; background:rgba(59,130,246,0.15); color:#60a5fa; padding:2px 6px; border-radius:4px;">${cc.codigo}</span></td>
                <td><strong>${cc.nome}</strong></td>
                <td>${cc.divisao_nome ? `<span class="badge badge-info" style="font-size:0.85rem;">${cc.divisao_nome}</span>` : '<span class="text-muted">-</span>'}</td>
                <td style="text-align: center;">
                    <button class="btn btn-secondary btn-sm btn-edit-cc" data-id="${cc.id}" style="padding: 3px 8px;"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn btn-danger btn-sm btn-del-cc" data-id="${cc.id}" style="padding: 3px 8px;"><i class="fas fa-trash"></i> Excluir</button>
                </td>
            </tr>
        `).join('');

        tableCcsBody.querySelectorAll('.btn-edit-cc').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                const item = ccsData.find(c => c.id === id);
                if (!item) return;

                modalCcTitle.textContent = 'Editar Centro Consumidor';
                ccIdInput.value = item.id;
                ccNomeInput.value = item.nome;
                ccDivisaoSelect.value = item.divisao_id || '';
                modalCc.style.display = 'flex';
            });
        });

        tableCcsBody.querySelectorAll('.btn-del-cc').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (confirm('Tem certeza que deseja excluir este Centro Consumidor?')) {
                    try {
                        await api.del('/centros-consumidores/' + id);
                        showToast({ message: 'Centro consumidor excluído com sucesso.', type: 'success' });
                        loadCcs();
                    } catch (err) {
                        showToast({ message: err.message || 'Erro ao excluir.', type: 'error' });
                    }
                }
            });
        });
    };

    // Renderizar Tabela de Divisões
    const renderTableDivs = (lista) => {
        document.getElementById('total-divisoes-badge').textContent = `${lista.length} divisões`;
        if (lista.length === 0) {
            tableDivsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted" style="padding: 1.5rem;">Nenhuma divisão encontrada.</td></tr>';
            return;
        }

        tableDivsBody.innerHTML = lista.map(d => `
            <tr>
                <td><span style="font-family:monospace; font-weight:600; background:rgba(99,102,241,0.15); color:#818cf8; padding:2px 6px; border-radius:4px;">${d.codigo}</span></td>
                <td><strong>${d.nome}</strong></td>
                <td style="text-align: center;"><span class="badge badge-secondary" style="font-size:0.85rem;">${d.total_ccs || 0} setores</span></td>
                <td style="text-align: center;">
                    <button class="btn btn-secondary btn-sm btn-edit-div" data-id="${d.id}" style="padding: 3px 8px;"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn btn-danger btn-sm btn-del-div" data-id="${d.id}" style="padding: 3px 8px;"><i class="fas fa-trash"></i> Excluir</button>
                </td>
            </tr>
        `).join('');

        tableDivsBody.querySelectorAll('.btn-edit-div').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                const item = divisoesData.find(d => d.id === id);
                if (!item) return;

                modalDivTitle.textContent = 'Editar Divisão';
                divIdInput.value = item.id;
                divNomeInput.value = item.nome;
                modalDiv.style.display = 'flex';
            });
        });

        tableDivsBody.querySelectorAll('.btn-del-div').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (confirm('Tem certeza que deseja excluir esta Divisão? (Apenas permitido se não houver CCs nem dispensações vinculadas)')) {
                    try {
                        await api.del('/centros-consumidores/divisoes/' + id);
                        showToast({ message: 'Divisão excluída com sucesso.', type: 'success' });
                        loadDivisoes();
                        popularSelectDivisoes();
                    } catch (err) {
                        showToast({ message: err.message || 'Erro ao excluir divisão.', type: 'error' });
                    }
                }
            });
        });
    };

    // Carregar CCs
    const loadCcs = async () => {
        tableCcsBody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fas fa-spinner fa-spin"></i> Carregando centros...</td></tr>';
        try {
            const data = await api.get('/centros-consumidores?tipo=ccs');
            ccsData = Array.isArray(data) ? data : [];
            filterCcs();
        } catch (e) {
            tableCcsBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erro ao carregar dados.</td></tr>';
        }
    };

    // Carregar Divisões
    const loadDivisoes = async () => {
        tableDivsBody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fas fa-spinner fa-spin"></i> Carregando divisões...</td></tr>';
        try {
            const data = await api.get('/centros-consumidores/divisoes');
            divisoesData = Array.isArray(data) ? data : [];
            filterDivisoes();
        } catch (e) {
            tableDivsBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erro ao carregar dados.</td></tr>';
        }
    };

    // Filtros
    const filterCcs = () => {
        const termo = (document.getElementById('filter-ccs').value || '').trim().toLowerCase();
        if (!termo) {
            renderTableCcs(ccsData);
            return;
        }
        const filtrados = ccsData.filter(c => 
            (c.codigo || '').toLowerCase().includes(termo) ||
            (c.nome || '').toLowerCase().includes(termo) ||
            (c.divisao_nome || '').toLowerCase().includes(termo)
        );
        renderTableCcs(filtrados);
    };

    const filterDivisoes = () => {
        const termo = (document.getElementById('filter-divisoes').value || '').trim().toLowerCase();
        if (!termo) {
            renderTableDivs(divisoesData);
            return;
        }
        const filtrados = divisoesData.filter(d => 
            (d.codigo || '').toLowerCase().includes(termo) ||
            (d.nome || '').toLowerCase().includes(termo)
        );
        renderTableDivs(filtrados);
    };

    document.getElementById('filter-ccs').addEventListener('input', filterCcs);
    document.getElementById('filter-divisoes').addEventListener('input', filterDivisoes);

    // Botões de Abertura de Modal
    document.getElementById('btn-novo-cc').addEventListener('click', () => {
        modalCcTitle.textContent = 'Novo Centro Consumidor';
        ccIdInput.value = '';
        ccNomeInput.value = '';
        ccDivisaoSelect.value = '';
        modalCc.style.display = 'flex';
    });

    document.getElementById('btn-nova-divisao').addEventListener('click', () => {
        modalDivTitle.textContent = 'Nova Divisão';
        divIdInput.value = '';
        divNomeInput.value = '';
        modalDiv.style.display = 'flex';
    });

    // Cancelar Modais
    document.getElementById('btn-cancel-cc').addEventListener('click', () => modalCc.style.display = 'none');
    document.getElementById('btn-cancel-div').addEventListener('click', () => modalDiv.style.display = 'none');

    // Submissão do Formulário de CC
    formCc.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = ccIdInput.value;
        const nome = ccNomeInput.value.trim();
        const divisao_id = ccDivisaoSelect.value || null;

        if (!nome) {
            showToast({ message: 'Informe o nome do centro consumidor.', type: 'warning' });
            return;
        }

        try {
            if (id) {
                await api.put('/centros-consumidores/' + id, { nome, divisao_id });
                showToast({ message: 'Centro consumidor atualizado com sucesso.', type: 'success' });
            } else {
                await api.post('/centros-consumidores', { nome, divisao_id });
                showToast({ message: 'Centro consumidor cadastrado com sucesso.', type: 'success' });
            }
            modalCc.style.display = 'none';
            await loadCcs();
        } catch (err) {
            showToast({ message: err.message || 'Erro ao salvar.', type: 'error' });
        }
    });

    // Submissão do Formulário de Divisão
    formDiv.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = divIdInput.value;
        const nome = divNomeInput.value.trim();

        if (!nome) {
            showToast({ message: 'Informe o nome da divisão.', type: 'warning' });
            return;
        }

        try {
            if (id) {
                await api.put('/centros-consumidores/divisoes/' + id, { nome });
                showToast({ message: 'Divisão atualizada com sucesso.', type: 'success' });
            } else {
                await api.post('/centros-consumidores/divisoes', { nome });
                showToast({ message: 'Divisão cadastrada com sucesso.', type: 'success' });
            }
            modalDiv.style.display = 'none';
            await loadDivisoes();
            await popularSelectDivisoes();
        } catch (err) {
            showToast({ message: err.message || 'Erro ao salvar divisão.', type: 'error' });
        }
    });

    // Inicialização
    await popularSelectDivisoes();
    await loadCcs();
}
