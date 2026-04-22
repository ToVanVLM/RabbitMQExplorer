/* app.js — globale app utilities */
window.App = {
    formatBytes(b) {
        if (b < 1024) return `${b} B`;
        if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
        return `${(b / 1048576).toFixed(2)} MB`;
    },
    formatTs(ts) {
        if (!ts) return '';
        return new Date(ts * 1000).toLocaleString('nl-BE');
    },
    escHtml(s) {
        return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    },
    getCsrfToken() {
        const el = document.querySelector('input[name="__RequestVerificationToken"]');
        return el ? el.value : '';
    },
    async apiGet(url) {
        const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
    },
    async apiPost(url, body) {
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
    },
    async apiDelete(url) {
        const r = await fetch(url, { method: 'DELETE' });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.status !== 204 ? r.json() : null;
    }
};
