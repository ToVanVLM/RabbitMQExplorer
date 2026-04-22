/* activity-bar.js — navigatie naar beheerpagina's */
(() => {
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('btnConnectionsSettings')
            ?.addEventListener('click', (e) => { e.preventDefault(); window.location.href = '/Connections'; });
    });
})();
