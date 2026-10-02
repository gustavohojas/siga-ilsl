/**
 * Utilitários de formatação de valores para o SIGA-ILSL
 */

/**
 * Formata qualquer valor numérico de quantidade no padrão brasileiro com ponto de milhar (.).
 * Ex: 14511 -> "14.511", 1000 -> "1.000", 2.5 -> "2,5"
 */
export function formatQtd(val) {
    if (val === null || val === undefined || val === '') return '0';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return num.toLocaleString('pt-BR');
}

/**
 * Formata valores monetários em R$ (Real brasileiro).
 * Ex: 12073.45 -> "R$ 12.073,45"
 */
export function formatMoeda(val) {
    if (val === null || val === undefined || val === '') return 'R$ 0,00';
    const num = Number(val);
    if (isNaN(num)) return 'R$ 0,00';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
