export function showModal({ title, content, onConfirm, onCancel, confirmText = 'Confirmar', cancelText = 'Cancelar' }) {
    let overlay = document.getElementById('modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modal-overlay';
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="btn btn-sm" id="modal-close" style="background: transparent; color: var(--text-muted); font-size: 1.5rem;">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" id="modal-btn-cancel">${cancelText}</button>
                <button class="btn btn-primary" id="modal-btn-confirm">${confirmText}</button>
            </div>
        </div>
    `;

    requestAnimationFrame(() => overlay.classList.add('active'));

    const cleanup = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
        document.removeEventListener('keydown', handleKeydown);
    };

    document.getElementById('modal-close').addEventListener('click', () => {
        if (onCancel) onCancel();
        cleanup();
    });

    document.getElementById('modal-btn-cancel').addEventListener('click', () => {
        if (onCancel) onCancel();
        cleanup();
    });

    document.getElementById('modal-btn-confirm').addEventListener('click', () => {
        if (onConfirm) onConfirm();
        cleanup();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            if (onCancel) onCancel();
            cleanup();
        }
    });

    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            if (onCancel) onCancel();
            cleanup();
        }
    };
    document.addEventListener('keydown', handleKeydown);
}

export function showConfirm(message) {
    return new Promise((resolve) => {
        showModal({
            title: 'Confirmação',
            content: `<p>${message}</p>`,
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false),
            confirmText: 'Sim',
            cancelText: 'Não'
        });
    });
}

export function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    }
}
