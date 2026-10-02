import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderEmpenho(container) {
    container.innerHTML = `
        <div class="animate-fadeIn">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <div>
                    <h2>Notas de Empenho</h2>
                    <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 4px;">Gerencie as autorizações e registros de compras e serviços</p>
                </div>
                <button class="btn btn-primary" id="btn-novo-empenho">
                    <span style="font-size: 1.1rem; font-weight: bold;">+</span> Novo Empenho
                </button>
            </div>
            
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table" id="table-empenhos">
                            <thead>
                                <tr>
                                    <th>Nº da NE</th>
                                    <th>Empresa Fornecedora</th>
                                    <th>Licitação / Processo</th>
                                    <th>Prazo Limite</th>
                                    <th style="text-align: right;">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="5" class="text-center">Carregando empenhos...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL DE CADASTRO / EDIÇÃO DE EMPENHO (Fundo 100% Sólido e Opaco) -->
        <div id="modal-empenho" class="modal-overlay" style="display: none;">
            <div class="modal modal-large" style="background: #0f172a !important; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 25px 60px rgba(0,0,0,0.95); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; max-height: 92vh;">
                <div class="modal-header" style="background: #1e293b; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 1.25rem 1.75rem;">
                    <h3 id="modal-empenho-title" style="margin: 0; color: #fff; font-size: 1.25rem;">Cadastrar Nota de Empenho</h3>
                    <button type="button" class="btn btn-sm btn-outline" id="btn-close-modal" style="border: none; font-size: 1.5rem; line-height: 1; padding: 0.25rem 0.5rem; color: var(--text-secondary);">&times;</button>
                </div>
                
                <form id="form-empenho" style="display: flex; flex-direction: column; max-height: 92vh; margin: 0; overflow: hidden;">
                    <div class="modal-body" style="padding: 1.75rem; background: #0f172a; overflow-y: auto; flex: 1;">
                        <!-- DADOS DO EMPENHO -->
                        <div style="background: #1e293b; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem;">
                            <h4 style="margin-top: 0; margin-bottom: 1rem; color: #e2e8f0; font-size: 0.95rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">
                                📋 Dados da Nota de Empenho
                            </h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                                <div class="form-group mb-0">
                                    <label class="form-label" for="emp-numero">Nº da Nota de Empenho *</label>
                                    <input type="text" id="emp-numero" class="form-control" placeholder="Ex: 2026NE00012" required>
                                </div>
                                <div class="form-group mb-0">
                                    <label class="form-label" for="emp-tipo-licitacao">Seletor de Licitação *</label>
                                    <select id="emp-tipo-licitacao" class="form-control" required>
                                        <option value="pregao">Pregão Eletrônico</option>
                                        <option value="ata">ATA de Registro de Preço</option>
                                    </select>
                                </div>
                                <div class="form-group mb-0">
                                    <label class="form-label" for="emp-num-licitacao">Nº do Pregão ou ATA *</label>
                                    <input type="text" id="emp-num-licitacao" class="form-control" placeholder="Ex: 001/2026" required>
                                </div>
                                <div class="form-group mb-0">
                                    <label class="form-label" for="emp-prazo">Prazo (Data de Entrega) *</label>
                                    <input type="date" id="emp-prazo" class="form-control" required>
                                </div>
                            </div>
                        </div>
                        
                        <!-- DADOS DA EMPRESA -->
                        <div style="background: #1e293b; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem;">
                            <h4 style="margin-top: 0; margin-bottom: 1rem; color: #e2e8f0; font-size: 0.95rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">
                                🏢 Dados da Empresa Fornecedora
                            </h4>
                            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1rem; margin-bottom: 1rem;">
                                <div class="form-group mb-0">
                                    <label class="form-label" for="emp-cnpj">CNPJ *</label>
                                    <input type="text" id="emp-cnpj" class="form-control" placeholder="00.000.000/0000-00" required maxlength="18">
                                </div>
                                <div class="form-group mb-0">
                                    <label class="form-label" for="emp-razao">Razão Social *</label>
                                    <input type="text" id="emp-razao" class="form-control" placeholder="Nome da Empresa Fornecedora" required>
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                                <div class="form-group mb-0">
                                    <label class="form-label" for="emp-endereco">Endereço Completo</label>
                                    <input type="text" id="emp-endereco" class="form-control" placeholder="Rua, Número, Bairro, Cidade - UF">
                                </div>
                                <div class="form-group mb-0">
                                    <label class="form-label" for="emp-telefone">Telefone / Contato</label>
                                    <input type="text" id="emp-telefone" class="form-control" placeholder="(00) 00000-0000">
                                </div>
                            </div>
                        </div>
                        
                        <!-- SEÇÃO DE ITENS (ESPAÇOSA, VISUAL E SEM APERTO) -->
                        <div style="margin-bottom: 1rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <div>
                                    <h4 style="margin: 0; color: #fff; font-size: 1.05rem;">📦 Itens da Nota de Empenho</h4>
                                    <small style="color: var(--text-secondary);">Cadastre os produtos e quantidades autorizados nesta nota</small>
                                </div>
                                <button type="button" class="btn btn-outline" id="btn-add-item" style="border-color: var(--accent-primary); color: #fff; background: rgba(99, 102, 241, 0.15);">
                                    <span style="font-weight: bold; font-size: 1.1rem;">+</span> Adicionar Item
                                </button>
                            </div>
                            
                            <div id="empenho-itens" style="display: flex; flex-direction: column; gap: 1.25rem;">
                                <!-- Item Cards dinâmicos inseridos aqui -->
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer" style="background: #1e293b; border-top: 1px solid rgba(255,255,255,0.1); padding: 1.25rem 1.75rem; flex-shrink: 0;">
                        <button type="button" class="btn btn-outline" id="btn-cancel-empenho">Cancelar</button>
                        <button type="submit" class="btn btn-primary" id="btn-save-empenho" style="padding: 0.75rem 2rem;">
                            Salvar Nota de Empenho
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL DE VISUALIZAÇÃO DE DETALHES DA NE -->
        <div id="modal-view-empenho" class="modal-overlay" style="display: none;">
            <div class="modal modal-large" style="background: #0f172a !important; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 25px 60px rgba(0,0,0,0.95); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; max-height: 92vh;">
                <div class="modal-header" style="background: #1e293b; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 1.25rem 1.75rem;">
                    <h3 id="view-empenho-title" style="margin: 0; color: #fff;">Detalhes da Nota de Empenho</h3>
                    <button type="button" class="btn btn-sm btn-outline" id="btn-close-view" style="border: none; font-size: 1.5rem; line-height: 1; padding: 0.25rem 0.5rem; color: var(--text-secondary);">&times;</button>
                </div>
                <div class="modal-body" id="view-empenho-body" style="padding: 1.75rem; background: #0f172a; overflow-y: auto;">
                    <!-- Carregado via JS -->
                </div>
                <div class="modal-footer" style="background: #1e293b; border-top: 1px solid rgba(255,255,255,0.1); padding: 1rem 1.75rem;">
                    <button type="button" class="btn btn-secondary" id="btn-close-view-footer">Fechar</button>
                </div>
            </div>
        </div>
    `;

    const tableBody = document.querySelector('#table-empenhos tbody');
    const modal = document.getElementById('modal-empenho');
    const form = document.getElementById('form-empenho');
    const itensContainer = document.getElementById('empenho-itens');
    const modalView = document.getElementById('modal-view-empenho');
    const viewBody = document.getElementById('view-empenho-body');

    let naturezas = [];

    // Carregar lista de naturezas de despesa para o dropdown
    const loadNaturezas = async () => {
        try {
            naturezas = await api.get('/naturezas-despesa');
        } catch (error) {
            console.error('Erro ao carregar naturezas de despesa:', error);
            naturezas = [];
        }
    };

    // Carregar todas as notas de empenho
    const loadEmpenhos = async () => {
        try {
            const data = await api.get('/empenhos');
            if (data && data.length > 0) {
                tableBody.innerHTML = data.map(emp => {
                    const tipoDesc = emp.tipo_licitacao === 'pregao' ? 'Pregão Eletrônico' : 'ATA de Reg. Preço';
                    return `
                        <tr>
                            <td><strong>${emp.numero}</strong></td>
                            <td>${emp.razao_social || '-'} <br><small style="color:var(--text-secondary)">CNPJ: ${emp.cnpj || '-'}</small></td>
                            <td>${tipoDesc} <br><small style="color:var(--text-secondary)">Nº: ${emp.numero_licitacao || '-'}</small></td>
                            <td>${emp.prazo ? emp.prazo.split('-').reverse().join('/') : '-'}</td>
                            <td style="text-align: right; white-space: nowrap;">
                                <button class="btn btn-sm btn-outline btn-view" data-id="${emp.id}" title="Ver detalhes">🔍 Ver</button>
                                <button class="btn btn-sm btn-danger btn-delete" data-id="${emp.id}" title="Excluir" style="margin-left: 0.5rem;">🗑️ Excluir</button>
                            </td>
                        </tr>
                    `;
                }).join('');

                // Botões de Visualizar Detalhes
                document.querySelectorAll('.btn-view').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.currentTarget.getAttribute('data-id');
                        try {
                            const emp = await api.get('/empenhos/' + id);
                            if (emp) {
                                document.getElementById('view-empenho-title').textContent = `Nota de Empenho Nº ${emp.numero}`;
                                const tipoLabel = emp.tipo_licitacao === 'pregao' ? 'Pregão Eletrônico' : 'ATA de Registro de Preço';
                                const prazoFormatado = emp.prazo ? emp.prazo.split('-').reverse().join('/') : '-';

                                let itensHtml = '';
                                if (emp.itens && emp.itens.length > 0) {
                                    itensHtml = `
                                        <table class="table" style="margin-top: 1rem;">
                                            <thead>
                                                <tr>
                                                    <th>Item</th>
                                                    <th>Cód. Siafísico</th>
                                                    <th>Cód. Compras</th>
                                                    <th>Nat. Despesa</th>
                                                    <th>Quantidade</th>
                                                    <th>Recebido</th>
                                                    <th>Perecível</th>
                                                    <th>Garantia</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${emp.itens.map(it => {
                                                    const dataGarFmt = it.data_garantia ? (typeof it.data_garantia === 'string' ? it.data_garantia.split('T')[0].split('-').reverse().join('/') : new Date(it.data_garantia).toLocaleDateString('pt-BR')) : '';
                                                    return `
                                                    <tr>
                                                        <td><strong>${it.descricao}</strong></td>
                                                        <td>${it.codigo_siafisico || '-'}</td>
                                                        <td>${it.codigo_compras || '-'}</td>
                                                        <td>${it.natureza_despesa || '-'}</td>
                                                        <td>${it.quantidade} ${it.unidade}</td>
                                                        <td><span class="badge ${it.quantidade_recebida >= it.quantidade ? 'badge-success' : 'badge-warning'}">${it.quantidade_recebida || 0} / ${it.quantidade}</span></td>
                                                        <td>${it.perecivel ? '<span class="badge badge-warning">Sim</span>' : '<span class="badge badge-role">Não</span>'}</td>
                                                        <td>${it.garantia ? ('<span class="badge badge-info">Sim' + (dataGarFmt ? ` (${dataGarFmt})` : '') + '</span>') : '<span class="badge badge-role">Não</span>'}</td>
                                                    </tr>
                                                `; }).join('')}
                                            </tbody>
                                        </table>
                                    `;
                                } else {
                                    itensHtml = '<p class="text-muted" style="margin-top: 1rem;">Nenhum item cadastrado nesta nota.</p>';
                                }

                                viewBody.innerHTML = `
                                    <div style="background: #1e293b; padding: 1.25rem; border-radius: 10px; margin-bottom: 1.5rem; border: 1px solid rgba(255,255,255,0.08);">
                                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                                            <div><strong style="color:var(--text-secondary)">Licitação:</strong><br>${tipoLabel} Nº ${emp.numero_licitacao}</div>
                                            <div><strong style="color:var(--text-secondary)">Prazo de Entrega:</strong><br>${prazoFormatado}</div>
                                            <div><strong style="color:var(--text-secondary)">Fornecedor:</strong><br>${emp.razao_social || '-'}</div>
                                            <div><strong style="color:var(--text-secondary)">CNPJ:</strong><br>${emp.cnpj || '-'}</div>
                                            <div><strong style="color:var(--text-secondary)">Telefone:</strong><br>${emp.telefone || '-'}</div>
                                            <div><strong style="color:var(--text-secondary)">Endereço:</strong><br>${emp.endereco || '-'}</div>
                                        </div>
                                    </div>
                                    <h4 style="margin: 0; color:#fff;">Itens Contratados</h4>
                                    <div class="table-responsive">${itensHtml}</div>
                                `;

                                modalView.style.display = 'flex';
                                modalView.classList.add('active');
                            }
                        } catch (err) {
                            showToast({ message: 'Erro ao carregar detalhes do empenho.', type: 'error' });
                        }
                    });
                });
                
                // Botões de Excluir
                document.querySelectorAll('.btn-delete').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const id = e.currentTarget.getAttribute('data-id');
                        if (confirm('Tem certeza que deseja excluir esta Nota de Empenho?')) {
                            try {
                                await api.del('/empenhos/' + id);
                                showToast({ message: 'Nota de Empenho excluída com sucesso!', type: 'success' });
                                loadEmpenhos();
                            } catch (error) {
                                showToast({ message: error.message || 'Erro ao excluir empenho.', type: 'error' });
                            }
                        }
                    });
                });
            } else {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding: 2rem;">Nenhuma Nota de Empenho cadastrada ainda. Clique no botão "+ Novo Empenho" para começar.</td></tr>';
            }
        } catch (error) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger" style="padding: 2rem;">Erro ao carregar notas de empenho.</td></tr>';
        }
    };

    // Criar um card de item espaçoso, elegante e totalmente legível
    let itemCount = 0;
    const createItemCard = () => {
        itemCount++;
        const card = document.createElement('div');
        card.className = 'item-card';

        const natOptions = naturezas && naturezas.length > 0 
            ? naturezas.map(n => `<option value="${n.nome}">${n.nome}</option>`).join('') 
            : '<option value="Material de Consumo">Material de Consumo</option>';

        card.innerHTML = `
            <div class="item-card-header">
                <span class="item-card-title">
                    <span class="item-badge">Item #${itemCount}</span>
                    <span>Informações do Material</span>
                </span>
                <button type="button" class="btn btn-sm btn-outline btn-remove-item" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4); padding: 0.35rem 0.75rem; font-size: 0.8rem;">
                    ✕ Remover Item
                </button>
            </div>
            
            <!-- LINHA 1: DESCRIÇÃO AMPLA E NATUREZA DE DESPESA -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                <div class="form-group mb-0">
                    <label class="form-label">Nome / Descrição Completa do Produto *</label>
                    <input type="text" class="form-control item-desc" placeholder="Ex: Luva Cirúrgica Estéril Tam. M" required>
                </div>
                <div class="form-group mb-0">
                    <label class="form-label">Natureza de Despesa</label>
                    <select class="form-control item-nat">
                        <option value="">Selecione a categoria...</option>
                        ${natOptions}
                    </select>
                </div>
            </div>

            <!-- LINHA 2: CÓDIGOS, QUANTIDADE, UNIDADE E PERECÍVEL -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 1rem; align-items: end;">
                <div class="form-group mb-0">
                    <label class="form-label">Cód. Siafísico *</label>
                    <input type="text" class="form-control item-siafisico" placeholder="Ex: 123456" required>
                </div>
                <div class="form-group mb-0">
                    <label class="form-label">Cód. Compras *</label>
                    <input type="text" class="form-control item-compras" placeholder="Ex: 654321" required>
                </div>
                <div class="form-group mb-0">
                    <label class="form-label">Quantidade *</label>
                    <input type="number" class="form-control item-qtd" placeholder="Qtd" required min="1" step="any" value="1">
                </div>
                <div class="form-group mb-0">
                    <label class="form-label" title="Informe a unidade em que o produto será dispensado aos centros consumidores">Menor un. de dispensação * <i class="fas fa-info-circle text-muted" title="Informe a unidade em que o produto será dispensado aos centros consumidores" style="cursor:help; font-size:0.85rem;"></i></label>
                    <select class="form-control item-un" required title="Informe a unidade em que o produto será dispensado aos centros consumidores">
                        <option value="Unidade">Unidade</option>
                        <option value="Caixa">Caixa</option>
                        <option value="Pacote">Pacote</option>
                        <option value="Litro">Litro</option>
                        <option value="Quilograma">Quilograma</option>
                        <option value="Metro">Metro</option>
                        <option value="Resma">Resma</option>
                        <option value="Galão">Galão</option>
                        <option value="Frasco">Frasco</option>
                        <option value="Rolo">Rolo</option>
                        <option value="Saco">Saco</option>
                        <option value="Lata">Lata</option>
                        <option value="Tubo">Tubo</option>
                        <option value="Par">Par</option>
                        <option value="Jogo">Jogo</option>
                        <option value="Kit">Kit</option>
                        <option value="Outros">Outros</option>
                    </select>
                </div>
                <div class="form-group mb-0">
                    <label class="form-label">Perecível?</label>
                    <select class="form-control item-per" required>
                        <option value="Não" selected>Não</option>
                        <option value="Sim">Sim</option>
                    </select>
                </div>
            </div>

            <!-- LINHA 3: CONTROLE DE GARANTIA -->
            <div style="margin-top: 0.75rem; padding: 0.75rem 1rem; background: rgba(99, 102, 241, 0.05); border-radius: 8px; border: 1px solid rgba(99, 102, 241, 0.15); display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;">
                <label style="display: inline-flex; align-items: center; gap: 0.5rem; margin: 0; cursor: pointer; color: #fff; font-weight: 500;">
                    <input type="checkbox" class="item-gar" style="width: 1.15rem; height: 1.15rem; accent-color: var(--accent-primary);">
                    Possui garantia? <small style="color: var(--text-secondary); font-weight: normal; margin-left: 0.5rem;">(A data da garantia será informada no ato do recebimento)</small>
                </label>
            </div>
        `;

        card.querySelector('.btn-remove-item').addEventListener('click', () => {
            if (itensContainer.children.length > 1) {
                card.remove();
                // Renumera os badges dos cards restantes
                Array.from(itensContainer.children).forEach((c, idx) => {
                    const badge = c.querySelector('.item-badge');
                    if (badge) badge.textContent = `Item #${idx + 1}`;
                });
                itemCount = itensContainer.children.length;
            } else {
                showToast({ message: 'A Nota de Empenho deve ter pelo menos um item.', type: 'warning' });
            }
        });

        itensContainer.appendChild(card);
    };

    // Botão "+ Novo Empenho"
    document.getElementById('btn-novo-empenho').addEventListener('click', () => {
        form.reset();
        itensContainer.innerHTML = '';
        itemCount = 0;
        createItemCard();
        modal.style.display = 'flex';
        modal.classList.add('active');
    });

    // Fechar modal
    const closeModal = () => {
        modal.style.display = 'none';
        modal.classList.remove('active');
    };
    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-empenho').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Fechar modal de visualização
    const closeViewModal = () => {
        modalView.style.display = 'none';
        modalView.classList.remove('active');
    };
    document.getElementById('btn-close-view').addEventListener('click', closeViewModal);
    document.getElementById('btn-close-view-footer').addEventListener('click', closeViewModal);
    modalView.addEventListener('click', (e) => {
        if (e.target === modalView) closeViewModal();
    });

    // Botão "+ Adicionar Item"
    document.getElementById('btn-add-item').addEventListener('click', createItemCard);

    // Máscara dinâmica de CNPJ
    const cnpjInput = document.getElementById('emp-cnpj');
    cnpjInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 14) val = val.slice(0, 14);
        let masked = val;
        if (val.length > 12) masked = val.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
        else if (val.length > 8) masked = val.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
        else if (val.length > 5) masked = val.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
        else if (val.length > 2) masked = val.replace(/(\d{2})(\d{1,3})/, '$1.$2');
        e.target.value = masked;
    });

    // Submissão do formulário de Empenho
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('btn-save-empenho');
        btn.disabled = true;
        btn.innerHTML = 'Salvando Empenho...';

        try {
            const cnpjClean = cnpjInput.value.replace(/\D/g, '');
            if (cnpjClean.length < 14) {
                showToast({ message: 'CNPJ inválido ou incompleto (deve conter 14 dígitos).', type: 'warning' });
                btn.disabled = false;
                btn.innerHTML = 'Salvar Nota de Empenho';
                return;
            }

            const itensNodes = itensContainer.children;
            const itens = [];
            
            for (let i = 0; i < itensNodes.length; i++) {
                const node = itensNodes[i];
                const desc = node.querySelector('.item-desc').value.trim();
                const qtd = parseFloat(node.querySelector('.item-qtd').value);
                const un = node.querySelector('.item-un').value;
                const siafisico = node.querySelector('.item-siafisico').value.trim();
                const compras = node.querySelector('.item-compras').value.trim();
                const nat = node.querySelector('.item-nat').value;
                const per = node.querySelector('.item-per').value === 'Sim';
                const gar = node.querySelector('.item-gar') ? node.querySelector('.item-gar').checked : false;

                if (!desc) {
                    showToast({ message: `Informe a descrição do item #${i + 1}.`, type: 'warning' });
                    btn.disabled = false;
                    btn.innerHTML = 'Salvar Nota de Empenho';
                    node.querySelector('.item-desc').focus();
                    return;
                }

                if (!siafisico) {
                    showToast({ message: `Informe o Cód. Siafísico do item #${i + 1}.`, type: 'warning' });
                    btn.disabled = false;
                    btn.innerHTML = 'Salvar Nota de Empenho';
                    node.querySelector('.item-siafisico').focus();
                    return;
                }

                if (!compras) {
                    showToast({ message: `Informe o Cód. Compras do item #${i + 1}.`, type: 'warning' });
                    btn.disabled = false;
                    btn.innerHTML = 'Salvar Nota de Empenho';
                    node.querySelector('.item-compras').focus();
                    return;
                }

                if (isNaN(qtd) || qtd <= 0) {
                    showToast({ message: `Informe uma quantidade válida para o item #${i + 1}.`, type: 'warning' });
                    btn.disabled = false;
                    btn.innerHTML = 'Salvar Nota de Empenho';
                    node.querySelector('.item-qtd').focus();
                    return;
                }

                itens.push({
                    descricao: desc,
                    quantidade: qtd,
                    unidade: un,
                    codigo_siafisico: siafisico,
                    codigo_compras: compras,
                    natureza_despesa: nat || null,
                    perecivel: per,
                    garantia: gar,
                    data_garantia: null
                });
            }

            if (itens.length === 0) {
                showToast({ message: 'Adicione pelo menos um item à Nota de Empenho.', type: 'warning' });
                btn.disabled = false;
                btn.innerHTML = 'Salvar Nota de Empenho';
                return;
            }

            const prazoVal = document.getElementById('emp-prazo').value;
            if (!prazoVal) {
                showToast({ message: 'Informe a data limite (prazo).', type: 'warning' });
                btn.disabled = false;
                btn.innerHTML = 'Salvar Nota de Empenho';
                return;
            }

            const body = {
                numero: document.getElementById('emp-numero').value.trim(),
                tipo_licitacao: document.getElementById('emp-tipo-licitacao').value,
                numero_licitacao: document.getElementById('emp-num-licitacao').value.trim(),
                prazo: prazoVal,
                empresa: {
                    cnpj: cnpjClean,
                    razao_social: document.getElementById('emp-razao').value.trim(),
                    endereco: document.getElementById('emp-endereco').value.trim() || null,
                    telefone: document.getElementById('emp-telefone').value.trim() || null
                },
                itens
            };

            await api.post('/empenhos', body);
            showToast({ message: 'Nota de Empenho cadastrada com sucesso!', type: 'success' });
            closeModal();
            loadEmpenhos();
        } catch (error) {
            showToast({ message: error.message || 'Erro ao salvar empenho.', type: 'error' });
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Salvar Nota de Empenho';
        }
    });

    await loadNaturezas();
    loadEmpenhos();
}
