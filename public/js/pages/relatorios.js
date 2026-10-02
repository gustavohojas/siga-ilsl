import { api } from '../api.js';
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

                const guiaBtn = row.tem_pdf
                    ? `<a href="/api/recebimentos/estornos/${row.id}/pdf" target="_blank" class="btn btn-secondary btn-sm" title="Visualizar Guia de Devolução" style="padding:4px 8px;"><i class="fas fa-file-pdf" style="color:#ef4444;"></i> Guia</a>`
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
}
