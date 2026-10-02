import { api } from '../api.js';
import { showToast } from '../components/toast.js';
import { playSuccessBeep } from '../utils/audio.js';

export async function renderRecebimento(container) {
    container.innerHTML = `
        <div class="animate-fadeIn">
            <h2 class="mb-4">Recebimento de Materiais</h2>
            
            <div class="card mb-4">
                <div class="card-header" style="display:flex; gap:1rem; flex-wrap:wrap;">
                    <button class="btn btn-primary" id="tab-ne">Via Empenho</button>
                    <button class="btn btn-outline" id="tab-doacao">Via Doação</button>
                    <button class="btn btn-outline" id="tab-historico"><i class="fas fa-history"></i> Histórico & Estornos</button>
                </div>
                
                <div class="card-body" id="view-ne">
                    <form id="form-rec-ne">
                        <div class="form-group">
                            <label class="form-label" for="select-ne">Selecione a Nota de Empenho</label>
                            <select id="select-ne" class="form-control" required>
                                <option value="">Carregando...</option>
                            </select>
                        </div>

                        <div id="ne-details" style="display: none; margin-top: 1rem;">
                            <div class="card mb-4" style="background: rgba(255,255,255,0.02)">
                                <div class="card-body">
                                    <h4 class="mb-2">Dados da Empresa</h4>
                                    <div id="empresa-info" style="font-size: 0.9rem;"></div>
                                </div>
                            </div>
                            
                            <h4>Itens para Recebimento</h4>
                            <div style="overflow-x: auto;">
                                <table class="table" id="table-itens-ne" style="min-width: 800px;">
                                    <thead>
                                        <tr>
                                            <th><input type="checkbox" id="check-all"></th>
                                            <th>Descrição</th>
                                            <th>Qtd NE</th>
                                            <th>Já Rec.</th>
                                            <th>Qtd a Rec.</th>
                                            <th>Cód. Barras</th>
                                            <th>Lote</th>
                                            <th>Nota Fiscal</th>
                                            <th>Data Entrega</th>
                                            <th>Perecível?</th>
                                            <th>Validade</th>
                                            <th>Garantia?</th>
                                            <th>Data Garantia</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    </tbody>
                                </table>
                            </div>
                            
                            <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
                                <button type="submit" class="btn btn-primary" id="btn-submit-ne">Salvar Recebimento (NE)</button>
                            </div>
                        </div>
                    </form>
                </div>

                <div class="card-body" id="view-doacao" style="display: none;">
                    <form id="form-rec-doacao">
                        <h4 class="mb-2">Dados do Doador</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div class="form-group">
                                <label class="form-label" for="doador-cpf-cnpj">CPF/CNPJ</label>
                                <input type="text" id="doador-cpf-cnpj" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="doador-nome">Nome / Razão Social</label>
                                <input type="text" id="doador-nome" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="doador-endereco">Endereço</label>
                                <input type="text" id="doador-endereco" class="form-control">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="doador-telefone">Telefone</label>
                                <input type="text" id="doador-telefone" class="form-control">
                            </div>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; margin: 1rem 0;">
                            <h4>Itens da Doação</h4>
                            <button type="button" class="btn btn-outline" id="btn-add-item-doacao">+ Adicionar Item</button>
                        </div>
                        
                        <div id="doacao-itens" style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1rem;">
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                            <div class="form-group">
                                <label class="form-label" for="doador-nf">Nota Fiscal *</label>
                                <input type="text" id="doador-nf" class="form-control" required placeholder="Número da Nota Fiscal">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="doador-data">Data de Entrega</label>
                                <input type="date" id="doador-data" class="form-control" required>
                            </div>
                        </div>
                        
                        <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
                            <button type="submit" class="btn btn-primary" id="btn-submit-doacao">Salvar Recebimento (Doação)</button>
                        </div>
                    </form>
                </div>

                <!-- VIEW HISTÓRICO & ESTORNOS -->
                <div class="card-body" id="view-historico" style="display: none;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:1rem;">
                        <input type="text" id="historico-search" class="form-control" placeholder="Buscar por material, lote, NF, NE, fornecedor..." style="max-width:380px;">
                        <button class="btn btn-secondary btn-sm" id="btn-refresh-historico"><i class="fas fa-sync-alt"></i> Atualizar</button>
                    </div>
                    <div style="overflow-x: auto;">
                        <table class="table" id="table-historico-rec">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Origem</th>
                                    <th>NF / NE</th>
                                    <th>Material / Descrição</th>
                                    <th>Lote</th>
                                    <th>Validade</th>
                                    <th>Qtd Recebida</th>
                                    <th>Saldo Estoque</th>
                                    <th>Já Estornado</th>
                                    <th style="text-align:center;">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="10" class="text-center">Carregando histórico...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>

        <!-- MODAL DE ESTORNO / DEVOLUÇÃO -->
        <div id="modal-estorno" class="modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 200; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: var(--bg-card); padding: 2rem; border-radius: 8px; width: 90%; max-width: 580px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <h3 style="margin-bottom: 0.5rem;"><i class="fas fa-undo-alt"></i> Estorno / Devolução de Material</h3>
                <p id="estorno-item-desc" style="color: var(--text-muted); margin-bottom: 1rem; font-size: 0.95rem;"></p>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); border-radius: 6px; padding: 0.85rem; margin-bottom: 1.25rem; font-size: 0.88rem;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                        <span>Qtd Original Recebida:</span>
                        <strong id="estorno-qtd-original">0</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                        <span>Saldo Atual Disponível em Estoque:</span>
                        <strong id="estorno-saldo-atual" style="color:#60a5fa;">0</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span>Já Estornado Anteriormente:</span>
                        <strong id="estorno-ja-estornado" style="color:#f59e0b;">0</strong>
                    </div>
                </div>

                <form id="form-estorno">
                    <input type="hidden" id="estorno-item-id">
                    
                    <div class="form-group">
                        <label class="form-label" for="estorno-qtd"><strong>Quantidade a Estornar *</strong></label>
                        <input type="number" id="estorno-qtd" class="form-control" required min="1" step="any" style="font-size: 1.05rem; font-weight:600;">
                        <small class="text-muted">Limite máximo: saldo disponível em estoque deste lote.</small>
                    </div>

                    <div class="form-group">
                        <label class="form-label"><strong>Tipo de Motivo *</strong></label>
                        <div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.25rem;">
                            <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                                <input type="radio" name="estorno-motivo" value="erro_digitacao" checked>
                                <span><strong>Erro de Digitação</strong> (retificação de quantidade lançada incorretamente)</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                                <input type="radio" name="estorno-motivo" value="devolucao_fornecedor">
                                <span><strong>Devolução ao Fornecedor</strong> (recusa técnica, avaria ou fora do padrão do edital)</span>
                            </label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="estorno-justificativa"><strong>Justificativa por Extenso *</strong></label>
                        <textarea id="estorno-justificativa" class="form-control" rows="3" required placeholder="Explique detalhadamente o motivo deste estorno para fins de auditoria..."></textarea>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem;">
                        <button type="button" class="btn btn-secondary" id="btn-cancelar-estorno">Cancelar</button>
                        <button type="submit" class="btn btn-danger" id="btn-confirmar-estorno">Confirmar Estorno</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL DE SUCESSO DO ESTORNO COM BOTÃO OPCIONAL DE GUIA -->
        <div id="modal-sucesso-estorno" class="modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 210; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: var(--bg-card); padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; text-align: center;">
                <div style="width: 55px; height: 55px; background: rgba(16,185,129,0.15); color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; margin: 0 auto 1rem;">
                    <i class="fas fa-check"></i>
                </div>
                <h3 style="margin-bottom: 0.5rem; color: #10b981;">Estorno Realizado com Sucesso!</h3>
                <p id="sucesso-estorno-msg" style="color: var(--text-muted); margin-bottom: 1.5rem; font-size: 0.95rem;"></p>
                <div id="sucesso-guia-wrapper" style="display:none; margin-bottom: 1rem;">
                    <a id="btn-abrir-guia-devolucao" href="#" target="_blank" class="btn btn-primary" style="width:100%; padding:0.75rem;">
                        <i class="fas fa-file-pdf"></i> Imprimir Guia de Devolução ao Fornecedor (Opcional)
                    </a>
                </div>
                <button type="button" class="btn btn-secondary" id="btn-fechar-sucesso-estorno" style="width:100%;">Fechar</button>
            </div>
        </div>
    `;

    const tabNe = document.getElementById('tab-ne');
    const tabDoacao = document.getElementById('tab-doacao');
    const tabHistorico = document.getElementById('tab-historico');
    const viewNe = document.getElementById('view-ne');
    const viewDoacao = document.getElementById('view-doacao');
    const viewHistorico = document.getElementById('view-historico');
    const selectNe = document.getElementById('select-ne');
    const neDetails = document.getElementById('ne-details');
    const empresaInfo = document.getElementById('empresa-info');
    const tableItensNe = document.querySelector('#table-itens-ne tbody');

    tabNe.addEventListener('click', () => {
        tabNe.className = 'btn btn-primary';
        tabDoacao.className = 'btn btn-outline';
        tabHistorico.className = 'btn btn-outline';
        viewNe.style.display = 'block';
        viewDoacao.style.display = 'none';
        viewHistorico.style.display = 'none';
    });

    tabDoacao.addEventListener('click', () => {
        tabDoacao.className = 'btn btn-primary';
        tabNe.className = 'btn btn-outline';
        tabHistorico.className = 'btn btn-outline';
        viewDoacao.style.display = 'block';
        viewNe.style.display = 'none';
        viewHistorico.style.display = 'none';
    });

    tabHistorico.addEventListener('click', () => {
        tabHistorico.className = 'btn btn-primary';
        tabNe.className = 'btn btn-outline';
        tabDoacao.className = 'btn btn-outline';
        viewHistorico.style.display = 'block';
        viewNe.style.display = 'none';
        viewDoacao.style.display = 'none';
        loadHistorico();
    });

    // Carregar empenhos no select
    const loadEmpenhos = async () => {
        try {
            const data = await api.get('/empenhos');
            selectNe.innerHTML = '<option value="">Selecione...</option>';
            if (data && data.length > 0) {
                data.forEach(emp => {
                    const opt = document.createElement('option');
                    opt.value = emp.id;
                    opt.textContent = 'NE ' + emp.numero + ' - ' + (emp.razao_social || 'Sem empresa');
                    selectNe.appendChild(opt);
                });
            }
        } catch (error) {
            selectNe.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    };

    // Ao selecionar uma NE, carregar detalhes
    selectNe.addEventListener('change', async (e) => {
        const id = e.target.value;
        if (!id) {
            neDetails.style.display = 'none';
            return;
        }

        try {
            const emp = await api.get('/empenhos/' + id);
            if (emp) {
                empresaInfo.innerHTML =
                    '<strong>Razão Social:</strong> ' + (emp.razao_social || '-') + '<br>' +
                    '<strong>CNPJ:</strong> ' + (emp.cnpj || '-') + '<br>' +
                    '<strong>Endereço:</strong> ' + (emp.endereco || '-') + '<br>' +
                    '<strong>Telefone:</strong> ' + (emp.telefone || '-');

                tableItensNe.innerHTML = '';
                if (emp.itens && emp.itens.length > 0) {
                    const today = new Date().toISOString().split('T')[0];

                    emp.itens.forEach((item) => {
                        const pendente = item.quantidade - (item.quantidade_recebida || 0);
                        const isInitialPerecivel = Boolean(item.perecivel);
                        const isInitialGarantia = Boolean(item.garantia);
                        const initialDataGarantia = item.data_garantia ? String(item.data_garantia).split('T')[0] : '';
                        const tr = document.createElement('tr');
                        tr.innerHTML =
                            '<td><input type="checkbox" class="item-check" data-id="' + item.id + '"></td>' +
                            '<td class="item-desc-text"><strong>' + item.descricao + '</strong><br><small style="color:var(--text-secondary)" title="Informe a unidade em que o produto será dispensado aos centros consumidores">Menor un. dispensação: <strong>' + (item.unidade || '-') + '</strong></small></td>' +
                            '<td>' + item.quantidade + '</td>' +
                            '<td>' + (item.quantidade_recebida || 0) + '</td>' +
                            '<td><input type="number" class="form-control item-qtd-rec" value="' + pendente + '" min="1" max="' + pendente + '" style="width:80px;" disabled></td>' +
                            '<td><input type="text" class="form-control item-cod" placeholder="Bipe/digite" style="width:120px;" disabled></td>' +
                            '<td><input type="text" class="form-control item-lote" placeholder="Lote" style="width:110px;" disabled></td>' +
                            '<td><input type="text" class="form-control item-nf" placeholder="Nº NF" style="width:105px;" disabled></td>' +
                            '<td><input type="date" class="form-control item-data" value="' + today + '" style="width:130px;" disabled></td>' +
                            '<td>' +
                                '<select class="form-control item-per" style="width:90px;" disabled>' +
                                    '<option value="Não"' + (!isInitialPerecivel ? ' selected' : '') + '>Não</option>' +
                                    '<option value="Sim"' + (isInitialPerecivel ? ' selected' : '') + '>Sim</option>' +
                                '</select>' +
                            '</td>' +
                            '<td><input type="date" class="form-control item-val" style="width:135px;" ' + (isInitialPerecivel ? '' : 'disabled') + ' disabled></td>' +
                            '<td>' +
                                '<select class="form-control item-gar" style="width:90px;" disabled>' +
                                    '<option value="Não"' + (!isInitialGarantia ? ' selected' : '') + '>Não</option>' +
                                    '<option value="Sim"' + (isInitialGarantia ? ' selected' : '') + '>Sim</option>' +
                                '</select>' +
                            '</td>' +
                            '<td><input type="date" class="form-control item-data-gar" value="' + initialDataGarantia + '" style="width:135px;" ' + (isInitialGarantia ? '' : 'disabled') + ' disabled></td>';
                        tableItensNe.appendChild(tr);

                        const check = tr.querySelector('.item-check');
                        const qtdRec = tr.querySelector('.item-qtd-rec');
                        const cod = tr.querySelector('.item-cod');
                        const lote = tr.querySelector('.item-lote');
                        const nf = tr.querySelector('.item-nf');
                        const data = tr.querySelector('.item-data');
                        const per = tr.querySelector('.item-per');
                        const val = tr.querySelector('.item-val');
                        const gar = tr.querySelector('.item-gar');
                        const dataGar = tr.querySelector('.item-data-gar');
                        
                        check.addEventListener('change', (ev) => {
                            const isChecked = ev.target.checked;
                            qtdRec.disabled = !isChecked;
                            cod.disabled = !isChecked;
                            lote.disabled = !isChecked;
                            nf.disabled = !isChecked;
                            data.disabled = !isChecked;
                            per.disabled = !isChecked;
                            val.disabled = !isChecked || (per.value !== 'Sim');
                            gar.disabled = !isChecked;
                            dataGar.disabled = !isChecked || (gar.value !== 'Sim');

                            if (isChecked) {
                                const checkedRows = Array.from(tableItensNe.querySelectorAll('.item-check:checked'));
                                if (checkedRows.length > 1) {
                                    const firstRow = checkedRows[0].closest('tr');
                                    nf.value = firstRow.querySelector('.item-nf').value;
                                    data.value = firstRow.querySelector('.item-data').value;
                                }
                            }
                        });

                        // Mudança dinâmica de Perecível no ato do recebimento
                        per.addEventListener('change', () => {
                            if (per.value === 'Sim') {
                                val.disabled = false;
                                val.focus();
                            } else {
                                val.disabled = true;
                                val.value = '';
                            }
                        });

                        // Mudança dinâmica de Garantia no ato do recebimento
                        gar.addEventListener('change', () => {
                            if (gar.value === 'Sim') {
                                dataGar.disabled = false;
                                dataGar.focus();
                            } else {
                                dataGar.disabled = true;
                                dataGar.value = '';
                            }
                        });

                        // Auto-check e beep ao escanear código de barras
                        cod.addEventListener('change', () => {
                            if (cod.value) playSuccessBeep();
                        });
                        cod.addEventListener('input', () => {
                            if (cod.value && !check.checked) {
                                check.click();
                            }
                        });
                    });
                }
                neDetails.style.display = 'block';
            }
        } catch (error) {
            showToast({ message: 'Erro ao carregar detalhes da NE.', type: 'error' });
        }
    });

    // Selecionar/desselecionar todos
    document.getElementById('check-all').addEventListener('change', (e) => {
        const checks = tableItensNe.querySelectorAll('.item-check');
        checks.forEach(c => {
            if (c.checked !== e.target.checked) {
                c.click();
            }
        });
    });

    // Submeter recebimento via NE
    document.getElementById('form-rec-ne').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const checkedBoxes = Array.from(tableItensNe.querySelectorAll('.item-check:checked'));
        if (checkedBoxes.length === 0) {
            showToast({ message: 'Selecione pelo menos um item para receber.', type: 'warning' });
            return;
        }

        const btn = document.getElementById('btn-submit-ne');
        btn.disabled = true;
        btn.innerHTML = 'Salvando...';

        try {
            const itensRecebidos = [];

            for (const cb of checkedBoxes) {
                const tr = cb.closest('tr');
                const descText = tr.querySelector('.item-desc-text strong').textContent;
                const isPer = tr.querySelector('.item-per').value === 'Sim';
                const valDate = tr.querySelector('.item-val').value;
                const isGar = tr.querySelector('.item-gar').value === 'Sim';
                const garDate = tr.querySelector('.item-data-gar').value;

                if (isPer && !valDate) {
                    showToast({ message: `Informe a data de validade para o item perecível "${descText}".`, type: 'warning' });
                    btn.disabled = false;
                    btn.innerHTML = 'Salvar Recebimento (NE)';
                    tr.querySelector('.item-val').focus();
                    return;
                }

                if (isGar && !garDate) {
                    showToast({ message: `Informe a data de garantia para o item "${descText}".`, type: 'warning' });
                    btn.disabled = false;
                    btn.innerHTML = 'Salvar Recebimento (NE)';
                    tr.querySelector('.item-data-gar').focus();
                    return;
                }

                itensRecebidos.push({
                    item_empenho_id: parseInt(cb.getAttribute('data-id')),
                    quantidade: parseFloat(tr.querySelector('.item-qtd-rec').value),
                    codigo_barras: tr.querySelector('.item-cod').value || null,
                    lote: tr.querySelector('.item-lote').value.trim() || null,
                    nota_fiscal: tr.querySelector('.item-nf').value || null,
                    data_entrega: tr.querySelector('.item-data').value || null,
                    perecivel: isPer,
                    validade: isPer ? valDate : null,
                    garantia: isGar,
                    data_garantia: isGar ? garDate : null
                });
            }

            await api.post('/recebimentos/empenho', {
                nota_empenho_id: parseInt(selectNe.value),
                nota_fiscal: itensRecebidos[0].nota_fiscal,
                data_entrega: itensRecebidos[0].data_entrega,
                itens: itensRecebidos
            });

            showToast({ message: 'Recebimento salvo com sucesso!', type: 'success' });
            selectNe.dispatchEvent(new Event('change'));
        } catch (error) {
            showToast({ message: error.message || 'Erro ao salvar recebimento.', type: 'error' });
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Salvar Recebimento (NE)';
        }
    });

    // === DOAÇÃO ===
    const doacaoItens = document.getElementById('doacao-itens');
    document.getElementById('doador-data').value = new Date().toISOString().split('T')[0];

    const createDoacaoItem = () => {
        const div = document.createElement('div');
        div.style.cssText = 'display:grid; grid-template-columns:2fr 1fr 1fr 1.2fr 1.1fr 1fr 1.2fr 1fr 1.2fr auto; gap:0.5rem; align-items:end; border:1px solid var(--border-glass); padding:1rem; border-radius:8px;';

        div.innerHTML =
            '<div class="form-group" style="margin-bottom:0">' +
                '<label class="form-label" style="font-size:0.8rem">Descrição</label>' +
                '<input type="text" class="form-control d-desc" required>' +
            '</div>' +
            '<div class="form-group" style="margin-bottom:0">' +
                '<label class="form-label" style="font-size:0.8rem" title="Informe a unidade em que o produto será dispensado aos centros consumidores">Menor un. de dispensação <i class="fas fa-info-circle text-muted" title="Informe a unidade em que o produto será dispensado aos centros consumidores" style="cursor:help;"></i></label>' +
                '<select class="form-control d-un" required title="Informe a unidade em que o produto será dispensado aos centros consumidores">' +
                    '<option value="Unidade">Unidade</option>' +
                    '<option value="Caixa">Caixa</option>' +
                    '<option value="Pacote">Pacote</option>' +
                    '<option value="Litro">Litro</option>' +
                    '<option value="Quilograma">Quilograma</option>' +
                    '<option value="Outros">Outros</option>' +
                '</select>' +
            '</div>' +
            '<div class="form-group" style="margin-bottom:0">' +
                '<label class="form-label" style="font-size:0.8rem">Quantidade</label>' +
                '<input type="number" class="form-control d-qtd" required min="1">' +
            '</div>' +
            '<div class="form-group" style="margin-bottom:0">' +
                '<label class="form-label" style="font-size:0.8rem">Cód. Barras</label>' +
                '<input type="text" class="form-control d-cod">' +
            '</div>' +
            '<div class="form-group" style="margin-bottom:0">' +
                '<label class="form-label" style="font-size:0.8rem">Lote</label>' +
                '<input type="text" class="form-control d-lote" placeholder="Lote">' +
            '</div>' +
            '<div class="form-group" style="margin-bottom:0">' +
                '<label class="form-label" style="font-size:0.8rem">Perecível?</label>' +
                '<select class="form-control d-per" required>' +
                    '<option value="Não">Não</option>' +
                    '<option value="Sim">Sim</option>' +
                '</select>' +
            '</div>' +
            '<div class="form-group" style="margin-bottom:0">' +
                '<label class="form-label" style="font-size:0.8rem">Validade</label>' +
                '<input type="date" class="form-control d-val" disabled>' +
            '</div>' +
            '<div class="form-group" style="margin-bottom:0">' +
                '<label class="form-label" style="font-size:0.8rem">Garantia?</label>' +
                '<select class="form-control d-gar" required>' +
                    '<option value="Não">Não</option>' +
                    '<option value="Sim">Sim</option>' +
                '</select>' +
            '</div>' +
            '<div class="form-group" style="margin-bottom:0">' +
                '<label class="form-label" style="font-size:0.8rem">Data Garantia</label>' +
                '<input type="date" class="form-control d-data-gar" disabled>' +
            '</div>' +
            '<button type="button" class="btn btn-danger btn-remove-doacao" style="padding:0.5rem;">&times;</button>';

        div.querySelector('.d-per').addEventListener('change', (ev) => {
            const valInput = div.querySelector('.d-val');
            valInput.disabled = ev.target.value === 'Não';
            if (ev.target.value === 'Não') valInput.value = '';
        });

        div.querySelector('.d-gar').addEventListener('change', (ev) => {
            const garInput = div.querySelector('.d-data-gar');
            garInput.disabled = ev.target.value === 'Não';
            if (ev.target.value === 'Não') garInput.value = '';
        });

        div.querySelector('.d-cod').addEventListener('change', (ev) => {
            if (ev.target.value) playSuccessBeep();
        });

        div.querySelector('.btn-remove-doacao').addEventListener('click', () => div.remove());
        doacaoItens.appendChild(div);
    };

    document.getElementById('btn-add-item-doacao').addEventListener('click', createDoacaoItem);
    
    // Limpar máscara do CPF/CNPJ do doador
    const doadorCpfCnpj = document.getElementById('doador-cpf-cnpj');
    doadorCpfCnpj.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
    });

    // Submeter doação
    document.getElementById('form-rec-doacao').addEventListener('submit', async (e) => {
        e.preventDefault();

        const nfVal = document.getElementById('doador-nf').value.trim();
        if (!nfVal) {
            showToast({ message: 'A Nota Fiscal é obrigatória para recebimento de doação.', type: 'warning' });
            document.getElementById('doador-nf').focus();
            return;
        }

        const btn = document.getElementById('btn-submit-doacao');
        btn.disabled = true;
        btn.innerHTML = 'Salvando...';

        try {
            const itensNodes = doacaoItens.children;
            const itens = [];
            
            for (let i = 0; i < itensNodes.length; i++) {
                const node = itensNodes[i];
                const desc = node.querySelector('.d-desc').value;
                const isPer = node.querySelector('.d-per').value === 'Sim';
                const val = node.querySelector('.d-val').value;
                const isGar = node.querySelector('.d-gar').value === 'Sim';
                const dataGar = node.querySelector('.d-data-gar').value;

                if (isPer && !val) {
                    showToast({ message: `Informe a data de validade para o item perecível "${desc}".`, type: 'warning' });
                    btn.disabled = false;
                    btn.innerHTML = 'Salvar Recebimento (Doação)';
                    return;
                }

                if (isGar && !dataGar) {
                    showToast({ message: `Informe a data de garantia para o item "${desc}".`, type: 'warning' });
                    btn.disabled = false;
                    btn.innerHTML = 'Salvar Recebimento (Doação)';
                    return;
                }

                itens.push({
                    descricao: desc,
                    unidade: node.querySelector('.d-un').value,
                    quantidade: parseFloat(node.querySelector('.d-qtd').value),
                    codigo_barras: node.querySelector('.d-cod').value || null,
                    lote: node.querySelector('.d-lote').value.trim() || null,
                    perecivel: isPer,
                    validade: isPer ? val : null,
                    garantia: isGar,
                    data_garantia: isGar ? dataGar : null
                });
            }

            if (itens.length === 0) {
                showToast({ message: 'Adicione pelo menos um item.', type: 'warning' });
                btn.disabled = false;
                btn.innerHTML = 'Salvar Recebimento (Doação)';
                return;
            }

            const body = {
                doador: {
                    cpf_cnpj: doadorCpfCnpj.value.replace(/\D/g, ''),
                    nome_razao_social: document.getElementById('doador-nome').value,
                    endereco: document.getElementById('doador-endereco').value || null,
                    telefone: document.getElementById('doador-telefone').value || null
                },
                nota_fiscal: nfVal,
                data_entrega: document.getElementById('doador-data').value,
                itens
            };

            await api.post('/recebimentos/doacao', body);
            showToast({ message: 'Doação registrada com sucesso!', type: 'success' });
            document.getElementById('form-rec-doacao').reset();
            doacaoItens.innerHTML = '';
            document.getElementById('doador-data').value = new Date().toISOString().split('T')[0];
        } catch (error) {
            showToast({ message: error.message || 'Erro ao registrar doação.', type: 'error' });
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Salvar Recebimento (Doação)';
        }
    });

    // Carregar empenhos e adicionar um item de doação inicial
    loadEmpenhos();
    createDoacaoItem();

    // ==========================================
    // HISTÓRICO DE RECEBIMENTOS & ESTORNOS
    // ==========================================
    let historicoData = [];
    const tableHistoricoBody = document.querySelector('#table-historico-rec tbody');
    const historicoSearch = document.getElementById('historico-search');
    const btnRefreshHistorico = document.getElementById('btn-refresh-historico');

    // Modais de Estorno
    const modalEstorno = document.getElementById('modal-estorno');
    const formEstorno = document.getElementById('form-estorno');
    const btnCancelarEstorno = document.getElementById('btn-cancelar-estorno');
    const btnConfirmarEstorno = document.getElementById('btn-confirmar-estorno');
    const modalSucessoEstorno = document.getElementById('modal-sucesso-estorno');
    const btnFecharSucessoEstorno = document.getElementById('btn-fechar-sucesso-estorno');
    const sucessoGuiaWrapper = document.getElementById('sucesso-guia-wrapper');
    const btnAbrirGuiaDevolucao = document.getElementById('btn-abrir-guia-devolucao');

    const renderHistoricoTabela = (lista) => {
        if (!lista || lista.length === 0) {
            tableHistoricoBody.innerHTML = '<tr><td colspan="10" class="text-center text-muted" style="padding: 1.5rem;">Nenhum recebimento encontrado.</td></tr>';
            return;
        }

        tableHistoricoBody.innerHTML = lista.map(item => {
            const dataFmt = item.data_entrega ? new Date(item.data_entrega).toLocaleDateString('pt-BR') : (item.criado_em ? new Date(item.criado_em).toLocaleDateString('pt-BR') : '-');
            const origemBadge = item.origem === 'empenho' 
                ? '<span class="badge badge-primary" style="font-size:0.75rem;">Empenho</span>'
                : '<span class="badge badge-info" style="font-size:0.75rem;">Doação</span>';
            const loteBadge = item.lote 
                ? `<span style="font-family:monospace; background:rgba(59,130,246,0.15); color:#60a5fa; padding:2px 6px; border-radius:4px; font-weight:600; font-size:0.85rem;">${item.lote}</span>` 
                : '<span style="color:var(--text-muted);">-</span>';
            const validadeFmt = item.validade ? new Date(item.validade).toLocaleDateString('pt-BR') : '-';
            
            const saldoAtual = Number(item.saldo_estoque_atual || 0);
            const totalRec = Number(item.quantidade_recebida || 0);
            const jaEstornado = Number(item.total_estornado || 0);
            const podeEstornar = saldoAtual > 0 && (totalRec - jaEstornado) > 0;

            const nfNe = item.origem === 'empenho'
                ? `<div><strong>NE:</strong> ${item.numero_empenho || '-'}</div><div style="font-size:0.8rem; color:var(--text-muted);">NF: ${item.nota_fiscal || '-'}</div>`
                : `<div><strong>NF:</strong> ${item.nota_fiscal || '-'}</div>`;

            const saldoColor = saldoAtual > 0 ? '#10b981' : 'var(--text-muted)';
            const estornadoTxt = jaEstornado > 0 
                ? `<span style="color:#f59e0b; font-weight:600;">${jaEstornado} ${item.unidade || ''}</span>`
                : '<span style="color:var(--text-muted);">-</span>';

            const acaoBtn = podeEstornar
                ? `<button class="btn btn-warning btn-sm btn-abrir-estorno" data-id="${item.id}" style="padding:4px 8px; font-size:0.8rem; white-space:nowrap;"><i class="fas fa-undo-alt"></i> Estornar</button>`
                : `<span class="badge badge-secondary" style="font-size:0.75rem;" title="Item sem saldo em estoque para estorno">Indisponível</span>`;

            return `
                <tr>
                    <td style="white-space:nowrap;">${dataFmt}</td>
                    <td>${origemBadge}</td>
                    <td>${nfNe}</td>
                    <td>
                        <strong>${item.descricao}</strong>
                        <div style="font-size:0.8rem; color:var(--text-muted);">${item.fornecedor_nome || ''}</div>
                    </td>
                    <td>${loteBadge}</td>
                    <td style="white-space:nowrap;">${validadeFmt}</td>
                    <td><strong>${totalRec} ${item.unidade || ''}</strong></td>
                    <td><strong style="color:${saldoColor};">${saldoAtual} ${item.unidade || ''}</strong></td>
                    <td>${estornadoTxt}</td>
                    <td style="text-align:center;">${acaoBtn}</td>
                </tr>
            `;
        }).join('');

        // Listeners nos botões de Estornar
        document.querySelectorAll('.btn-abrir-estorno').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'));
                abrirModalEstorno(id);
            });
        });
    };

    const loadHistorico = async () => {
        tableHistoricoBody.innerHTML = '<tr><td colspan="10" class="text-center" style="padding:1.5rem;"><i class="fas fa-spinner fa-spin"></i> Carregando histórico...</td></tr>';
        try {
            const data = await api.get('/recebimentos/historico');
            historicoData = Array.isArray(data) ? data : [];
            filtrarHistorico();
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            tableHistoricoBody.innerHTML = '<tr><td colspan="10" class="text-center text-danger" style="padding:1.5rem;">Erro ao carregar histórico de recebimentos.</td></tr>';
            showToast({ message: 'Erro ao carregar histórico.', type: 'error' });
        }
    };

    const filtrarHistorico = () => {
        const termo = (historicoSearch.value || '').trim().toLowerCase();
        if (!termo) {
            renderHistoricoTabela(historicoData);
            return;
        }
        const filtrados = historicoData.filter(item => {
            const desc = (item.descricao || '').toLowerCase();
            const lote = (item.lote || '').toLowerCase();
            const nf = (item.nota_fiscal || '').toLowerCase();
            const ne = (item.numero_empenho || '').toLowerCase();
            const forn = (item.fornecedor_nome || '').toLowerCase();
            return desc.includes(termo) || lote.includes(termo) || nf.includes(termo) || ne.includes(termo) || forn.includes(termo);
        });
        renderHistoricoTabela(filtrados);
    };

    historicoSearch.addEventListener('input', filtrarHistorico);
    btnRefreshHistorico.addEventListener('click', loadHistorico);

    let itemParaEstorno = null;

    const abrirModalEstorno = (itemId) => {
        itemParaEstorno = historicoData.find(i => i.id === itemId);
        if (!itemParaEstorno) return;

        const saldo = Number(itemParaEstorno.saldo_estoque_atual || 0);
        const original = Number(itemParaEstorno.quantidade_recebida || 0);
        const jaEstornado = Number(itemParaEstorno.total_estornado || 0);
        const maxEstorno = Math.min(saldo, original - jaEstornado);

        document.getElementById('estorno-item-id').value = itemParaEstorno.id;
        document.getElementById('estorno-item-desc').textContent = `${itemParaEstorno.descricao} (${itemParaEstorno.unidade || 'UN'}) ${itemParaEstorno.lote ? ' • Lote: ' + itemParaEstorno.lote : ''}`;
        document.getElementById('estorno-qtd-original').textContent = `${original} ${itemParaEstorno.unidade || ''}`;
        document.getElementById('estorno-saldo-atual').textContent = `${saldo} ${itemParaEstorno.unidade || ''}`;
        document.getElementById('estorno-ja-estornado').textContent = `${jaEstornado} ${itemParaEstorno.unidade || ''}`;

        const inputQtd = document.getElementById('estorno-qtd');
        inputQtd.value = '';
        inputQtd.max = maxEstorno;
        inputQtd.placeholder = `Máximo: ${maxEstorno}`;

        // Reset radio para erro_digitacao por padrão
        const radioErro = document.querySelector('input[name="estorno-motivo"][value="erro_digitacao"]');
        if (radioErro) radioErro.checked = true;

        document.getElementById('estorno-justificativa').value = '';

        modalEstorno.style.display = 'flex';
    };

    const fecharModalEstorno = () => {
        modalEstorno.style.display = 'none';
        itemParaEstorno = null;
    };

    btnCancelarEstorno.addEventListener('click', fecharModalEstorno);

    formEstorno.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!itemParaEstorno) return;

        const qtd = parseFloat(document.getElementById('estorno-qtd').value);
        const motivo = document.querySelector('input[name="estorno-motivo"]:checked')?.value;
        const justificativa = document.getElementById('estorno-justificativa').value.trim();

        const saldo = Number(itemParaEstorno.saldo_estoque_atual || 0);
        const original = Number(itemParaEstorno.quantidade_recebida || 0);
        const jaEstornado = Number(itemParaEstorno.total_estornado || 0);
        const maxEstorno = Math.min(saldo, original - jaEstornado);

        if (!qtd || qtd <= 0) {
            showToast({ message: 'Informe uma quantidade válida para o estorno.', type: 'warning' });
            return;
        }

        if (qtd > maxEstorno) {
            showToast({ message: `A quantidade informada (${qtd}) ultrapassa o limite permitido (${maxEstorno}).`, type: 'warning' });
            return;
        }

        if (!justificativa || justificativa.length < 5) {
            showToast({ message: 'A justificativa por extenso é obrigatória (mínimo de 5 caracteres).', type: 'warning' });
            return;
        }

        btnConfirmarEstorno.disabled = true;
        btnConfirmarEstorno.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

        try {
            const payload = {
                item_recebimento_id: itemParaEstorno.id,
                quantidade: qtd,
                tipo_motivo: motivo,
                justificativa: justificativa
            };

            const result = await api.post('/recebimentos/estorno', payload);

            fecharModalEstorno();

            // Exibir modal de sucesso
            document.getElementById('sucesso-estorno-msg').textContent = result.mensagem || 'Estorno concluído com sucesso!';
            
            if (result.guia_devolucao_id) {
                sucessoGuiaWrapper.style.display = 'block';
                btnAbrirGuiaDevolucao.href = `/api/recebimentos/estornos/${result.guia_devolucao_id}/pdf`;
            } else {
                sucessoGuiaWrapper.style.display = 'none';
            }

            modalSucessoEstorno.style.display = 'flex';
            showToast({ message: 'Estorno realizado com sucesso!', type: 'success' });
            await loadHistorico();
        } catch (error) {
            console.error('Erro ao efetuar estorno:', error);
            showToast({ message: error.message || 'Erro ao processar estorno.', type: 'error' });
        } finally {
            btnConfirmarEstorno.disabled = false;
            btnConfirmarEstorno.innerHTML = 'Confirmar Estorno';
        }
    });

    btnFecharSucessoEstorno.addEventListener('click', () => {
        modalSucessoEstorno.style.display = 'none';
    });
}
