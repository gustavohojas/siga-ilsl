import { api, getToken } from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderRelatorios(container) {
    container.innerHTML = `
        <div class="animate-fadeIn">
            <h2 class="mb-4">Relatórios</h2>
            
            <div class="card mb-4">
                <div class="card-header" style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button class="btn btn-primary tab-btn" data-target="tab-estoque">Estoque</button>
                    <button class="btn btn-secondary tab-btn" data-target="tab-empresa">Fornecedor / Empresa</button>
                    <button class="btn btn-secondary tab-btn" data-target="tab-centro">Centro Consumidor</button>
                    <button class="btn btn-secondary tab-btn" data-target="tab-lote"><i class="fas fa-barcode"></i> Rastreabilidade por Lote</button>
                    <button class="btn btn-secondary tab-btn" data-target="tab-estornos"><i class="fas fa-undo-alt"></i> Auditoria de Estornos</button>
                    <button class="btn btn-secondary tab-btn" data-target="tab-consumo"><i class="fas fa-chart-pie"></i> Consumo Financeiro (R$)</button>
                </div>
                
                <div class="card-body">
                    <!-- ESTOQUE TAB -->
                    <div id="tab-estoque" class="tab-content" style="display: block;">
                        <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                            <select id="estoque-tipo" class="form-control" style="max-width: 200px;">
                                <option value="total">Estoque Total</option>
                                <option value="validade">Por Validade</option>
                                <option value="garantia">Por Garantia</option>
                                <option value="historico">Histórico de Item</option>
                            </select>
                            
                            <select id="estoque-item-select" class="form-control" style="display: none; max-width: 300px;">
                                <option value="">Selecione o Item...</option>
                            </select>
                            
                            <button class="btn btn-primary" id="btn-gerar-estoque">Gerar Relatório</button>
                            <button class="btn btn-secondary btn-print"><i class="fas fa-print"></i> Imprimir</button>
                            <button class="btn btn-secondary btn-excel" data-url="/relatorios/estoque/total"><i class="fas fa-file-excel"></i> Exportar Excel</button>
                        </div>
                        <div id="relatorio-estoque-content" style="overflow-x: auto;">
                            <p class="text-center text-muted">Selecione as opções e clique em Gerar Relatório.</p>
                        </div>
                    </div>

                    <!-- EMPRESA TAB -->
                    <div id="tab-empresa" class="tab-content" style="display: none;">
                        <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                            <select id="empresa-select" class="form-control" style="max-width: 300px;">
                                <option value="">Selecione a Empresa...</option>
                            </select>
                            <select id="empresa-tipo" class="form-control" style="max-width: 200px;">
                                <option value="entregues">Itens Entregues</option>
                                <option value="atraso">Itens em Atraso</option>
                            </select>
                            <button class="btn btn-primary" id="btn-gerar-empresa">Gerar Relatório</button>
                            <button class="btn btn-secondary btn-print"><i class="fas fa-print"></i> Imprimir</button>
                            <button class="btn btn-secondary btn-excel" id="btn-excel-empresa" data-url=""><i class="fas fa-file-excel"></i> Exportar Excel</button>
                        </div>
                        <div id="relatorio-empresa-content" style="overflow-x: auto;"></div>
                    </div>

                    <!-- CENTRO TAB -->
                    <div id="tab-centro" class="tab-content" style="display: none;">
                        <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                            <select id="centro-select" class="form-control" style="max-width: 300px;">
                                <option value="">Selecione o Centro...</option>
                            </select>
                            <select id="centro-tipo" class="form-control" style="max-width: 200px;">
                                <option value="historico">Histórico Completo</option>
                                <option value="item">Por Item</option>
                            </select>
                            <button class="btn btn-primary" id="btn-gerar-centro">Gerar Relatório</button>
                            <button class="btn btn-secondary btn-print"><i class="fas fa-print"></i> Imprimir</button>
                            <button class="btn btn-secondary btn-excel" id="btn-excel-centro" data-url=""><i class="fas fa-file-excel"></i> Exportar Excel</button>
                        </div>
                        <div id="relatorio-centro-content" style="overflow-x: auto;"></div>
                    </div>

                    <!-- LOTE TAB -->
                    <div id="tab-lote" class="tab-content" style="display: none;">
                        <div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center;">
                            <input type="text" id="lote-search-input" class="form-control" placeholder="Buscar por Lote, Produto ou Código..." style="max-width: 320px;">
                            
                            <select id="lote-situacao-select" class="form-control" style="max-width: 260px;">
                                <option value="todos">Todos (Estoque + Dispensados)</option>
                                <option value="estoque">Apenas em Estoque</option>
                                <option value="dispensado">Apenas Dispensados</option>
                            </select>
                            
                            <button class="btn btn-primary" id="btn-gerar-lote">Gerar Relatório</button>
                            <button class="btn btn-secondary btn-print"><i class="fas fa-print"></i> Imprimir</button>
                            <button class="btn btn-secondary btn-excel" id="btn-excel-lote" data-url=""><i class="fas fa-file-excel"></i> Exportar Excel</button>
                        </div>
                        <div id="relatorio-lote-content" style="overflow-x: auto;">
                            <p class="text-center text-muted">Informe o lote ou produto e clique em Gerar Relatório.</p>
                        </div>
                    </div>

                    <!-- ESTORNOS TAB -->
                    <div id="tab-estornos" class="tab-content" style="display: none;">
                        <div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center;">
                            <input type="text" id="estornos-search-input" class="form-control" placeholder="Buscar por material, lote, NF, NE, fornecedor, justificativa..." style="max-width: 320px;">
                            
                            <select id="estornos-motivo-select" class="form-control" style="max-width: 220px;">
                                <option value="todos">Todos os Motivos</option>
                                <option value="erro_digitacao">Erro de Digitação</option>
                                <option value="devolucao_fornecedor">Devolução ao Fornecedor</option>
                            </select>
                            
                            <button class="btn btn-primary" id="btn-gerar-estornos">Gerar Relatório</button>
                            <button class="btn btn-secondary btn-print"><i class="fas fa-print"></i> Imprimir</button>
                            <button class="btn btn-secondary btn-excel" id="btn-excel-estornos" data-url=""><i class="fas fa-file-excel"></i> Exportar Excel</button>
                        </div>
                        <div id="relatorio-estornos-content" style="overflow-x: auto;">
                            <p class="text-center text-muted">Selecione os filtros e clique em Gerar Relatório.</p>
                        </div>
                    </div>

                    <!-- CONSUMO FINANCEIRO TAB (R$) -->
                    <div id="tab-consumo" class="tab-content" style="display: none;">
                        <!-- Controles e Filtro de Período -->
                        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); padding: 1.25rem; border-radius: 12px; margin-bottom: 1.5rem;">
                            <!-- Sub-abas -->
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.25rem;" id="consumo-subtabs">
                                <button type="button" class="btn btn-primary btn-sm consumo-subtab-btn" data-subtab="subtab-divisao">Por Divisão</button>
                                <button type="button" class="btn btn-secondary btn-sm consumo-subtab-btn" data-subtab="subtab-cc">Por CC</button>
                                <button type="button" class="btn btn-secondary btn-sm consumo-subtab-btn" data-subtab="subtab-item">Por Item</button>
                                <button type="button" class="btn btn-secondary btn-sm consumo-subtab-btn" data-subtab="subtab-mensal">Evolução Mensal</button>
                            </div>

                            <!-- Filtro de datas e botões de ação -->
                            <div style="display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;">
                                <div class="form-group mb-0" style="min-width: 170px;">
                                    <label class="form-label" style="font-size: 0.8rem;">Data Inicial</label>
                                    <input type="date" id="consumo-data-inicio" class="form-control">
                                </div>
                                <div class="form-group mb-0" style="min-width: 170px;">
                                    <label class="form-label" style="font-size: 0.8rem;">Data Final</label>
                                    <input type="date" id="consumo-data-fim" class="form-control">
                                </div>
                                <button type="button" class="btn btn-primary" id="btn-gerar-consumo">
                                    <i class="fas fa-search"></i> Gerar
                                </button>
                                <button type="button" class="btn btn-secondary" id="btn-excel-consumo">
                                    <i class="fas fa-file-excel"></i> Exportar Excel
                                </button>
                                <button type="button" class="btn btn-secondary" id="btn-pdf-consumo">
                                    <i class="fas fa-file-pdf"></i> Exportar PDF
                                </button>
                            </div>
                        </div>

                        <!-- Indicador de total no período -->
                        <div id="consumo-total-card" style="display: none; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; padding: 1rem 1.5rem; margin-bottom: 1.5rem; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                            <div>
                                <span style="color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px;">Gasto Total no Período Selecionado</span>
                                <h3 id="consumo-total-valor" style="margin: 0; color: #10b981; font-size: 1.75rem;">R$ 0,00</h3>
                            </div>
                            <div id="consumo-periodo-badge" style="font-size: 0.85rem; color: #94a3b8; background: rgba(255,255,255,0.05); padding: 0.4rem 0.8rem; border-radius: 6px;"></div>
                        </div>

                        <!-- SUB-ABA 1: POR DIVISÃO -->
                        <div id="subtab-divisao" class="consumo-subtab-content" style="display: block;">
                            <div class="consumo-charts-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                                <div class="card p-3" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
                                    <h4 style="margin-top:0; margin-bottom: 1rem; color: #fff; font-size: 1rem;">🥧 Proporção de Gastos por Divisão</h4>
                                    <div style="height: 300px; position: relative;">
                                        <canvas id="chart-divisao-pizza"></canvas>
                                    </div>
                                </div>
                                <div class="card p-3" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;">
                                    <h4 style="margin-top:0; margin-bottom: 1rem; color: #fff; font-size: 1rem;">📊 Comparativo entre Divisões (R$)</h4>
                                    <div style="height: 300px; position: relative;">
                                        <canvas id="chart-divisao-barras"></canvas>
                                    </div>
                                </div>
                            </div>
                            <div class="consumo-table-container card p-3" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow-x: auto;">
                                <h4 style="margin-top:0; margin-bottom: 1rem; color: #fff; font-size: 1rem;">Detalhamento por Divisão</h4>
                                <div id="table-consumo-divisao-wrapper"></div>
                            </div>
                        </div>

                        <!-- SUB-ABA 2: POR CENTRO CONSUMIDOR -->
                        <div id="subtab-cc" class="consumo-subtab-content" style="display: none;">
                            <div class="consumo-charts-container card p-3" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; margin-bottom: 1.5rem;">
                                <h4 style="margin-top:0; margin-bottom: 1rem; color: #fff; font-size: 1rem;">📊 Top 10 Centros Consumidores (R$)</h4>
                                <div style="height: 340px; position: relative;">
                                    <canvas id="chart-cc-barras"></canvas>
                                </div>
                            </div>
                            <div class="consumo-table-container card p-3" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow-x: auto;">
                                <h4 style="margin-top:0; margin-bottom: 1rem; color: #fff; font-size: 1rem;">Detalhamento por Centro Consumidor</h4>
                                <div id="table-consumo-cc-wrapper"></div>
                            </div>
                        </div>

                        <!-- SUB-ABA 3: POR ITEM -->
                        <div id="subtab-item" class="consumo-subtab-content" style="display: none;">
                            <div class="consumo-charts-container card p-3" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; margin-bottom: 1.5rem;">
                                <h4 style="margin-top:0; margin-bottom: 1rem; color: #fff; font-size: 1rem;">📊 Top 10 Itens Mais Consumidos em R$</h4>
                                <div style="height: 340px; position: relative;">
                                    <canvas id="chart-item-barras"></canvas>
                                </div>
                            </div>
                            <div class="consumo-table-container card p-3" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow-x: auto;">
                                <h4 style="margin-top:0; margin-bottom: 1rem; color: #fff; font-size: 1rem;">Detalhamento por Item</h4>
                                <div id="table-consumo-item-wrapper"></div>
                            </div>
                        </div>

                        <!-- SUB-ABA 4: EVOLUÇÃO MENSAL -->
                        <div id="subtab-mensal" class="consumo-subtab-content" style="display: none;">
                            <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); padding: 1rem; border-radius: 10px; margin-bottom: 1.5rem;">
                                <div style="display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.75rem;">
                                    <strong style="color: #fff; font-size: 0.9rem;">Séries do Gráfico:</strong>
                                    <label style="display: inline-flex; align-items: center; gap: 0.4rem; cursor: pointer; color: #f1f5f9;">
                                        <input type="radio" name="mensal-tipo-serie" value="total" checked> Total Geral
                                    </label>
                                    <label style="display: inline-flex; align-items: center; gap: 0.4rem; cursor: pointer; color: #f1f5f9;">
                                        <input type="radio" name="mensal-tipo-serie" value="divisao"> Comparar por Divisão
                                    </label>
                                    <label style="display: inline-flex; align-items: center; gap: 0.4rem; cursor: pointer; color: #f1f5f9;">
                                        <input type="radio" name="mensal-tipo-serie" value="cc"> Comparar por Centro Consumidor
                                    </label>
                                </div>
                                <div id="mensal-series-selector" style="display: none; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.06);">
                                    <small style="color: var(--text-secondary); display: block; margin-bottom: 0.5rem;">
                                        Selecione até 5 itens para visualização simultânea:
                                    </small>
                                    <div id="mensal-series-checkboxes" style="display: flex; flex-wrap: wrap; gap: 0.75rem;"></div>
                                </div>
                            </div>

                            <div class="consumo-charts-container card p-3" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; margin-bottom: 1.5rem;">
                                <h4 style="margin-top:0; margin-bottom: 1rem; color: #fff; font-size: 1rem;">📈 Evolução Mensal do Consumo</h4>
                                <div style="height: 350px; position: relative;">
                                    <canvas id="chart-mensal-linha"></canvas>
                                </div>
                            </div>
                            <div class="consumo-table-container card p-3" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow-x: auto;">
                                <h4 style="margin-top:0; margin-bottom: 1rem; color: #fff; font-size: 1rem;">Detalhamento Mensal</h4>
                                <div id="table-consumo-mensal-wrapper"></div>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </div>

        <!-- MODAL DE EXPORTAÇÃO PDF DO RELATÓRIO DE CONSUMO -->
        <div id="modal-export-pdf" class="modal-overlay" style="display: none; z-index: 99999;">
            <div class="modal" style="background: #0f172a; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 25px 60px rgba(0,0,0,0.95); border-radius: 12px; max-width: 440px; padding: 1.75rem; color: #f1f5f9;">
                <h4 style="margin: 0 0 1rem; color: #fff; font-size: 1.15rem; display: flex; align-items: center; gap: 0.5rem;">
                    📄 O que incluir no PDF?
                </h4>
                <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1.25rem;">
                    Escolha os componentes que deseja incluir no documento gerado da aba ativa:
                </p>
                <div style="display: flex; flex-direction: column; gap: 0.85rem; margin-bottom: 1.75rem;">
                    <label style="display: inline-flex; align-items: center; gap: 0.75rem; cursor: pointer; color: #fff;">
                        <input type="checkbox" id="chk-pdf-graficos" checked style="width: 1.2rem; height: 1.2rem; accent-color: var(--accent-primary);">
                        <span>Gráficos <small style="color: var(--text-muted);">(Captura visual renderizada)</small></span>
                    </label>
                    <label style="display: inline-flex; align-items: center; gap: 0.75rem; cursor: pointer; color: #fff;">
                        <input type="checkbox" id="chk-pdf-tabelas" checked style="width: 1.2rem; height: 1.2rem; accent-color: var(--accent-primary);">
                        <span>Tabelas <small style="color: var(--text-muted);">(Dados tabulares detalhados)</small></span>
                    </label>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                    <button type="button" class="btn btn-outline" id="btn-pdf-cancel">Cancelar</button>
                    <button type="button" class="btn btn-primary" id="btn-pdf-confirm">Gerar PDF</button>
                </div>
            </div>
        </div>
    `;

    // Tabs logic
    const tabs = document.querySelectorAll('.tab-content');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.replace('btn-primary', 'btn-secondary'));
            btn.classList.replace('btn-secondary', 'btn-primary');
            tabs.forEach(t => t.style.display = 'none');
            document.getElementById(btn.getAttribute('data-target')).style.display = 'block';
        });
    });

    // Print
    document.querySelectorAll('.btn-print').forEach(btn => {
        btn.addEventListener('click', () => window.print());
    });

    // Excel
    document.querySelectorAll('.btn-excel').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const url = e.currentTarget.getAttribute('data-url');
            if (!url) {
                showToast({ message: 'Selecione e gere um relatório primeiro.', type: 'warning' });
                return;
            }
            try {
                // api.get with ?export=excel should handle blob download
                await api.get(url + (url.includes('?') ? '&' : '?') + 'export=excel');
            } catch (error) {
                showToast({ message: 'Erro ao exportar excel', type: 'error' });
            }
        });
    });

    // Estoque
    const estoqueTipo = document.getElementById('estoque-tipo');
    const estoqueItemSelect = document.getElementById('estoque-item-select');
    const btnGerarEstoque = document.getElementById('btn-gerar-estoque');
    const estoqueContent = document.getElementById('relatorio-estoque-content');
    const excelEstoque = document.querySelector('#tab-estoque .btn-excel');

    estoqueTipo.addEventListener('change', async (e) => {
        if (e.target.value === 'historico') {
            estoqueItemSelect.style.display = 'block';
            if (estoqueItemSelect.options.length <= 1) {
                try {
                    const data = await api.get('/relatorios/estoque/total');
                    if (data) {
                        data.forEach(item => {
                            const opt = document.createElement('option');
                            opt.value = item._id || item.id;
                            opt.textContent = item.descricao;
                            estoqueItemSelect.appendChild(opt);
                        });
                    }
                } catch (e) {
                    console.error('Erro ao carregar itens');
                }
            }
        } else {
            estoqueItemSelect.style.display = 'none';
        }
    });

    btnGerarEstoque.addEventListener('click', async () => {
        const tipo = estoqueTipo.value;
        let url = '';
        
        if (tipo === 'total') url = '/relatorios/estoque/total';
        else if (tipo === 'validade') url = '/relatorios/estoque/validade';
        else if (tipo === 'garantia') url = '/relatorios/estoque/garantia';
        else if (tipo === 'historico') {
            const id = estoqueItemSelect.value;
            if (!id) return showToast({ message: 'Selecione um item', type: 'warning' });
            url = '/relatorios/estoque/item/' + id + '/historico';
        }

        excelEstoque.setAttribute('data-url', url);
        estoqueContent.innerHTML = 'Carregando...';

        try {
            const data = await api.get(url);
            if (!data || data.length === 0) {
                estoqueContent.innerHTML = '<p>Nenhum dado encontrado.</p>';
                return;
            }

            let html = '<table class="table"><thead><tr>';
            if (tipo === 'total') {
                html += '<th>Item / Descrição</th><th>Cód. Siafísico</th><th>Cód. Compras</th><th title="Informe a unidade em que o produto será dispensado aos centros consumidores">Menor un. de dispensação <i class="fas fa-info-circle text-muted" title="Informe a unidade em que o produto será dispensado aos centros consumidores" style="cursor:help; font-size:0.75rem;"></i></th><th>Estoque Atual</th><th>Nat. Despesa</th></tr></thead><tbody>';
                html += data.map(i => {
                    const qtd = i.quantidade_atual !== undefined ? i.quantidade_atual : (i.quantidade || 0);
                    return `
                        <tr>
                            <td><strong>${i.descricao}</strong></td>
                            <td>${i.codigo_siafisico || '-'}</td>
                            <td>${i.codigo_compras || '-'}</td>
                            <td>${i.unidade || '-'}</td>
                            <td><span class="badge ${qtd > 0 ? 'badge-success' : 'badge-danger'}" style="font-size:0.85rem;">${qtd}</span></td>
                            <td>${i.natureza_despesa || '-'}</td>
                        </tr>
                    `;
                }).join('');
            } else if (tipo === 'validade') {
                html += '<th>Item / Descrição</th><th>Data de Validade</th><th>Situação</th><th>Estoque Atual</th><th title="Informe a unidade em que o produto será dispensado aos centros consumidores">Menor un. de dispensação <i class="fas fa-info-circle text-muted" title="Informe a unidade em que o produto será dispensado aos centros consumidores" style="cursor:help; font-size:0.75rem;"></i></th></tr></thead><tbody>';
                html += data.map(i => {
                    const dataVal = i.validade ? new Date(i.validade) : null;
                    const vencido = dataVal && dataVal < new Date();
                    const qtd = i.quantidade_atual !== undefined ? i.quantidade_atual : (i.quantidade || 0);
                    return `
                        <tr>
                            <td><strong>${i.descricao}</strong></td>
                            <td class="${vencido ? 'text-danger' : 'text-warning'}"><strong>${dataVal ? dataVal.toLocaleDateString('pt-BR') : '-'}</strong></td>
                            <td>${vencido ? '<span class="badge badge-danger">Vencido</span>' : '<span class="badge badge-warning">Em Validade</span>'}</td>
                            <td><span class="badge badge-info" style="font-size:0.85rem;">${qtd}</span></td>
                            <td>${i.unidade || '-'}</td>
                        </tr>
                    `;
                }).join('');
            } else if (tipo === 'garantia') {
                html += '<th>Item / Descrição</th><th>Data da Garantia</th><th>Situação</th><th>Estoque Atual</th><th title="Informe a unidade em que o produto será dispensado aos centros consumidores">Menor un. de dispensação <i class="fas fa-info-circle text-muted" title="Informe a unidade em que o produto será dispensado aos centros consumidores" style="cursor:help; font-size:0.75rem;"></i></th></tr></thead><tbody>';
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                html += data.map(i => {
                    const dataGarStr = i.data_garantia ? String(i.data_garantia).split('T')[0] : '';
                    let dataGar = null;
                    if (dataGarStr) {
                        const [y, m, d] = dataGarStr.split('-').map(Number);
                        dataGar = new Date(y, m - 1, d);
                    }
                    const vencido = dataGar && dataGar < hoje;
                    const qtd = i.quantidade_atual !== undefined ? i.quantidade_atual : (i.quantidade || 0);
                    return `
                        <tr>
                            <td><strong>${i.descricao}</strong></td>
                            <td class="${vencido ? 'text-danger' : 'text-primary'}"><strong>${dataGar ? dataGar.toLocaleDateString('pt-BR') : '-'}</strong></td>
                            <td>${vencido ? '<span class="badge badge-danger">Garantia Vencida</span>' : '<span class="badge badge-success">Em Garantia</span>'}</td>
                            <td><span class="badge badge-info" style="font-size:0.85rem;">${qtd}</span></td>
                            <td>${i.unidade || '-'}</td>
                        </tr>
                    `;
                }).join('');
            } else {
                html += '<th>Data</th><th>Tipo</th><th>Qtd</th><th>Usuário</th></tr></thead><tbody>';
                html += data.map(i => `<tr><td>${new Date(i.createdAt).toLocaleString()}</td><td>${i.tipo}</td><td>${i.quantidade}</td><td>${i.usuario?.nome || '-'}</td></tr>`).join('');
            }
            html += '</tbody></table>';
            estoqueContent.innerHTML = html;

        } catch (error) {
            estoqueContent.innerHTML = '<p class="text-danger">Erro ao carregar relatório.</p>';
        }
    });

    // Auto-gerar relatório se vier com parâmetro na URL (ex: #relatorios?tipo=total ou #relatorios?tipo=validade ou #relatorios?tipo=garantia)
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const preTipo = urlParams.get('tipo');
    if (preTipo === 'total' || preTipo === 'validade' || preTipo === 'garantia') {
        estoqueTipo.value = preTipo;
        btnGerarEstoque.click();
    }

    // Empresa
    const empresaSelect = document.getElementById('empresa-select');
    const empresaTipo = document.getElementById('empresa-tipo');
    const btnGerarEmpresa = document.getElementById('btn-gerar-empresa');
    const empresaContent = document.getElementById('relatorio-empresa-content');
    const excelEmpresa = document.getElementById('btn-excel-empresa');

    const loadEmpresas = async () => {
        try {
            const data = await api.get('/relatorios/empresa'); // Or appropriate endpoint
            if (data) {
                data.forEach(e => {
                    const opt = document.createElement('option');
                    opt.value = e._id || e.id;
                    opt.textContent = e.razao_social;
                    empresaSelect.appendChild(opt);
                });
            }
        } catch (error) {
            console.error('Erro load empresas');
        }
    };
    loadEmpresas();

    btnGerarEmpresa.addEventListener('click', async () => {
        const id = empresaSelect.value;
        if (!id) return showToast({ message: 'Selecione uma empresa', type: 'warning' });

        const tipo = empresaTipo.value;
        const url = `/relatorios/empresa/${id}/${tipo}`;
        excelEmpresa.setAttribute('data-url', url);
        empresaContent.innerHTML = 'Carregando...';

        try {
            const data = await api.get(url);
            if (!data || data.length === 0) {
                empresaContent.innerHTML = '<p>Nenhum dado encontrado.</p>';
                return;
            }

            let html = '<table class="table"><thead><tr>';
            if (tipo === 'entregues') {
                html += '<th>Data Entrega</th><th>NE</th><th>Item</th><th>Qtd</th></tr></thead><tbody>';
                html += data.map(i => `<tr><td>${new Date(i.data_entrega).toLocaleDateString()}</td><td>${i.empenho?.numero || '-'}</td><td>${i.item?.descricao || '-'}</td><td>${i.quantidade}</td></tr>`).join('');
            } else {
                html += '<th>NE</th><th>Item</th><th>Qtd a Receber</th><th>Prazo</th></tr></thead><tbody>';
                html += data.map(i => `<tr><td>${i.empenho?.numero || '-'}</td><td>${i.item?.descricao || '-'}</td><td>${i.quantidade_restante}</td><td class="text-danger">${new Date(i.prazo_data).toLocaleDateString()}</td></tr>`).join('');
            }
            html += '</tbody></table>';
            empresaContent.innerHTML = html;

        } catch (error) {
            empresaContent.innerHTML = '<p class="text-danger">Erro ao carregar relatório.</p>';
        }
    });

    // Centro Consumidor
    const centroSelect = document.getElementById('centro-select');
    const centroTipo = document.getElementById('centro-tipo');
    const btnGerarCentro = document.getElementById('btn-gerar-centro');
    const centroContent = document.getElementById('relatorio-centro-content');
    const excelCentro = document.getElementById('btn-excel-centro');

    const loadCentros = async () => {
        try {
            const data = await api.get('/centros-consumidores');
            if (data) {
                data.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c._id || c.id;
                    opt.textContent = `${c.codigo} - ${c.nome}`;
                    centroSelect.appendChild(opt);
                });
            }
        } catch (error) {}
    };
    loadCentros();

    btnGerarCentro.addEventListener('click', async () => {
        const id = centroSelect.value;
        if (!id) return showToast({ message: 'Selecione um centro consumidor', type: 'warning' });

        const tipo = centroTipo.value;
        const url = `/relatorios/centro/${id}/${tipo}`;
        excelCentro.setAttribute('data-url', url);
        centroContent.innerHTML = 'Carregando...';

        try {
            const data = await api.get(url);
            if (!data || data.length === 0) {
                centroContent.innerHTML = '<p>Nenhum dado encontrado.</p>';
                return;
            }

            let html = '<table class="table"><thead><tr>';
            if (tipo === 'historico') {
                html += '<th>Data</th><th>Item</th><th>Qtd</th><th>Usuário</th></tr></thead><tbody>';
                html += data.map(i => `<tr><td>${new Date(i.data_dispensacao || i.createdAt).toLocaleString()}</td><td>${i.estoque?.descricao || '-'}</td><td>${i.quantidade}</td><td>${i.usuario?.nome || '-'}</td></tr>`).join('');
            } else {
                html += '<th>Item</th><th>Total Consumido</th></tr></thead><tbody>';
                html += data.map(i => `<tr><td>${i.descricao}</td><td>${i.total}</td></tr>`).join('');
            }
            html += '</tbody></table>';
            centroContent.innerHTML = html;

        } catch (error) {
            centroContent.innerHTML = '<p class="text-danger">Erro ao carregar relatório.</p>';
        }
    });

    // Rastreabilidade de Lote
    const loteSearchInput = document.getElementById('lote-search-input');
    const loteSituacaoSelect = document.getElementById('lote-situacao-select');
    const btnGerarLote = document.getElementById('btn-gerar-lote');
    const loteContent = document.getElementById('relatorio-lote-content');
    const excelLote = document.getElementById('btn-excel-lote');

    const gerarRelatorioLote = async () => {
        const q = loteSearchInput.value.trim();
        const situacao = loteSituacaoSelect.value;
        const url = `/relatorios/lote/rastreabilidade?q=${encodeURIComponent(q)}&situacao=${situacao}`;
        excelLote.setAttribute('data-url', url);

        loteContent.innerHTML = '<p class="text-center text-muted">Carregando...</p>';

        try {
            const data = await api.get(url);
            if (!data || data.length === 0) {
                loteContent.innerHTML = '<p class="text-center text-muted">Nenhum registro encontrado para este filtro.</p>';
                return;
            }

            let html = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Situação</th>
                            <th>Lote</th>
                            <th>Produto / Descrição</th>
                            <th>Cód. Siafísico / Compras</th>
                            <th>Quantidade</th>
                            <th>Validade</th>
                            <th>Localização / Destino</th>
                            <th>Data</th>
                            <th>Responsável</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            html += data.map(row => {
                const isEstoque = row.situacao === 'Em Estoque';
                const situacaoBadge = isEstoque 
                    ? '<span class="badge badge-success" style="font-size:0.85rem;"><i class="fas fa-box"></i> Em Estoque</span>'
                    : '<span class="badge badge-info" style="font-size:0.85rem;"><i class="fas fa-dolly"></i> Dispensado</span>';
                
                const loteBadge = row.lote 
                    ? `<span style="font-family:monospace; background:rgba(59,130,246,0.15); color:#60a5fa; padding:3px 8px; border-radius:4px; font-weight:600; font-size:0.9rem;">${row.lote}</span>` 
                    : '<span style="color:var(--text-muted);">-</span>';

                const codigos = [row.codigo_siafisico, row.codigo_compras].filter(Boolean).join(' / ') || '-';
                const dataFormatada = row.data_registro ? new Date(row.data_registro).toLocaleString('pt-BR') : '-';
                const dataValidade = row.validade ? new Date(row.validade).toLocaleDateString('pt-BR') : '-';

                return `
                    <tr>
                        <td>${situacaoBadge}</td>
                        <td>${loteBadge}</td>
                        <td><strong>${row.descricao}</strong></td>
                        <td>${codigos}</td>
                        <td><strong>${row.quantidade} ${row.unidade || ''}</strong></td>
                        <td>${dataValidade}</td>
                        <td><span style="font-weight:500;">${row.localizacao_destino}</span></td>
                        <td>${dataFormatada}</td>
                        <td>${row.operador || '-'}</td>
                    </tr>
                `;
            }).join('');

            html += '</tbody></table>';
            loteContent.innerHTML = html;
        } catch (error) {
            loteContent.innerHTML = '<p class="text-danger text-center">Erro ao carregar relatório de rastreabilidade de lote.</p>';
        }
    };

    btnGerarLote.addEventListener('click', gerarRelatorioLote);
    loteSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') gerarRelatorioLote();
    });

    // Auditoria de Estornos
    const estornosSearchInput = document.getElementById('estornos-search-input');
    const estornosMotivoSelect = document.getElementById('estornos-motivo-select');
    const btnGerarEstornos = document.getElementById('btn-gerar-estornos');
    const estornosContent = document.getElementById('relatorio-estornos-content');
    const excelEstornos = document.getElementById('btn-excel-estornos');

    const gerarRelatorioEstornos = async () => {
        const q = estornosSearchInput.value.trim();
        const motivo = estornosMotivoSelect.value;
        const url = `/relatorios/estornos/auditoria?q=${encodeURIComponent(q)}&tipo_motivo=${motivo}`;
        excelEstornos.setAttribute('data-url', url);

        estornosContent.innerHTML = '<p class="text-center text-muted"><i class="fas fa-spinner fa-spin"></i> Carregando auditoria de estornos...</p>';

        try {
            const data = await api.get(url);
            if (!data || data.length === 0) {
                estornosContent.innerHTML = '<p class="text-center text-muted">Nenhum registro de estorno encontrado para estes filtros.</p>';
                return;
            }

            let html = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Data/Hora</th>
                            <th>Responsável</th>
                            <th>Motivo</th>
                            <th>Material / Descrição</th>
                            <th>Lote</th>
                            <th>Qtd Estornada</th>
                            <th>Origem (NE / NF)</th>
                            <th>Fornecedor / Doador</th>
                            <th>Justificativa por Extenso</th>
                            <th style="text-align:center;">Guia</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            html += data.map(row => {
                const isDevolucao = row.tipo_motivo === 'devolucao_fornecedor';
                const motivoBadge = isDevolucao
                    ? '<span class="badge badge-danger" style="font-size:0.8rem;"><i class="fas fa-truck-loading"></i> Devolução ao Fornecedor</span>'
                    : '<span class="badge badge-warning" style="font-size:0.8rem;"><i class="fas fa-keyboard"></i> Erro de Digitação</span>';

                const loteBadge = row.lote
                    ? `<span style="font-family:monospace; background:rgba(59,130,246,0.15); color:#60a5fa; padding:2px 6px; border-radius:4px; font-weight:600; font-size:0.85rem;">${row.lote}</span>`
                    : '<span style="color:var(--text-muted);">-</span>';

                const dataFmt = row.data_estorno ? new Date(row.data_estorno).toLocaleString('pt-BR') : '-';
                
                const docOrigem = [
                    row.numero_empenho ? `NE ${row.numero_empenho}` : null,
                    row.nota_fiscal ? `NF ${row.nota_fiscal}` : null
                ].filter(Boolean).join(' • ') || '-';

                const token = getToken();
                const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
                const guiaBtn = row.tem_pdf
                    ? `<a href="/api/recebimentos/estornos/${row.id}/pdf${tokenParam}" target="_blank" class="btn btn-secondary btn-sm" title="Visualizar Guia de Devolução" style="padding:4px 8px;"><i class="fas fa-file-pdf" style="color:#ef4444;"></i> Guia</a>`
                    : '<span style="color:var(--text-muted);">-</span>';

                return `
                    <tr>
                        <td style="white-space:nowrap;">${dataFmt}</td>
                        <td><strong>${row.usuario_nome || '-'}</strong></td>
                        <td>${motivoBadge}</td>
                        <td><strong>${row.item_descricao || '-'}</strong></td>
                        <td>${loteBadge}</td>
                        <td><strong style="color:#ef4444;">${row.quantidade_estornada} ${row.unidade || ''}</strong></td>
                        <td style="font-size:0.85rem;">${docOrigem}</td>
                        <td style="font-size:0.85rem;">${row.fornecedor_doador || '-'}</td>
                        <td style="max-width:250px; font-size:0.85rem; word-break:break-word;">${row.justificativa || '-'}</td>
                        <td style="text-align:center;">${guiaBtn}</td>
                    </tr>
                `;
            }).join('');

            html += '</tbody></table>';
            estornosContent.innerHTML = html;
        } catch (error) {
            console.error('Erro ao carregar auditoria de estornos:', error);
            estornosContent.innerHTML = '<p class="text-danger text-center">Erro ao carregar relatório de auditoria de estornos.</p>';
        }
    };

    btnGerarEstornos.addEventListener('click', gerarRelatorioEstornos);
    estornosSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') gerarRelatorioEstornos();
    });

    // =========================================================================
    // SEÇÃO: CONSUMO FINANCEIRO (R$) — CHART.JS, EXCEL E PDF
    // =========================================================================

    const consumoDataInicio = document.getElementById('consumo-data-inicio');
    const consumoDataFim = document.getElementById('consumo-data-fim');
    const btnGerarConsumo = document.getElementById('btn-gerar-consumo');
    const btnExcelConsumo = document.getElementById('btn-excel-consumo');
    const btnPdfConsumo = document.getElementById('btn-pdf-consumo');
    const consumoTotalCard = document.getElementById('consumo-total-card');
    const consumoTotalValor = document.getElementById('consumo-total-valor');
    const consumoPeriodoBadge = document.getElementById('consumo-periodo-badge');
    const consumoSubtabBtns = document.querySelectorAll('.consumo-subtab-btn');

    const tableConsumoDivisaoWrapper = document.getElementById('table-consumo-divisao-wrapper');
    const tableConsumoCcWrapper = document.getElementById('table-consumo-cc-wrapper');
    const tableConsumoItemWrapper = document.getElementById('table-consumo-item-wrapper');
    const tableConsumoMensalWrapper = document.getElementById('table-consumo-mensal-wrapper');

    const modalExportPdf = document.getElementById('modal-export-pdf');
    const chkPdfGraficos = document.getElementById('chk-pdf-graficos');
    const chkPdfTabelas = document.getElementById('chk-pdf-tabelas');
    const btnPdfCancel = document.getElementById('btn-pdf-cancel');
    const btnPdfConfirm = document.getElementById('btn-pdf-confirm');

    // Inicializar datas padrão (Início do ano corrente até hoje)
    const dataAtual = new Date();
    const anoAtual = dataAtual.getFullYear();
    consumoDataInicio.value = `${anoAtual}-01-01`;
    consumoDataFim.value = dataAtual.toISOString().split('T')[0];

    // Variáveis de estado e instâncias do Chart.js
    let activeConsumoSubtab = 'subtab-divisao';
    let dadosConsumoCache = null;
    let chartDivisaoPizza = null;
    let chartDivisaoBarras = null;
    let chartCCBarras = null;
    let chartItemBarras = null;
    let chartMensalLinha = null;

    const chartColors = [
        '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
        '#84cc16', '#a855f7', '#64748b', '#e11d48', '#d97706'
    ];

    // Alternar sub-abas de consumo
    consumoSubtabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            consumoSubtabBtns.forEach(b => b.classList.replace('btn-primary', 'btn-secondary'));
            btn.classList.replace('btn-secondary', 'btn-primary');
            const targetId = btn.getAttribute('data-subtab');
            activeConsumoSubtab = targetId;
            document.querySelectorAll('.consumo-subtab-content').forEach(c => c.style.display = 'none');
            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.style.display = 'block';

            // Redesenhar gráficos ao trocar de aba caso já existam dados
            if (dadosConsumoCache) {
                renderizarGraficosAtuais();
            }
        });
    });

    const formatCurrency = (val) => {
        return (Number(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Função principal para carregar dados de consumo
    const carregarRelatorioConsumo = async () => {
        const ini = consumoDataInicio.value;
        const fim = consumoDataFim.value;

        btnGerarConsumo.disabled = true;
        btnGerarConsumo.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';

        try {
            const queryParams = new URLSearchParams();
            if (ini) queryParams.append('data_inicio', ini);
            if (fim) queryParams.append('data_fim', fim);

            const url = `/relatorios/consumo?${queryParams.toString()}`;
            const data = await api.get(url);
            dadosConsumoCache = data;

            // Atualiza Card de Total
            consumoTotalCard.style.display = 'flex';
            consumoTotalValor.textContent = formatCurrency(data.total_geral);
            const dtIniFmt = ini ? ini.split('-').reverse().join('/') : 'Início';
            const dtFimFmt = fim ? fim.split('-').reverse().join('/') : 'Hoje';
            consumoPeriodoBadge.textContent = `Período: ${dtIniFmt} até ${dtFimFmt}`;

            // Renderizar Tabelas
            renderizarTabelaDivisao(data.por_divisao, data.total_geral);
            renderizarTabelaCC(data.por_cc, data.total_geral);
            renderizarTabelaItem(data.por_item, data.total_geral);
            renderizarTabelaMensal(data.evolucao_mensal, data.total_geral);

            // Renderizar Gráficos
            renderizarGraficosAtuais();

            showToast({ message: 'Relatório de consumo gerado com sucesso!', type: 'success' });
        } catch (error) {
            console.error('Erro ao gerar relatório de consumo:', error);
            showToast({ message: 'Erro ao gerar relatório de consumo financeiro.', type: 'error' });
        } finally {
            btnGerarConsumo.disabled = false;
            btnGerarConsumo.innerHTML = '<i class="fas fa-search"></i> Gerar';
        }
    };

    // Renderizar Tabelas
    const renderizarTabelaDivisao = (divisoes, totalGeral) => {
        if (!divisoes || divisoes.length === 0) {
            tableConsumoDivisaoWrapper.innerHTML = '<p class="text-center text-muted p-3">Nenhuma dispensação para divisões no período.</p>';
            return;
        }
        let html = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Divisão Organizacional</th>
                        <th style="text-align: right;">Valor Total (R$)</th>
                        <th style="text-align: right;">% do Total</th>
                    </tr>
                </thead>
                <tbody>
        `;
        divisoes.forEach(d => {
            html += `
                <tr>
                    <td><strong>${d.nome}</strong></td>
                    <td style="text-align: right; color: #10b981; font-weight: 600;">${formatCurrency(d.valor_total)}</td>
                    <td style="text-align: right;">${d.percentual.toFixed(2)}%</td>
                </tr>
            `;
        });
        html += `
                </tbody>
                <tfoot>
                    <tr style="background: rgba(255,255,255,0.06); font-weight: bold;">
                        <td>TOTAL GERAL</td>
                        <td style="text-align: right; color: #10b981; font-size: 1.05rem;">${formatCurrency(totalGeral)}</td>
                        <td style="text-align: right;">100,00%</td>
                    </tr>
                </tfoot>
            </table>
        `;
        tableConsumoDivisaoWrapper.innerHTML = html;
    };

    const renderizarTabelaCC = (ccs, totalGeral) => {
        if (!ccs || ccs.length === 0) {
            tableConsumoCcWrapper.innerHTML = '<p class="text-center text-muted p-3">Nenhuma dispensação para centros consumidores no período.</p>';
            return;
        }
        let html = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Centro Consumidor</th>
                        <th>Divisão Vinculada</th>
                        <th style="text-align: right;">Valor Total (R$)</th>
                        <th style="text-align: right;">% do Total</th>
                    </tr>
                </thead>
                <tbody>
        `;
        ccs.forEach(c => {
            html += `
                <tr>
                    <td><strong>${c.nome}</strong></td>
                    <td><span class="badge badge-info" style="font-size:0.8rem;">${c.divisao_nome}</span></td>
                    <td style="text-align: right; color: #10b981; font-weight: 600;">${formatCurrency(c.valor_total)}</td>
                    <td style="text-align: right;">${c.percentual.toFixed(2)}%</td>
                </tr>
            `;
        });
        html += `
                </tbody>
                <tfoot>
                    <tr style="background: rgba(255,255,255,0.06); font-weight: bold;">
                        <td colspan="2">TOTAL GERAL</td>
                        <td style="text-align: right; color: #10b981; font-size: 1.05rem;">${formatCurrency(totalGeral)}</td>
                        <td style="text-align: right;">100,00%</td>
                    </tr>
                </tfoot>
            </table>
        `;
        tableConsumoCcWrapper.innerHTML = html;
    };

    const renderizarTabelaItem = (itens, totalGeral) => {
        if (!itens || itens.length === 0) {
            tableConsumoItemWrapper.innerHTML = '<p class="text-center text-muted p-3">Nenhum item consumido no período.</p>';
            return;
        }
        let html = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Descrição do Item</th>
                        <th style="text-align: center;">Qtd Dispensada</th>
                        <th>Menor Unidade</th>
                        <th style="text-align: right;">Valor Total (R$)</th>
                    </tr>
                </thead>
                <tbody>
        `;
        itens.forEach(it => {
            html += `
                <tr>
                    <td><strong>${it.descricao}</strong></td>
                    <td style="text-align: center;"><span class="badge badge-secondary">${it.quantidade}</span></td>
                    <td>${it.unidade || '-'}</td>
                    <td style="text-align: right; color: #10b981; font-weight: 600;">${formatCurrency(it.valor_total)}</td>
                </tr>
            `;
        });
        html += `
                </tbody>
                <tfoot>
                    <tr style="background: rgba(255,255,255,0.06); font-weight: bold;">
                        <td colspan="3">TOTAL GERAL</td>
                        <td style="text-align: right; color: #10b981; font-size: 1.05rem;">${formatCurrency(totalGeral)}</td>
                    </tr>
                </tfoot>
            </table>
        `;
        tableConsumoItemWrapper.innerHTML = html;
    };

    const renderizarTabelaMensal = (meses, totalGeral) => {
        if (!meses || meses.length === 0) {
            tableConsumoMensalWrapper.innerHTML = '<p class="text-center text-muted p-3">Nenhum dado mensal no período.</p>';
            return;
        }
        let html = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Mês / Ano</th>
                        <th style="text-align: right;">Valor Total Consumido (R$)</th>
                    </tr>
                </thead>
                <tbody>
        `;
        meses.forEach(m => {
            html += `
                <tr>
                    <td><strong>${m.mes_formatado}</strong></td>
                    <td style="text-align: right; color: #10b981; font-weight: 600;">${formatCurrency(m.valor_total)}</td>
                </tr>
            `;
        });
        html += `
                </tbody>
                <tfoot>
                    <tr style="background: rgba(255,255,255,0.06); font-weight: bold;">
                        <td>TOTAL GERAL</td>
                        <td style="text-align: right; color: #10b981; font-size: 1.05rem;">${formatCurrency(totalGeral)}</td>
                    </tr>
                </tfoot>
            </table>
        `;
        tableConsumoMensalWrapper.innerHTML = html;
    };

    // Renderizar Gráficos com Chart.js
    const renderizarGraficosAtuais = () => {
        if (!dadosConsumoCache || !window.Chart) return;

        Chart.defaults.color = '#94a3b8';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';

        if (activeConsumoSubtab === 'subtab-divisao') {
            renderizarGraficosDivisao();
        } else if (activeConsumoSubtab === 'subtab-cc') {
            renderizarGraficoCC();
        } else if (activeConsumoSubtab === 'subtab-item') {
            renderizarGraficoItem();
        } else if (activeConsumoSubtab === 'subtab-mensal') {
            renderizarGraficoMensal();
        }
    };

    const renderizarGraficosDivisao = () => {
        const divisoes = dadosConsumoCache.por_divisao || [];
        const labels = divisoes.map(d => d.nome);
        const dataVals = divisoes.map(d => d.valor_total);

        // 1. Gráfico Pizza
        const ctxPizza = document.getElementById('chart-divisao-pizza');
        if (ctxPizza) {
            if (chartDivisaoPizza) chartDivisaoPizza.destroy();
            chartDivisaoPizza = new Chart(ctxPizza, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data: dataVals,
                        backgroundColor: chartColors.slice(0, labels.length),
                        borderWidth: 2,
                        borderColor: '#0f172a'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
                        tooltip: {
                            callbacks: {
                                label: (context) => ` ${context.label}: ${formatCurrency(context.raw)}`
                            }
                        }
                    }
                }
            });
        }

        // 2. Gráfico Barras
        const ctxBarras = document.getElementById('chart-divisao-barras');
        if (ctxBarras) {
            if (chartDivisaoBarras) chartDivisaoBarras.destroy();
            chartDivisaoBarras = new Chart(ctxBarras, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Gasto por Divisão (R$)',
                        data: dataVals,
                        backgroundColor: '#6366f1',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => ` Total: ${formatCurrency(context.raw)}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            ticks: {
                                callback: (val) => 'R$ ' + Number(val).toLocaleString('pt-BR')
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45,
                                minRotation: 0,
                                font: { size: 10 }
                            }
                        }
                    }
                }
            });
        }
    };

    const renderizarGraficoCC = () => {
        const ccs = dadosConsumoCache.por_cc || [];
        const top10 = ccs.slice(0, 10);
        const labels = top10.map(c => c.nome);
        const dataVals = top10.map(c => c.valor_total);

        const ctx = document.getElementById('chart-cc-barras');
        if (ctx) {
            if (chartCCBarras) chartCCBarras.destroy();
            chartCCBarras = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Gasto do Centro Consumidor (R$)',
                        data: dataVals,
                        backgroundColor: '#10b981',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => ` Total: ${formatCurrency(context.raw)}`
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                callback: (val) => 'R$ ' + Number(val).toLocaleString('pt-BR')
                            }
                        }
                    }
                }
            });
        }
    };

    const renderizarGraficoItem = () => {
        const itens = dadosConsumoCache.por_item || [];
        const top10 = itens.slice(0, 10);
        const labels = top10.map(i => i.descricao.length > 25 ? i.descricao.slice(0, 25) + '...' : i.descricao);
        const dataVals = top10.map(i => i.valor_total);

        const ctx = document.getElementById('chart-item-barras');
        if (ctx) {
            if (chartItemBarras) chartItemBarras.destroy();
            chartItemBarras = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Consumo do Item (R$)',
                        data: dataVals,
                        backgroundColor: '#f59e0b',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => ` Total: ${formatCurrency(context.raw)}`
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                callback: (val) => 'R$ ' + Number(val).toLocaleString('pt-BR')
                            }
                        }
                    }
                }
            });
        }
    };

    // Evolução Mensal com Seletor Dinâmico de Séries
    const seriesSelectorBox = document.getElementById('mensal-series-selector');
    const seriesCheckboxes = document.getElementById('mensal-series-checkboxes');
    const radioSeries = document.querySelectorAll('input[name="mensal-tipo-serie"]');

    radioSeries.forEach(r => {
        r.addEventListener('change', () => {
            configurarSeletorSeries();
            renderizarGraficoMensal();
        });
    });

    const configurarSeletorSeries = () => {
        if (!dadosConsumoCache) return;
        const tipo = document.querySelector('input[name="mensal-tipo-serie"]:checked').value;
        if (tipo === 'total') {
            seriesSelectorBox.style.display = 'none';
            seriesCheckboxes.innerHTML = '';
            return;
        }

        seriesSelectorBox.style.display = 'block';
        const lista = tipo === 'divisao' ? dadosConsumoCache.evolucao_divisoes : dadosConsumoCache.evolucao_ccs;

        let html = '';
        lista.forEach((item, idx) => {
            const isChecked = idx < 3 ? 'checked' : '';
            html += `
                <label style="display:inline-flex; align-items:center; gap:0.4rem; background:rgba(255,255,255,0.05); padding:4px 10px; border-radius:6px; font-size:0.85rem; cursor:pointer;">
                    <input type="checkbox" class="serie-checkbox" value="${item.id}" ${isChecked} style="accent-color:var(--accent-primary);">
                    <span>${item.nome}</span>
                </label>
            `;
        });
        seriesCheckboxes.innerHTML = html;

        // Monitorar limite máximo de 5 seleções simultâneas
        seriesCheckboxes.querySelectorAll('.serie-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                const checkedCount = seriesCheckboxes.querySelectorAll('.serie-checkbox:checked').length;
                if (checkedCount > 5) {
                    cb.checked = false;
                    showToast({ message: 'Selecione no máximo 5 itens para comparação.', type: 'warning' });
                    return;
                }
                renderizarGraficoMensal();
            });
        });
    };

    const renderizarGraficoMensal = () => {
        if (!dadosConsumoCache) return;
        const ctx = document.getElementById('chart-mensal-linha');
        if (!ctx) return;

        const mesesLabels = dadosConsumoCache.meses || [];
        const tipo = document.querySelector('input[name="mensal-tipo-serie"]:checked').value;
        const datasets = [];

        if (tipo === 'total') {
            const dataVals = (dadosConsumoCache.evolucao_mensal || []).map(m => m.valor_total);
            datasets.push({
                label: 'Gasto Total Mensal (R$)',
                data: dataVals,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                fill: true,
                tension: 0.3,
                pointRadius: 5
            });
        } else {
            const lista = tipo === 'divisao' ? dadosConsumoCache.evolucao_divisoes : dadosConsumoCache.evolucao_ccs;
            const checkedIds = Array.from(seriesCheckboxes.querySelectorAll('.serie-checkbox:checked')).map(cb => String(cb.value));

            let colorIdx = 0;
            lista.forEach(item => {
                if (checkedIds.includes(String(item.id))) {
                    const cor = chartColors[colorIdx % chartColors.length];
                    colorIdx++;
                    datasets.push({
                        label: item.nome,
                        data: item.valores,
                        borderColor: cor,
                        backgroundColor: 'transparent',
                        tension: 0.3,
                        pointRadius: 4,
                        borderWidth: 2
                    });
                }
            });
        }

        if (chartMensalLinha) chartMensalLinha.destroy();
        chartMensalLinha = new Chart(ctx, {
            type: 'line',
            data: {
                labels: mesesLabels,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, padding: 10, font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => ` ${context.dataset.label}: ${formatCurrency(context.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (val) => 'R$ ' + Number(val).toLocaleString('pt-BR')
                        }
                    }
                }
            }
        });
    };

    // Botão Gerar Relatório
    btnGerarConsumo.addEventListener('click', carregarRelatorioConsumo);

    // Botão Exportar Excel
    btnExcelConsumo.addEventListener('click', () => {
        const ini = consumoDataInicio.value;
        const fim = consumoDataFim.value;
        const queryParams = new URLSearchParams();
        if (ini) queryParams.append('data_inicio', ini);
        if (fim) queryParams.append('data_fim', fim);

        const url = `/relatorios/consumo/export/excel?${queryParams.toString()}`;
        api.get(url).catch(err => {
            showToast({ message: 'Erro ao exportar Excel.', type: 'error' });
        });
    });

    // =========================================================================
    // EXPORTAÇÃO PDF (HTML2CANVAS + JSPDF)
    // =========================================================================

    const atualizarEstadoBtnPdf = () => {
        const algumMarcado = chkPdfGraficos.checked || chkPdfTabelas.checked;
        btnPdfConfirm.disabled = !algumMarcado;
        if (!algumMarcado) {
            btnPdfConfirm.style.opacity = '0.5';
            btnPdfConfirm.style.cursor = 'not-allowed';
        } else {
            btnPdfConfirm.style.opacity = '1';
            btnPdfConfirm.style.cursor = 'pointer';
        }
    };

    chkPdfGraficos.addEventListener('change', atualizarEstadoBtnPdf);
    chkPdfTabelas.addEventListener('change', atualizarEstadoBtnPdf);

    btnPdfConsumo.addEventListener('click', () => {
        if (!dadosConsumoCache) {
            showToast({ message: 'Gere o relatório antes de exportar o PDF.', type: 'warning' });
            return;
        }
        modalExportPdf.style.display = 'flex';
        modalExportPdf.classList.add('active');
        atualizarEstadoBtnPdf();
    });

    const fecharModalPdf = () => {
        modalExportPdf.style.display = 'none';
        modalExportPdf.classList.remove('active');
    };

    btnPdfCancel.addEventListener('click', fecharModalPdf);
    modalExportPdf.addEventListener('click', (e) => {
        if (e.target === modalExportPdf) fecharModalPdf();
    });

    btnPdfConfirm.addEventListener('click', async () => {
        const incluirGraficos = chkPdfGraficos.checked;
        const incluirTabelas = chkPdfTabelas.checked;

        if (!incluirGraficos && !incluirTabelas) return;

        fecharModalPdf();
        showToast({ message: 'Gerando PDF... Aguarde um momento.', type: 'info', duration: 3000 });

        try {
            if (!window.jspdf || !window.html2canvas) {
                throw new Error('Bibliotecas de PDF ainda não foram carregadas pelo navegador.');
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const subtabEl = document.getElementById(activeConsumoSubtab);
            const chartsEl = subtabEl ? subtabEl.querySelector('.consumo-charts-container') : null;
            const tableEl = subtabEl ? subtabEl.querySelector('.consumo-table-container') : null;

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Cabeçalho institucional do documento
            const renderCabecalhoPdf = (tituloAba) => {
                doc.setFillColor(15, 23, 42); // #0f172a
                doc.rect(0, 0, pageWidth, 24, 'F');
                
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.text('SIGA-ILSL — Sistema Integrado de Gestão de Almoxarifado', 14, 10);
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(148, 163, 184); // #94a3b8
                const iniFmt = consumoDataInicio.value ? consumoDataInicio.value.split('-').reverse().join('/') : 'Início';
                const fimFmt = consumoDataFim.value ? consumoDataFim.value.split('-').reverse().join('/') : 'Hoje';
                doc.text(`Relatório de Consumo Financeiro — ${tituloAba} | Período: ${iniFmt} a ${fimFmt}`, 14, 16);
                doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 14, 16, { align: 'right' });
            };

            const nomeSubtabMap = {
                'subtab-divisao': 'Por Divisão',
                'subtab-cc': 'Por Centro Consumidor',
                'subtab-item': 'Por Item',
                'subtab-mensal': 'Evolução Mensal'
            };
            const nomeAbaAtiva = nomeSubtabMap[activeConsumoSubtab] || 'Consumo';

            let yOffset = 30;

            // 1. Capturar e incluir gráficos
            if (incluirGraficos && chartsEl) {
                renderCabecalhoPdf(nomeAbaAtiva);

                const canvasGraficos = await window.html2canvas(chartsEl, {
                    scale: 2,
                    backgroundColor: '#0f172a',
                    useCORS: true
                });

                const imgGraficosData = canvasGraficos.toDataURL('image/png');
                const imgWidth = pageWidth - 28;
                const imgHeight = (canvasGraficos.height * imgWidth) / canvasGraficos.width;
                const maxHeight = pageHeight - yOffset - 15;

                const finalHeight = Math.min(imgHeight, maxHeight);
                doc.addImage(imgGraficosData, 'PNG', 14, yOffset, imgWidth, finalHeight);

                if (incluirTabelas && tableEl) {
                    doc.addPage();
                    yOffset = 30;
                }
            }

            // 2. Capturar e incluir tabelas
            if (incluirTabelas && tableEl) {
                renderCabecalhoPdf(nomeAbaAtiva + (incluirGraficos ? ' (Tabelas)' : ''));

                const canvasTabela = await window.html2canvas(tableEl, {
                    scale: 2,
                    backgroundColor: '#0f172a',
                    useCORS: true
                });

                const imgTabelaData = canvasTabela.toDataURL('image/png');
                const imgWidth = pageWidth - 28;
                const imgHeight = (canvasTabela.height * imgWidth) / canvasTabela.width;
                const maxHeight = pageHeight - yOffset - 15;

                const finalHeight = Math.min(imgHeight, maxHeight);
                doc.addImage(imgTabelaData, 'PNG', 14, yOffset, imgWidth, finalHeight);
            }

            doc.save(`relatorio_consumo_ilsl_${Date.now()}.pdf`);
            showToast({ message: 'PDF exportado com sucesso!', type: 'success' });
        } catch (err) {
            console.error('Erro ao gerar PDF:', err);
            showToast({ message: 'Erro ao gerar o arquivo PDF: ' + err.message, type: 'error' });
        }
    });
}
