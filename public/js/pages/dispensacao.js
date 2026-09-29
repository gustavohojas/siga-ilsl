import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderDispensacao(container) {
    container.innerHTML = `
        <div class="animate-fadeIn">
            <h2 class="mb-4">Dispensação de Materiais</h2>
            
            <div class="card mb-4">
                <div class="card-body">
                    <div class="form-group mb-0" style="display: flex; gap: 1rem;">
                        <input type="text" id="search-item" class="form-control" placeholder="Buscar por descrição ou código..." style="flex: 1;">
                        <button class="btn btn-primary" id="btn-search">Buscar</button>
                    </div>
                </div>
            </div>

            <div class="card mb-4" id="results-card" style="display: none;">
                <div class="card-header">
                    <h3>Resultados da Busca</h3>
                </div>
                <div class="card-body">
                    <table class="table" id="table-search-results">
                        <thead>
                            <tr>
                                <th>Descrição</th>
                                <th>Códigos</th>
                                <th>Lote</th>
                                <th>Unidade</th>
                                <th>Estoque Atual</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Results here -->
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>Últimas Dispensações</h3>
                </div>
                <div class="card-body">
                    <table class="table" id="table-recent">
                        <thead>
                            <tr>
                                <th>Data/Hora</th>
                                <th>Item</th>
                                <th>Lote</th>
                                <th>Qtd</th>
                                <th>Centro Consumidor</th>
                                <th>Responsável</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="6" class="text-center">Carregando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="modal-dispense" class="modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: var(--bg-card); padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px;">
                <h3 style="margin-bottom: 1.5rem;">Dispensar Item</h3>
                <form id="form-dispense">
                    <input type="hidden" id="disp-estoque-id">
                    
                    <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 4px;">
                        <div id="disp-item-desc" style="font-weight: bold; margin-bottom: 0.35rem;"></div>
                        <div id="disp-item-lote" style="color: var(--primary, #3b82f6); font-weight: 500; font-size: 0.9rem; margin-bottom: 0.25rem;"></div>
                        <div id="disp-item-estoque" style="color: var(--text-muted); font-size: 0.9rem;"></div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="disp-centro">Centro Consumidor</label>
                        <select id="disp-centro" class="form-control" required>
                            <option value="">Carregando...</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="disp-qtd">Quantidade</label>
                        <input type="number" id="disp-qtd" class="form-control" required min="1">
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
                        <button type="button" class="btn btn-secondary" id="btn-cancel-dispense">Cancelar</button>
                        <button type="submit" class="btn btn-primary" id="btn-save-dispense">Confirmar Dispensação</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const searchInput = document.getElementById('search-item');
    const btnSearch = document.getElementById('btn-search');
    const resultsCard = document.getElementById('results-card');
    const tableResults = document.querySelector('#table-search-results tbody');
    const tableRecent = document.querySelector('#table-recent tbody');
    
    const modal = document.getElementById('modal-dispense');
    const selectCentro = document.getElementById('disp-centro');
    const formDispense = document.getElementById('form-dispense');

    let centros = [];

    const loadCentros = async () => {
        try {
            centros = await api.get('/centros-consumidores');
            selectCentro.innerHTML = '<option value="">Selecione...</option>';
            if (centros) {
                centros.forEach(cc => {
                    const opt = document.createElement('option');
                    opt.value = cc._id || cc.id;
                    opt.textContent = `${cc.codigo} - ${cc.nome}`;
                    selectCentro.appendChild(opt);
                });
            }
        } catch (error) {
            selectCentro.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    };

    const loadRecent = async () => {
        try {
            const data = await api.get('/dispensacoes');
            if (data && data.length > 0) {
                tableRecent.innerHTML = data.slice(0, 10).map(d => {
                    const dataFormatada = d.criado_em ? new Date(d.criado_em).toLocaleString('pt-BR') : '-';
                    const centro = d.centro_consumidor_nome ? `${d.centro_consumidor_codigo ? d.centro_consumidor_codigo + ' - ' : ''}${d.centro_consumidor_nome}` : '-';
                    const loteText = d.lote ? `<span style="font-family:monospace; background:rgba(59,130,246,0.15); color:#60a5fa; padding:2px 6px; border-radius:4px;">${d.lote}</span>` : '<span style="color:var(--text-muted);">-</span>';
                    return `
                        <tr>
                            <td>${dataFormatada}</td>
                            <td>${d.estoque_descricao || 'N/A'}</td>
                            <td>${loteText}</td>
                            <td>${d.quantidade} ${d.unidade || ''}</td>
                            <td>${centro}</td>
                            <td>${d.usuario_nome || '-'}</td>
                        </tr>
                    `;
                }).join('');
            } else {
                tableRecent.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma dispensação recente.</td></tr>';
            }
        } catch (error) {
            tableRecent.innerHTML = '<tr><td colspan="6" class="text-center">Erro ao carregar dispensações.</td></tr>';
        }
    };

    const doSearch = async () => {
        const q = searchInput.value.trim();
        if (!q) return;

        btnSearch.textContent = 'Buscando...';
        btnSearch.disabled = true;
        tableResults.innerHTML = '<tr><td colspan="6" class="text-center">Buscando...</td></tr>';
        resultsCard.style.display = 'block';

        try {
            const data = await api.get('/dispensacoes/estoque/buscar?q=' + encodeURIComponent(q));
            if (data && data.length > 0) {
                tableResults.innerHTML = data.map(item => {
                    const qtdDisponivel = item.quantidade_atual !== undefined ? item.quantidade_atual : (item.quantidade || 0);
                    const codigos = [item.codigo_barras, item.codigo_siafisico, item.codigo_compras].filter(Boolean).join(' / ') || '-';
                    const loteBadge = item.lote ? `<span style="font-family:monospace; background:rgba(59,130,246,0.15); color:#60a5fa; padding:2px 6px; border-radius:4px; font-weight:500;">${item.lote}</span>` : '<span style="color:var(--text-muted);">-</span>';
                    
                    return `
                        <tr>
                            <td><strong>${item.descricao}</strong></td>
                            <td>${codigos}</td>
                            <td>${loteBadge}</td>
                            <td>${item.unidade}</td>
                            <td><strong>${qtdDisponivel}</strong></td>
                            <td>
                                <button class="btn btn-primary btn-dispense" 
                                    data-id="${item._id || item.id}" 
                                    data-desc="${item.descricao}" 
                                    data-lote="${item.lote || ''}"
                                    data-qtd="${qtdDisponivel}">
                                    Dispensar
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');

                document.querySelectorAll('.btn-dispense').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const target = e.currentTarget || e.target;
                        const id = target.getAttribute('data-id');
                        const desc = target.getAttribute('data-desc');
                        const lote = target.getAttribute('data-lote');
                        const maxQtd = parseFloat(target.getAttribute('data-qtd'));

                        document.getElementById('disp-estoque-id').value = id;
                        document.getElementById('disp-item-desc').textContent = desc;
                        document.getElementById('disp-item-lote').textContent = lote ? `Lote: ${lote}` : 'Lote: Não especificado';
                        document.getElementById('disp-item-estoque').textContent = `Em estoque: ${maxQtd}`;
                        
                        const qtdInput = document.getElementById('disp-qtd');
                        qtdInput.value = '';
                        qtdInput.max = maxQtd;
                        
                        selectCentro.value = '';
                        modal.style.display = 'flex';
                    });
                });
            } else {
                tableResults.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum item encontrado.</td></tr>';
            }
        } catch (error) {
            tableResults.innerHTML = '<tr><td colspan="6" class="text-center">Erro ao buscar itens.</td></tr>';
        } finally {
            btnSearch.textContent = 'Buscar';
            btnSearch.disabled = false;
        }
    };

    btnSearch.addEventListener('click', doSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') doSearch();
    });

    document.getElementById('btn-cancel-dispense').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    formDispense.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('btn-save-dispense');
        btn.disabled = true;
        btn.textContent = 'Salvando...';

        try {
            const body = {
                estoque_id: document.getElementById('disp-estoque-id').value,
                centro_consumidor_id: selectCentro.value,
                quantidade: parseInt(document.getElementById('disp-qtd').value)
            };

            await api.post('/dispensacoes', body);
            showToast({ message: 'Dispensação realizada com sucesso!', type: 'success' });
            modal.style.display = 'none';
            doSearch();
            loadRecent();
        } catch (error) {
            showToast({ message: 'Erro ao realizar dispensação.', type: 'error' });
        } finally {
            btn.disabled = false;
            btn.textContent = 'Confirmar Dispensação';
        }
    });

    await loadCentros();
    loadRecent();
}
