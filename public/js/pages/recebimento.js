import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderRecebimento(container) {
    container.innerHTML = `
        <div class="animate-fadeIn">
            <h2 class="mb-4">Recebimento de Materiais</h2>
            
            <div class="card mb-4">
                <div class="card-header" style="display:flex; gap:1rem;">
                    <button class="btn btn-primary" id="tab-ne">Via Empenho</button>
                    <button class="btn btn-outline" id="tab-doacao">Via Doação</button>
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
            </div>
        </div>
    `;

    const tabNe = document.getElementById('tab-ne');
    const tabDoacao = document.getElementById('tab-doacao');
    const viewNe = document.getElementById('view-ne');
    const viewDoacao = document.getElementById('view-doacao');
    const selectNe = document.getElementById('select-ne');
    const neDetails = document.getElementById('ne-details');
    const empresaInfo = document.getElementById('empresa-info');
    const tableItensNe = document.querySelector('#table-itens-ne tbody');

    tabNe.addEventListener('click', () => {
        tabNe.className = 'btn btn-primary';
        tabDoacao.className = 'btn btn-outline';
        viewNe.style.display = 'block';
        viewDoacao.style.display = 'none';
    });

    tabDoacao.addEventListener('click', () => {
        tabDoacao.className = 'btn btn-primary';
        tabNe.className = 'btn btn-outline';
        viewDoacao.style.display = 'block';
        viewNe.style.display = 'none';
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
                            '<td class="item-desc-text"><strong>' + item.descricao + '</strong><br><small style="color:var(--text-secondary)">' + (item.unidade || '') + '</small></td>' +
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

                        // Auto-check ao escanear código de barras
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
                '<label class="form-label" style="font-size:0.8rem">Unidade</label>' +
                '<select class="form-control d-un" required>' +
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
}
