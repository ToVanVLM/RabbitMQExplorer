/* theme.js — licht/donker thema beheer */
(function () {
    const KEY = 'rmqe-theme';
    const saved = localStorage.getItem(KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', saved);

    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem(KEY, next);
            updateMonacoTheme(next);
        });
    });

    window.updateMonacoTheme = function (theme) {
        if (window.monaco) {
            monaco.editor.setTheme(theme === 'light' ? 'vs' : 'vs-dark');
        }
    };
})();
