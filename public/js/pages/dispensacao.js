import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { playSuccessBeep, playAlertBeep } from '../utils/audio.js';

export async function renderDispensacao(container) {
    container.innerHTML = `
        <div class="animate-fadeIn">
            <h2 class="mb-4">Dispensação de Materiais no Balcão</h2>

            <!-- CARD PRINCIPAL: BALCÃO / CESTA DE DISPENSAÇÃO -->
            <div class="card mb-4" style="border-top: 4px solid var(--primary, #3b82f6);">
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
                    <h3 style="margin:0;"><i class="fas fa-cash-register"></i> Nova Remessa de Entrega</h3>
                    <span class="badge badge-info" style="font-size:0.85rem;"><i class="fas fa-barcode"></i> Modo Leitor Ativo</span>
                </div>
                <div class="card-body">
                    <!-- SETOR E OBSERVAÇÃO -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="form-group mb-0">
                            <label class="form-label" for="disp-centro"><strong>Centro Consumidor de Destino *</strong></label>
                            <select id="disp-centro" class="form-control" required style="font-size: 1rem;">
                                <option value="">Selecione o setor solicitante...</option>
                            </select>
                        </div>
                        <div class="form-group mb-0">
                            <label class="form-label" for="disp-obs">Observações / Motivo (Opcional)</label>
                            <input type="text" id="disp-obs" class="form-control" placeholder="Ex: Reposição de carrinho, Leito 04, Urgência...">
                        </div>
                    </div>

                    <!-- LEITURA DE CÓDIGO DE BARRAS & BUSCA MANUAL -->
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); padding: 1.25rem; border-radius: 8px; margin-bottom: 1.5rem;">
                        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 1rem; align-items: end;">
                            <div class="form-group mb-0">
                                <label class="form-label" for="barcode-scanner" style="color: var(--primary, #60a5fa); font-weight: 600;">
                                    <i class="fas fa-barcode"></i> Aproxime o Leitor de Código de Barras:
                                </label>
                                <input type="text" id="barcode-scanner" class="form-control" placeholder="Bipe o código de barras da embalagem..." autofocus autocomplete="off" style="font-size: 1.05rem; border-color: var(--primary, #3b82f6);">
                            </div>
                            <div class="form-group mb-0">
                                <label class="form-label" for="manual-search">Ou busque manualmente (sem cód. barras):</label>
                                <div style="display:flex; gap:0.5rem;">
                                    <input type="text" id="manual-search" class="form-control" placeholder="Descrição ou Cód. Siafísico...">
                                    <button class="btn btn-secondary" id="btn-manual-search" type="button"><i class="fas fa-search"></i></button>
                                </div>
                            </div>
                        </div>

                        <!-- Mini tabela de resultados da busca manual (se acionada) -->
                        <div id="manual-results-wrapper" style="display:none; margin-top: 1rem; max-height: 220px; overflow-y: auto; border: 1px solid var(--border-glass); border-radius: 6px;">
                            <table class="table table-sm" id="table-manual-results" style="margin-bottom:0; font-size:0.88rem;">
                                <thead>
                                    <tr>
                                        <th>Descrição</th>
                                        <th>Lote</th>
                                        <th>Validade</th>
                                        <th>Saldo</th>
                                        <th>Ação</th>
                                    </tr>
                                </thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>

                    <!-- CESTA DE ITENS A DISPENSAR -->
                    <h4 style="margin-bottom: 0.75rem; display:flex; align-items:center; justify-content:space-between;">
                        <span><i class="fas fa-shopping-basket"></i> Itens da Dispensação</span>
                        <span id="cesta-contador" class="badge badge-secondary" style="font-size:0.8rem;">0 itens</span>
                    </h4>

                    <div style="overflow-x: auto; margin-bottom: 1.5rem;">
                        <table class="table" id="table-cesta">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Material / Descrição</th>
                                    <th>Lote</th>
                                    <th>Validade</th>
                                    <th title="Informe a unidade em que o produto será dispensado aos centros consumidores">Disponível (Menor un.)</th>
                                    <th style="width: 160px; text-align:center;">Qtd a Dispensar</th>
                                    <th style="width: 60px;">Remover</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr id="cesta-vazia-row">
                                    <td colspan="7" class="text-center text-muted" style="padding: 2rem;">
                                        <i class="fas fa-barcode" style="font-size: 2rem; opacity: 0.3; display:block; margin-bottom:0.5rem;"></i>
                                        Nenhum material na cesta. Aproxime o leitor de código de barras ou use a busca manual.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 1rem; align-items: center; border-top: 1px solid var(--border-glass); padding-top: 1rem;">
                        <button type="button" class="btn btn-secondary" id="btn-limpar-cesta">Limpar Cesta</button>
                        <button type="button" class="btn btn-success" id="btn-finalizar-cesta" style="padding: 0.6rem 1.5rem; font-size: 1rem; font-weight: 600;">
                            <i class="fas fa-check-circle"></i> Concluir Dispensação e Gerar Ficha (PDF)
                        </button>
                    </div>
                </div>
            </div>

            <!-- HISTÓRICO DE DISPENSAÇÕES RECENTES -->
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3><i class="fas fa-history"></i> Histórico de Dispensações</h3>
                    <button class="btn btn-secondary btn-sm" id="btn-refresh-recent"><i class="fas fa-sync-alt"></i> Atualizar</button>
                </div>
                <div class="card-body">
                    <table class="table" id="table-recent">
                        <thead>
                            <tr>
                                <th>Guia / Protocolo</th>
                                <th>Data/Hora</th>
                                <th>Item Dispensado</th>
                                <th>Lote</th>
                                <th>Qtd</th>
                                <th>Centro Consumidor</th>
                                <th>Responsável</th>
                                <th style="text-align:center;">Ficha (PDF)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="8" class="text-center">Carregando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- MODAL NEUTRO DE ESCOLHA DE LOTE -->
        <div id="modal-lotes" class="modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 200; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: var(--bg-card); padding: 2rem; border-radius: 8px; width: 90%; max-width: 650px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <h3 style="margin-bottom: 0.5rem;"><i class="fas fa-boxes"></i> Selecione o Lote do Produto</h3>
                <p id="modal-lote-desc" style="color: var(--text-muted); margin-bottom: 1.25rem; font-size: 0.95rem;"></p>
                <div class="alert alert-warning" style="margin-bottom: 1rem; font-size: 0.85rem; padding: 0.6rem 1rem; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); border-radius: 6px; color: #fbbf24;">
                    <i class="fas fa-info-circle"></i> Confira a embalagem física que você tem em mãos e clique no lote correspondente:
                </div>
                <div style="max-height: 280px; overflow-y: auto; border: 1px solid var(--border-glass); border-radius: 6px; margin-bottom: 1.5rem;">
                    <table class="table table-sm" id="table-escolha-lote" style="margin-bottom: 0;">
                        <thead>
                            <tr>
                                <th>Lote</th>
                                <th>Validade</th>
                                <th>Saldo Disponível</th>
                                <th style="text-align: right;">Ação</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
                <div style="display: flex; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" id="btn-fechar-modal-lote">Cancelar</button>
                </div>
            </div>
        </div>

        <!-- MODAL DE SUCESSO COM LINK DO PDF -->
        <div id="modal-sucesso" class="modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 200; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: var(--bg-card); padding: 2.5rem; border-radius: 10px; width: 90%; max-width: 520px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <div style="width: 60px; height: 60px; background: rgba(16,185,129,0.15); color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin: 0 auto 1rem;">
                    <i class="fas fa-check"></i>
                </div>
                <h3 style="margin-bottom: 0.5rem; color: #10b981;">Dispensação Concluída com Sucesso!</h3>
                <p id="modal-sucesso-codigo" style="font-weight: bold; font-size: 1.1rem; color: var(--text-main); margin-bottom: 1.5rem;"></p>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <a id="btn-abrir-pdf-sucesso" href="#" target="_blank" class="btn btn-primary" style="padding: 0.8rem; font-size: 1.05rem;">
                        <i class="fas fa-file-pdf"></i> Abrir / Imprimir Ficha de Dispensação (PDF)
                    </a>
                    <button type="button" class="btn btn-secondary" id="btn-nova-dispensacao">
                        <i class="fas fa-plus"></i> Realizar Nova Dispensação
                    </button>
                </div>
            </div>
        </div>
    `;

    // Elementos da página
    const selectCentro = document.getElementById('disp-centro');
    const inputObs = document.getElementById('disp-obs');
    const barcodeInput = document.getElementById('barcode-scanner');
    const manualSearchInput = document.getElementById('manual-search');
    const btnManualSearch = document.getElementById('btn-manual-search');
    const manualResultsWrapper = document.getElementById('manual-results-wrapper');
    const tableManualResults = document.querySelector('#table-manual-results tbody');

    const tableCestaBody = document.querySelector('#table-cesta tbody');
    const cestaContador = document.getElementById('cesta-contador');
    const btnLimparCesta = document.getElementById('btn-limpar-cesta');
    const btnFinalizarCesta = document.getElementById('btn-finalizar-cesta');

    const tableRecent = document.querySelector('#table-recent tbody');
    const btnRefreshRecent = document.getElementById('btn-refresh-recent');

    // Modais
    const modalLotes = document.getElementById('modal-lotes');
    const modalLoteDesc = document.getElementById('modal-lote-desc');
    const tableEscolhaLote = document.querySelector('#table-escolha-lote tbody');
    const btnFecharModalLote = document.getElementById('btn-fechar-modal-lote');

    const modalSucesso = document.getElementById('modal-sucesso');
    const modalSucessoCodigo = document.getElementById('modal-sucesso-codigo');
    const btnAbrirPdfSucesso = document.getElementById('btn-abrir-pdf-sucesso');
    const btnNovaDispensacao = document.getElementById('btn-nova-dispensacao');

    // Cesta de materiais em memória
    // Estrutura do item na cesta: { estoque_id, descricao, codigo_siafisico, codigo_compras, lote, validade, unidade, saldo_disponivel, quantidade }
    let cesta = [];

    // Foco permanente no leitor
    const focarLeitor = () => {
        setTimeout(() => {
            if (document.activeElement !== manualSearchInput && document.activeElement !== inputObs && document.activeElement !== selectCentro) {
                barcodeInput.focus();
            }
        }, 100);
    };

    // Carregar Centros Consumidores e Divisões agrupados
    const loadCentros = async () => {
        try {
            const tree = await api.get('/centros-consumidores?agrupado=true');
            selectCentro.innerHTML = '<option value="">Selecione o setor solicitante...</option>';
            if (Array.isArray(tree)) {
                tree.forEach(div => {
                    // Divisão selecionável diretamente
                    const optDiv = document.createElement('option');
                    optDiv.value = div.id;
                    optDiv.textContent = `── ${div.nome} (divisão)`;
                    optDiv.style.fontWeight = 'bold';
                    optDiv.style.background = 'rgba(59, 130, 246, 0.15)';
                    selectCentro.appendChild(optDiv);

                    // Centros Consumidores vinculados
                    if (div.centros && div.centros.length > 0) {
                        div.centros.forEach((cc, idx) => {
                            const isLast = idx === div.centros.length - 1;
                            const prefix = isLast ? '   └── ' : '   ├── ';
                            const optCc = document.createElement('option');
                            optCc.value = cc.id;
                            optCc.textContent = `${prefix}${cc.nome}`;
                            selectCentro.appendChild(optCc);
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Erro ao carregar setores:', error);
            selectCentro.innerHTML = '<option value="">Erro ao carregar setores</option>';
        }
    };

    // Renderizar tabela da Cesta
    const renderCesta = () => {
        if (cesta.length === 0) {
            tableCestaBody.innerHTML = `
                <tr id="cesta-vazia-row">
                    <td colspan="7" class="text-center text-muted" style="padding: 2rem;">
                        <i class="fas fa-barcode" style="font-size: 2rem; opacity: 0.3; display:block; margin-bottom:0.5rem;"></i>
                        Nenhum material na cesta. Aproxime o leitor de código de barras ou use a busca manual.
                    </td>
                </tr>
            `;
            cestaContador.textContent = '0 itens';
            return;
        }

        cestaContador.textContent = `${cesta.length} ${cesta.length === 1 ? 'item' : 'itens'}`;

        tableCestaBody.innerHTML = cesta.map((item, idx) => {
            const loteBadge = item.lote 
                ? `<span style="font-family:monospace; background:rgba(59,130,246,0.15); color:#60a5fa; padding:2px 6px; border-radius:4px; font-weight:600;">${item.lote}</span>` 
                : '<span style="color:var(--text-muted);">-</span>';

            let valFormatada = '-';
            if (item.validade) {
                try {
                    const [ano, mes, dia] = item.validade.split('T')[0].split('-');
                    valFormatada = `${dia}/${mes}/${ano}`;
                } catch (e) {
                    valFormatada = item.validade;
                }
            }

            return `
                <tr>
                    <td><strong>${idx + 1}</strong></td>
                    <td>
                        <strong>${item.descricao}</strong>
                        <div style="font-size:0.8rem; color:var(--text-muted);">
                            ${[item.codigo_siafisico, item.codigo_compras].filter(Boolean).join(' / ') || ''}
                        </div>
                    </td>
                    <td>${loteBadge}</td>
                    <td>${valFormatada}</td>
                    <td><span class="badge badge-secondary" title="Menor un. de dispensação: ${item.unidade || ''}">${item.saldo_disponivel} ${item.unidade || ''}</span></td>
                    <td style="text-align:center;">
                        <div style="display:inline-flex; align-items:center; gap:4px;">
                            <button type="button" class="btn btn-secondary btn-sm btn-qtd-dim" data-idx="${idx}" style="padding:2px 8px;">-</button>
                            <input type="number" class="form-control basket-qty" data-idx="${idx}" value="${item.quantidade}" min="1" max="${item.saldo_disponivel}" style="width:75px; text-align:center; padding:4px;">
                            <button type="button" class="btn btn-secondary btn-sm btn-qtd-aum" data-idx="${idx}" style="padding:2px 8px;">+</button>
                        </div>
                    </td>
                    <td>
                        <button type="button" class="btn btn-danger btn-sm btn-remover-item" data-idx="${idx}" title="Remover da cesta">
                            &times;
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Eventos de alteração de quantidade na cesta
        tableCestaBody.querySelectorAll('.btn-qtd-dim').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
                if (cesta[idx].quantidade > 1) {
                    cesta[idx].quantidade -= 1;
                    renderCesta();
                }
            });
        });

        tableCestaBody.querySelectorAll('.btn-qtd-aum').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
                if (cesta[idx].quantidade < cesta[idx].saldo_disponivel) {
                    cesta[idx].quantidade += 1;
                    playSuccessBeep();
                    renderCesta();
                } else {
                    playAlertBeep();
                    showToast({ message: `Saldo máximo deste lote atingido (${cesta[idx].saldo_disponivel}).`, type: 'warning' });
                }
            });
        });

        tableCestaBody.querySelectorAll('.basket-qty').forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
                let val = parseFloat(e.currentTarget.value);
                if (isNaN(val) || val <= 0) val = 1;
                if (val > cesta[idx].saldo_disponivel) {
                    playAlertBeep();
                    showToast({ message: `Quantidade solicitada (${val}) excede o saldo (${cesta[idx].saldo_disponivel}).`, type: 'warning' });
                    val = cesta[idx].saldo_disponivel;
                }
                cesta[idx].quantidade = val;
                renderCesta();
            });
        });

        tableCestaBody.querySelectorAll('.btn-remover-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
                cesta.splice(idx, 1);
                renderCesta();
                focarLeitor();
            });
        });
    };

    // Adicionar item de estoque na Cesta
    const adicionarItemNaCesta = (itemEstoque) => {
        const estoqueId = itemEstoque.id;
        const saldoMax = parseFloat(itemEstoque.quantidade_atual);

        // Se já está na cesta, incrementa +1 se houver saldo
        const itemExistente = cesta.find(it => it.estoque_id === estoqueId);
        if (itemExistente) {
            if (itemExistente.quantidade + 1 <= saldoMax) {
                itemExistente.quantidade += 1;
                playSuccessBeep();
                showToast({ message: `+1 un adicionada a "${itemEstoque.descricao}" (Total: ${itemExistente.quantidade})`, type: 'info' });
                renderCesta();
            } else {
                playAlertBeep();
                showToast({ message: `Saldo insuficiente para "${itemEstoque.descricao}". Estoque máximo disponível: ${saldoMax}.`, type: 'warning' });
            }
        } else {
            // Novo item na cesta
            cesta.push({
                estoque_id: estoqueId,
                descricao: itemEstoque.descricao,
                codigo_siafisico: itemEstoque.codigo_siafisico,
                codigo_compras: itemEstoque.codigo_compras,
                lote: itemEstoque.lote,
                validade: itemEstoque.validade,
                unidade: itemEstoque.unidade,
                saldo_disponivel: saldoMax,
                quantidade: 1
            });
            playSuccessBeep();
            showToast({ message: `"${itemEstoque.descricao}" adicionado à cesta!`, type: 'success' });
            renderCesta();
        }

        focarLeitor();
    };

    // Abrir modal neutro de escolha de lote
    const abrirModalEscolhaLote = (itensLotes) => {
        modalLoteDesc.textContent = itensLotes[0].descricao;
        tableEscolhaLote.innerHTML = itensLotes.map(it => {
            const loteBadge = it.lote 
                ? `<span style="font-family:monospace; background:rgba(59,130,246,0.15); color:#60a5fa; padding:3px 8px; border-radius:4px; font-weight:600;">${it.lote}</span>` 
                : '<span style="color:var(--text-muted);">Sem lote cadastrado</span>';

            let valFormatada = '-';
            if (it.validade) {
                try {
                    const [ano, mes, dia] = it.validade.split('T')[0].split('-');
                    valFormatada = `${dia}/${mes}/${ano}`;
                } catch (e) {
                    valFormatada = it.validade;
                }
            }

            return `
                <tr>
                    <td>${loteBadge}</td>
                    <td>${valFormatada}</td>
                    <td><strong>${it.quantidade_atual} ${it.unidade || ''}</strong></td>
                    <td style="text-align: right;">
                        <button type="button" class="btn btn-primary btn-sm btn-selecionar-lote" data-id="${it.id}">
                            Selecionar Este Lote
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tableEscolhaLote.querySelectorAll('.btn-selecionar-lote').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'));
                const selecionado = itensLotes.find(it => it.id === id);
                if (selecionado) {
                    modalLotes.style.display = 'none';
                    adicionarItemNaCesta(selecionado);
                }
            });
        });

        modalLotes.style.display = 'flex';
    };

    btnFecharModalLote.addEventListener('click', () => {
        modalLotes.style.display = 'none';
        focarLeitor();
    });

    // Processar leitura de código de barras
    const processarCodigoBarras = async (codigo) => {
        if (!codigo) return;
        barcodeInput.value = '';

        try {
            // Busca itens em estoque pelo código de barras
            const itens = await api.get('/dispensacoes/estoque/buscar?barcode=' + encodeURIComponent(codigo));

            if (!itens || itens.length === 0) {
                // Tenta busca genérica caso seja código siafísico/compras bipado
                const fallbackItens = await api.get('/dispensacoes/estoque/buscar?q=' + encodeURIComponent(codigo));
                if (!fallbackItens || fallbackItens.length === 0) {
                    playAlertBeep();
                    showToast({ message: `Código "${codigo}" não encontrado ou sem saldo em estoque.`, type: 'warning' });
                    focarLeitor();
                    return;
                }
                tratarRetornoBusca(fallbackItens);
                return;
            }

            tratarRetornoBusca(itens);
        } catch (error) {
            playAlertBeep();
            showToast({ message: 'Erro ao buscar código de barras.', type: 'error' });
            focarLeitor();
        }
    };

    // Tratar retorno (se 1 lote -> adiciona direto; se múltiplos lotes -> abre modal neutro)
    const tratarRetornoBusca = (itens) => {
        if (itens.length === 1) {
            adicionarItemNaCesta(itens[0]);
        } else {
            // Múltiplos lotes disponíveis para o mesmo produto
            abrirModalEscolhaLote(itens);
        }
    };

    // Evento do input de leitor de código de barras
    barcodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = barcodeInput.value.trim();
            if (val) processarCodigoBarras(val);
        }
    });

    // Busca manual (alternativa)
    const executarBuscaManual = async () => {
        const q = manualSearchInput.value.trim();
        if (!q) {
            manualResultsWrapper.style.display = 'none';
            return;
        }

        tableManualResults.innerHTML = '<tr><td colspan="5" class="text-center">Buscando...</td></tr>';
        manualResultsWrapper.style.display = 'block';

        try {
            const data = await api.get('/dispensacoes/estoque/buscar?q=' + encodeURIComponent(q));
            if (!data || data.length === 0) {
                tableManualResults.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum item com estoque encontrado.</td></tr>';
                return;
            }

            tableManualResults.innerHTML = data.map(it => {
                let valFormatada = '-';
                if (it.validade) {
                    try {
                        const [ano, mes, dia] = it.validade.split('T')[0].split('-');
                        valFormatada = `${dia}/${mes}/${ano}`;
                    } catch (e) {
                        valFormatada = it.validade;
                    }
                }

                return `
                    <tr>
                        <td><strong>${it.descricao}</strong></td>
                        <td>${it.lote ? `<span style="font-family:monospace; color:#60a5fa;">${it.lote}</span>` : '-'}</td>
                        <td>${valFormatada}</td>
                        <td>${it.quantidade_atual} ${it.unidade || ''}</td>
                        <td>
                            <button type="button" class="btn btn-primary btn-sm btn-add-manual" data-id="${it.id}">
                                + Adicionar
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            tableManualResults.querySelectorAll('.btn-add-manual').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = parseInt(e.currentTarget.getAttribute('data-id'));
                    const item = data.find(it => it.id === id);
                    if (item) {
                        adicionarItemNaCesta(item);
                        manualResultsWrapper.style.display = 'none';
                        manualSearchInput.value = '';
                    }
                });
            });
        } catch (error) {
            tableManualResults.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erro na busca manual.</td></tr>';
        }
    };

    btnManualSearch.addEventListener('click', executarBuscaManual);
    manualSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            executarBuscaManual();
        }
    });

    // Limpar cesta
    btnLimparCesta.addEventListener('click', () => {
        if (cesta.length > 0 && confirm('Deseja realmente limpar todos os itens da cesta?')) {
            cesta = [];
            renderCesta();
            focarLeitor();
        }
    });

    // Finalizar dispensação da cesta
    btnFinalizarCesta.addEventListener('click', async () => {
        const centroId = selectCentro.value;
        if (!centroId) {
            playAlertBeep();
            showToast({ message: 'Selecione o Centro Consumidor de destino.', type: 'warning' });
            selectCentro.focus();
            return;
        }

        if (cesta.length === 0) {
            playAlertBeep();
            showToast({ message: 'Adicione pelo menos um item à cesta antes de finalizar.', type: 'warning' });
            focarLeitor();
            return;
        }

        btnFinalizarCesta.disabled = true;
        btnFinalizarCesta.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando e Gerando PDF...';

        try {
            const body = {
                centro_consumidor_id: parseInt(centroId),
                observacoes: inputObs.value.trim() || null,
                itens: cesta.map(it => ({
                    estoque_id: it.estoque_id,
                    quantidade: it.quantidade
                }))
            };

            const response = await api.post('/dispensacoes', body);

            // Sucesso!
            playSuccessBeep();
            modalSucessoCodigo.textContent = `Guia nº: ${response.codigo}`;
            btnAbrirPdfSucesso.href = response.pdf_url;
            modalSucesso.style.display = 'flex';

            // Abre o PDF diretamente em nova aba do navegador para o usuário imprimir ou conferir
            window.open(response.pdf_url, '_blank');

            // Limpa formulário e cesta
            cesta = [];
            renderCesta();
            inputObs.value = '';
            loadRecent();
        } catch (error) {
            playAlertBeep();
            showToast({ message: error.message || 'Erro ao concluir dispensação.', type: 'error' });
        } finally {
            btnFinalizarCesta.disabled = false;
            btnFinalizarCesta.innerHTML = '<i class="fas fa-check-circle"></i> Concluir Dispensação e Gerar Ficha (PDF)';
        }
    });

    // Botão de nova dispensação no modal de sucesso
    btnNovaDispensacao.addEventListener('click', () => {
        modalSucesso.style.display = 'none';
        focarLeitor();
    });

    // Carregar Últimas Dispensações
    const loadRecent = async () => {
        try {
            const data = await api.get('/dispensacoes');
            if (data && data.length > 0) {
                tableRecent.innerHTML = data.slice(0, 15).map(d => {
                    const dataFormatada = d.criado_em ? new Date(d.criado_em).toLocaleString('pt-BR') : '-';
                    const centro = d.centro_consumidor_nome ? `${d.centro_consumidor_codigo ? d.centro_consumidor_codigo + ' - ' : ''}${d.centro_consumidor_nome}` : '-';
                    const loteText = d.lote ? `<span style="font-family:monospace; background:rgba(59,130,246,0.15); color:#60a5fa; padding:2px 6px; border-radius:4px;">${d.lote}</span>` : '<span style="color:var(--text-muted);">-</span>';
                    const guiaBadge = d.guia_codigo ? `<span style="font-weight:600; color:var(--primary, #3b82f6);">${d.guia_codigo}</span>` : '<span style="color:var(--text-muted);">-</span>';

                    const printBtn = d.guia_id 
                        ? `<a href="/api/dispensacoes/guias/${d.guia_id}/pdf" target="_blank" class="btn btn-secondary btn-sm" title="Reimprimir Ficha de Dispensação (PDF)" style="padding: 3px 8px;">
                               <i class="fas fa-print"></i> Reabrir PDF
                           </a>`
                        : '<span style="color:var(--text-muted); font-size:0.8rem;">Antiga</span>';

                    return `
                        <tr>
                            <td>${guiaBadge}</td>
                            <td>${dataFormatada}</td>
                            <td><strong>${d.estoque_descricao || 'N/A'}</strong></td>
                            <td>${loteText}</td>
                            <td><strong>${d.quantidade}</strong> ${d.unidade || ''}</td>
                            <td>${centro}</td>
                            <td>${d.usuario_nome || '-'}</td>
                            <td style="text-align:center;">${printBtn}</td>
                        </tr>
                    `;
                }).join('');
            } else {
                tableRecent.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Nenhuma dispensação recente.</td></tr>';
            }
        } catch (error) {
            tableRecent.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Erro ao carregar dispensações.</td></tr>';
        }
    };

    btnRefreshRecent.addEventListener('click', loadRecent);

    // Inicialização
    await loadCentros();
    loadRecent();
    focarLeitor();
}
