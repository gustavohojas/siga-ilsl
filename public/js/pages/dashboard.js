import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { formatQtd } from '../utils/format.js';

export async function renderDashboard(container) {
    container.innerHTML = `
        <div class="animate-fadeIn">
            <h2 class="mb-4">Visão Geral</h2>
            
            <div class="stats-grid mb-4" id="stats-container">
                <div class="stat-card clickable" onclick="if(!event.target.closest('a')) location.hash='#relatorios?tipo=total'">
                    <div class="stat-title">Total de Itens em Estoque</div>
                    <div class="stat-value"><a href="#relatorios?tipo=total" title="Ver relatório de Estoque Total">...</a></div>
                </div>
                <div class="stat-card clickable" onclick="if(!event.target.closest('a')) location.hash='#empenho'">
                    <div class="stat-title">Empenhos Ativos</div>
                    <div class="stat-value"><a href="#empenho" title="Ver Notas de Empenho">...</a></div>
                </div>
                <div class="stat-card clickable" onclick="if(!event.target.closest('a')) location.hash='#centros'">
                    <div class="stat-title">Centros Consumidores</div>
                    <div class="stat-value"><a href="#centros" title="Ver Centros Consumidores">...</a></div>
                </div>
                <div class="stat-card warning clickable" onclick="if(!event.target.closest('a')) location.hash='#relatorios?tipo=validade'">
                    <div class="stat-title">Itens Perecíveis / Validade</div>
                    <div class="stat-value"><a href="#relatorios?tipo=validade" title="Ver relatório de Itens por Validade">...</a></div>
                </div>
                <div class="stat-card info clickable" onclick="if(!event.target.closest('a')) location.hash='#relatorios?tipo=garantia'">
                    <div class="stat-title">Itens em Garantia</div>
                    <div class="stat-value"><a href="#relatorios?tipo=garantia" title="Ver relatório de Itens por Garantia">...</a></div>
                </div>
            </div>

            <div class="grid grid-2 gap-4">
                <div class="card">
                    <div class="card-header">
                        <h3>Itens Próximos do Vencimento</h3>
                    </div>
                    <div class="card-body">
                        <table class="table" id="validade-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Vencimento</th>
                                    <th>Qtd Atual</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="3" class="text-center">Carregando...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3>Itens com Garantia</h3>
                    </div>
                    <div class="card-body">
                        <table class="table" id="garantia-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Data Garantia</th>
                                    <th>Qtd Atual</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="3" class="text-center">Carregando...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0;">Últimas Atividades</h3>
                        <a href="#dispensacao" style="font-size: 0.85rem; color: var(--accent-primary, #6366f1); text-decoration: none; font-weight: 500;">Ver histórico completo →</a>
                    </div>
                    <div class="card-body" id="atividades-recentes">
                        <p class="text-muted">Carregando atividades...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    try {
        const [estoqueRes, empenhosRes, centrosRes, validadeRes, dispRes, garantiaRes] = await Promise.all([
            api.get('/relatorios/estoque/total').catch(() => []),
            api.get('/empenhos').catch(() => []),
            api.get('/centros-consumidores').catch(() => []),
            api.get('/relatorios/estoque/validade').catch(() => []),
            api.get('/dispensacoes').catch(() => []),
            api.get('/relatorios/estoque/garantia').catch(() => [])
        ]);

        const totalItens = Array.isArray(estoqueRes) 
            ? estoqueRes.reduce((acc, curr) => acc + Number(curr.quantidade_atual !== undefined ? curr.quantidade_atual : (curr.quantidade || 0)), 0) 
            : 0;
        const totalEmpenhos = Array.isArray(empenhosRes) ? empenhosRes.length : 0;
        const totalCentros = Array.isArray(centrosRes) ? centrosRes.length : 0;
        const itensValidade = Array.isArray(validadeRes) ? validadeRes : [];
        const itensGarantia = Array.isArray(garantiaRes) ? garantiaRes : [];

        const statsContainer = document.getElementById('stats-container');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-card clickable" onclick="if(!event.target.closest('a')) location.hash='#relatorios?tipo=total'">
                    <div class="stat-title">Total de Itens em Estoque</div>
                    <div class="stat-value"><a href="#relatorios?tipo=total" title="Ver relatório de Estoque Total">${formatQtd(totalItens)}</a></div>
                </div>
                <div class="stat-card clickable" onclick="if(!event.target.closest('a')) location.hash='#empenho'">
                    <div class="stat-title">Empenhos Ativos</div>
                    <div class="stat-value"><a href="#empenho" title="Ver Notas de Empenho">${formatQtd(totalEmpenhos)}</a></div>
                </div>
                <div class="stat-card clickable" onclick="if(!event.target.closest('a')) location.hash='#centros'">
                    <div class="stat-title">Centros Consumidores</div>
                    <div class="stat-value"><a href="#centros" title="Ver Centros Consumidores">${formatQtd(totalCentros)}</a></div>
                </div>
                <div class="stat-card warning clickable" onclick="if(!event.target.closest('a')) location.hash='#relatorios?tipo=validade'">
                    <div class="stat-title">Itens Perecíveis / Validade</div>
                    <div class="stat-value"><a href="#relatorios?tipo=validade" title="Ver relatório de Itens por Validade">${formatQtd(itensValidade.length)}</a></div>
                </div>
                <div class="stat-card info clickable" onclick="if(!event.target.closest('a')) location.hash='#relatorios?tipo=garantia'">
                    <div class="stat-title">Itens em Garantia</div>
                    <div class="stat-value"><a href="#relatorios?tipo=garantia" title="Ver relatório de Itens por Garantia">${formatQtd(itensGarantia.length)}</a></div>
                </div>
            `;
        }

        const validadeTableBody = document.querySelector('#validade-table tbody');
        if (validadeTableBody) {
            if (itensValidade.length > 0) {
                validadeTableBody.innerHTML = itensValidade.slice(0, 6).map(item => {
                    const dataVal = item.validade ? new Date(item.validade) : null;
                    const vencido = dataVal && dataVal < new Date();
                    return `
                        <tr>
                            <td><strong>${item.descricao || 'N/A'}</strong></td>
                            <td class="${vencido ? 'text-danger' : 'text-warning'}">${dataVal ? dataVal.toLocaleDateString('pt-BR') : '-'}</td>
                            <td>${formatQtd(item.quantidade_atual !== undefined ? item.quantidade_atual : item.quantidade || 0)} ${item.unidade || ''}</td>
                        </tr>
                    `;
                }).join('');
            } else {
                validadeTableBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Nenhum item perecível em estoque</td></tr>`;
            }
        }

        const garantiaTableBody = document.querySelector('#garantia-table tbody');
        if (garantiaTableBody) {
            if (itensGarantia.length > 0) {
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                garantiaTableBody.innerHTML = itensGarantia.slice(0, 6).map(item => {
                    const dataGarStr = item.data_garantia ? String(item.data_garantia).split('T')[0] : '';
                    let dataGar = null;
                    if (dataGarStr) {
                        const [y, m, d] = dataGarStr.split('-').map(Number);
                        dataGar = new Date(y, m - 1, d);
                    }
                    const vencido = dataGar && dataGar < hoje;
                    return `
                        <tr>
                            <td><strong>${item.descricao || 'N/A'}</strong></td>
                            <td class="${vencido ? 'text-danger' : 'text-primary'}">${dataGar ? dataGar.toLocaleDateString('pt-BR') : '-'}</td>
                            <td>${formatQtd(item.quantidade_atual !== undefined ? item.quantidade_atual : item.quantidade || 0)} ${item.unidade || ''}</td>
                        </tr>
                    `;
                }).join('');
            } else {
                garantiaTableBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Nenhum item com garantia em estoque</td></tr>`;
            }
        }

        const atividadesContainer = document.getElementById('atividades-recentes');
        if (atividadesContainer) {
            if (Array.isArray(dispRes) && dispRes.length > 0) {
                atividadesContainer.innerHTML = dispRes.slice(0, 6).map(d => {
                    const dataStr = d.criado_em ? new Date(d.criado_em).toLocaleString('pt-BR') : '';
                    return `
                        <div style="padding: 0.75rem 0; border-bottom: 1px solid var(--border-glass);">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <strong>Dispensação: ${d.estoque_descricao || 'Material'}</strong>
                                <span class="badge badge-info">${formatQtd(d.quantidade)} ${d.unidade || 'un'}</span>
                            </div>
                            <small style="color: var(--text-muted);">Para: ${d.centro_consumidor_nome || 'Setor'} • ${dataStr}</small>
                        </div>
                    `;
                }).join('');
            } else {
                atividadesContainer.innerHTML = `
                    <div style="padding: 1rem 0; color: var(--text-muted); text-align: center;">
                        Nenhuma atividade recente registrada.
                    </div>
                `;
            }
        }
        
    } catch (error) {
        showToast({ message: 'Erro ao carregar os dados do dashboard.', type: 'error' });
    }
}
