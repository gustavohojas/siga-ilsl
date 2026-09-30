const PDFDocument = require('pdfkit');

/**
 * Gera um Buffer de PDF oficial para uma Guia de Dispensação.
 * @param {Object} guiaInfo
 * @param {string} guiaInfo.codigo - Ex: DSP-2026-0001
 * @param {string} guiaInfo.dataHora - Data e hora formatada
 * @param {Object} guiaInfo.centro - { codigo, nome }
 * @param {Object} guiaInfo.usuario - { nome, cpf }
 * @param {string} [guiaInfo.observacoes] - Observações opcionais
 * @param {Array} guiaInfo.itens - Lista de itens [{ descricao, codigo_siafisico, codigo_compras, lote, validade, quantidade, unidade }]
 * @returns {Promise<Buffer>}
 */
function gerarPdfGuiaDispensacao(guiaInfo) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 40,
                info: {
                    Title: `Guia de Dispensação ${guiaInfo.codigo}`,
                    Author: 'SIGA-ILSL',
                    Subject: 'Comprovante Oficial de Entrega de Materiais'
                }
            });

            const buffers = [];
            doc.on('data', chunk => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', err => reject(err));

            const primaryColor = '#1e3a8a'; // Azul escuro formal
            const textColor = '#1f2937';
            const lightBg = '#f3f4f6';
            const borderColor = '#d1d5db';

            // --- CABEÇALHO INSTITUCIONAL ---
            doc.rect(40, 40, 515, 60).fillAndStroke(lightBg, borderColor);

            doc.fillColor(primaryColor)
               .font('Helvetica-Bold')
               .fontSize(13)
               .text('INSTITUTO LAURO DE SOUZA LIMA', 50, 48, { align: 'center', width: 495 });

            doc.fillColor('#4b5563')
               .font('Helvetica')
               .fontSize(8.5)
               .text('SIGA-ILSL • Sistema Integrado de Gestão de Almoxarifado', 50, 66, { align: 'center', width: 495 });

            doc.fillColor(primaryColor)
               .font('Helvetica-Bold')
               .fontSize(11)
               .text('GUIA DE DISPENSAÇÃO DE MATERIAIS', 50, 80, { align: 'center', width: 495 });

            // --- DADOS DA GUIA ---
            let y = 112;
            doc.rect(40, y, 515, 64).stroke(borderColor);

            doc.fillColor(textColor).font('Helvetica-Bold').fontSize(8.5);
            doc.text('Protocolo / Guia:', 50, y + 8);
            doc.font('Helvetica').text(guiaInfo.codigo, 135, y + 8);

            doc.font('Helvetica-Bold').text('Data / Horário:', 320, y + 8);
            doc.font('Helvetica').text(guiaInfo.dataHora, 395, y + 8);

            doc.font('Helvetica-Bold').text('Destino (CC):', 50, y + 24);
            const centroNome = `${guiaInfo.centro.codigo} - ${guiaInfo.centro.nome}`;
            doc.font('Helvetica').text(centroNome, 135, y + 24);

            doc.font('Helvetica-Bold').text('Atendido por:', 50, y + 40);
            doc.font('Helvetica').text(guiaInfo.usuario.nome, 135, y + 40);

            if (guiaInfo.observacoes) {
                y += 72;
                doc.rect(40, y, 515, 24).fillAndStroke('#fffbeb', '#fde68a');
                doc.fillColor('#92400e').font('Helvetica-Bold').fontSize(8);
                doc.text('Observações / Motivo:', 50, y + 7);
                doc.font('Helvetica').text(guiaInfo.observacoes, 155, y + 7, { width: 385, lineBreak: false });
                y += 32;
            } else {
                y += 72;
            }

            // --- TABELA DE ITENS ---
            doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9.5);
            doc.text('ITENS DISPENSADOS', 40, y);
            y += 14;

            // Header da tabela
            doc.rect(40, y, 515, 20).fill(primaryColor);
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
            doc.text('#', 45, y + 6, { width: 20 });
            doc.text('DESCRIÇÃO DO MATERIAL', 70, y + 6, { width: 175 });
            doc.text('CÓDIGOS', 250, y + 6, { width: 75 });
            doc.text('LOTE', 330, y + 6, { width: 65 });
            doc.text('VALIDADE', 400, y + 6, { width: 55 });
            doc.text('QTD', 460, y + 6, { width: 40, align: 'right' });
            doc.text('UN', 510, y + 6, { width: 35 });
            y += 20;

            doc.font('Helvetica').fontSize(8);

            guiaInfo.itens.forEach((it, idx) => {
                const rowBg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
                doc.rect(40, y, 515, 22).fillAndStroke(rowBg, borderColor);

                doc.fillColor(textColor);
                doc.text(String(idx + 1), 45, y + 6, { width: 20 });
                doc.font('Helvetica-Bold').text(it.descricao || '-', 70, y + 6, { width: 175, height: 12, ellipsis: true });
                doc.font('Helvetica');

                const codigos = [it.codigo_siafisico, it.codigo_compras].filter(Boolean).join(' / ') || '-';
                doc.text(codigos, 250, y + 6, { width: 75, height: 12, ellipsis: true });
                doc.text(it.lote || '-', 330, y + 6, { width: 65 });
                
                let valFormatada = '-';
                if (it.validade) {
                    try {
                        const [ano, mes, dia] = it.validade.split('T')[0].split('-');
                        valFormatada = `${dia}/${mes}/${ano}`;
                    } catch (e) {
                        valFormatada = it.validade;
                    }
                }
                doc.text(valFormatada, 400, y + 6, { width: 55 });

                doc.font('Helvetica-Bold').text(String(it.quantidade), 460, y + 6, { width: 40, align: 'right' });
                doc.font('Helvetica').text(it.unidade || '', 510, y + 6, { width: 35 });

                y += 22;

                // Nova página caso a lista de itens seja muito longa
                if (y > 670 && idx < guiaInfo.itens.length - 1) {
                    doc.addPage();
                    y = 50;
                }
            });

            // --- RODAPÉ DE ASSINATURAS ---
            y = Math.max(y + 25, 700);

            doc.rect(40, y, 245, 95).stroke(borderColor);
            doc.rect(310, y, 245, 95).stroke(borderColor);

            // Almoxarifado
            doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5);
            doc.text('ENTREGUE POR (ALMOXARIFADO)', 50, y + 8);
            doc.fillColor(textColor).font('Helvetica').fontSize(8);
            doc.text(`Responsável: ${guiaInfo.usuario.nome}`, 50, y + 25);
            doc.text('Assinatura: _______________________________', 50, y + 55);
            doc.text('Data: ____/____/________', 50, y + 75);

            // Centro Consumidor
            doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5);
            doc.text('RECEBIDO POR (CENTRO CONSUMIDOR)', 320, y + 8);
            doc.fillColor(textColor).font('Helvetica').fontSize(8);
            doc.text('Nome Legível: ____________________________', 320, y + 25);
            doc.text('Matrícula / Cargo: ________________________', 320, y + 42);
            doc.text('Assinatura: _______________________________', 320, y + 60);
            doc.text('Data: ____/____/________', 320, y + 78);

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    gerarPdfGuiaDispensacao
};
