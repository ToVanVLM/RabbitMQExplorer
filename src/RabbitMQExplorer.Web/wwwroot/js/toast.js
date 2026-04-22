/* toast.js — notificatie toasts */
window.Toast = {
    show(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        const icons = { info: 'ℹ', success: '✓', error: '✗', warn: '⚠' };
        el.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
        container.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 300ms'; setTimeout(() => el.remove(), 300); }, duration);
    },
    success: (msg) => Toast.show(msg, 'success'),
    error:   (msg) => Toast.show(msg, 'error', 6000),
    warn:    (msg) => Toast.show(msg, 'warn'),
    info:    (msg) => Toast.show(msg, 'info'),
};
