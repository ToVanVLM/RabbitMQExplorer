/* tabs.js — tab beheer voor open queues */
window.TabManager = {
    tabs: [],   // { id, connId, vhost, queue, label }
    activeId: null,

    open(connId, vhost, queue) {
        const id = `${connId}:${vhost}:${queue}`;
        if (!this.tabs.find(t => t.id === id)) {
            this.tabs.push({ id, connId, vhost, queue, label: queue });
        }
        this.activate(id);
        this.render();
        // Track recent
        const connName = (window.AppContext?.connections ?? []).find(c => c.id === connId)?.name ?? '';
        window.SidebarExtras?.addRecent(connId, connName, vhost, queue);
    },

    close(id) {
        this.tabs = this.tabs.filter(t => t.id !== id);
        if (this.activeId === id) {
            this.activeId = this.tabs.length ? this.tabs[this.tabs.length - 1].id : null;
        }
        this.render();
        if (this.activeId) {
            const t = this.tabs.find(t => t.id === this.activeId);
            if (t) window.loadQueueContent(t.connId, t.vhost, t.queue);
            else showWelcome();
        } else {
            showWelcome();
        }
    },

    activate(id) {
        this.activeId = id;
        const t = this.tabs.find(t => t.id === id);
        if (t) window.loadQueueContent(t.connId, t.vhost, t.queue);
        this.render();
    },

    getActive() {
        return this.tabs.find(t => t.id === this.activeId) || null;
    },

    render() {
        const bar = document.getElementById('tabBar');
        if (!bar) return;
        bar.innerHTML = '';
        for (const tab of this.tabs) {
            const el = document.createElement('div');
            el.className = 'tab-item' + (tab.id === this.activeId ? ' active' : '');
            el.setAttribute('role', 'tab');
            el.setAttribute('aria-selected', tab.id === this.activeId);
            el.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12">
                    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                </svg>
                <span class="truncate" style="max-width:160px" title="${App.escHtml(tab.queue)}">${App.escHtml(tab.label)}</span>
                <span class="tab-item__close" onclick="event.stopPropagation(); TabManager.close('${tab.id}')" aria-label="Tab sluiten">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </span>`;
            el.addEventListener('click', (e) => {
                if (!e.target.closest('.tab-item__close')) this.activate(tab.id);
            });
            bar.appendChild(el);
        }
    }
};

window.openQueueTab = function (connId, vhostEncoded, queueEncoded) {
    const vhost = decodeURIComponent(vhostEncoded);
    const queue = decodeURIComponent(queueEncoded);
    TabManager.open(connId, vhost, queue);
};

function showWelcome() {
    const welcome = document.getElementById('welcomeState');
    const grid    = document.getElementById('msgGridWrap');
    const toolbar = document.getElementById('mainToolbar');
    if (welcome) welcome.style.display = 'flex';
    if (grid)    grid.style.display    = 'none';
    if (toolbar) toolbar.style.display = 'none';
    const filterBar     = document.getElementById('filterBar');
    const filterBuilder = document.getElementById('filterBuilder');
    if (filterBar)     filterBar.style.display     = 'none';
    if (filterBuilder) filterBuilder.style.display = 'none';
    document.getElementById('statusQueue').textContent = '';
    document.getElementById('statusMessages').textContent = '';
    document.getElementById('statusQueueSep').style.display = 'none';
}
