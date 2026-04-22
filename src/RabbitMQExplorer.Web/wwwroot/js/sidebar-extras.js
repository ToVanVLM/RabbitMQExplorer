/* sidebar-extras.js — zoeken, favorieten en recente queues */

const QUEUE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`;

window.SidebarExtras = (() => {
    const FAV_KEY    = 'rmqe-favorites';
    const RECENT_KEY = 'rmqe-recent';
    const RECENT_MAX = 10;
    const SECTION_KEY = 'rmqe-sidebar-sections';

    // ── Opslag helpers ─────────────────────────────────────
    const getFavs   = () => JSON.parse(localStorage.getItem(FAV_KEY)    ?? '[]');
    const getRecent = () => JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    const getSectionState = () => JSON.parse(localStorage.getItem(SECTION_KEY) ?? '{"favorites":true,"recent":true}');

    // ── Favorieten ─────────────────────────────────────────
    function isFavorite(connId, vhost, queue) {
        return getFavs().some(f => f.connId === connId && f.vhost === vhost && f.queue === queue);
    }

    function toggleFavorite(connId, connName, vhost, queue, btnEl) {
        let favs = getFavs();
        const idx = favs.findIndex(f => f.connId === connId && f.vhost === vhost && f.queue === queue);
        if (idx >= 0) {
            favs.splice(idx, 1);
        } else {
            favs.unshift({ connId, connName, vhost, queue });
        }
        localStorage.setItem(FAV_KEY, JSON.stringify(favs));
        renderFavorites();
        // Update star button in tree
        if (btnEl) {
            const nowFav = idx < 0;
            btnEl.classList.toggle('active', nowFav);
            btnEl.title = nowFav ? 'Uit favorieten' : 'Aan favorieten toevoegen';
            btnEl.querySelector('svg').setAttribute('fill', nowFav ? 'currentColor' : 'none');
        }
    }

    function renderFavorites() {
        const list = document.getElementById('favoritesList');
        const countEl = document.getElementById('favoritesCount');
        if (!list) return;
        const favs = getFavs();
        if (countEl) countEl.textContent = favs.length ? String(favs.length) : '';
        if (!favs.length) {
            list.innerHTML = `<li class="sidebar__empty-hint">Geen favorieten — klik ★ op een queue</li>`;
            return;
        }
        list.innerHTML = favs.map(f => `
            <li>
                <div class="tree-item tree-item--queue tree-item--shortcut"
                     onclick="openQueueTab(${f.connId}, '${encodeURIComponent(f.vhost)}', '${encodeURIComponent(f.queue)}')">
                    ${QUEUE_ICON}
                    <span class="truncate flex-1" title="${App.escHtml(f.queue)}">${App.escHtml(f.queue)}</span>
                    <span class="tree-item__shortcut-env">${App.escHtml(f.connName)}</span>
                    <button class="btn-fav active"
                            onclick="event.stopPropagation(); SidebarExtras.toggleFavorite(${f.connId}, '${App.escHtml(f.connName)}', '${App.escHtml(f.vhost)}', '${App.escHtml(f.queue)}', null)"
                            title="Uit favorieten" aria-label="Uit favorieten">
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </button>
                </div>
            </li>`).join('');
    }

    // ── Recente queues ─────────────────────────────────────
    function addRecent(connId, connName, vhost, queue) {
        let recent = getRecent().filter(r => !(r.connId === connId && r.vhost === vhost && r.queue === queue));
        recent.unshift({ connId, connName, vhost, queue, ts: Date.now() });
        recent = recent.slice(0, RECENT_MAX);
        localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
        renderRecent();
    }

    function renderRecent() {
        const list = document.getElementById('recentList');
        if (!list) return;
        const recent = getRecent();
        if (!recent.length) {
            list.innerHTML = `<li class="sidebar__empty-hint">Geen recente queues</li>`;
            return;
        }
        list.innerHTML = recent.map(r => `
            <li>
                <div class="tree-item tree-item--queue tree-item--shortcut"
                     onclick="openQueueTab(${r.connId}, '${encodeURIComponent(r.vhost)}', '${encodeURIComponent(r.queue)}')">
                    ${QUEUE_ICON}
                    <span class="truncate flex-1" title="${App.escHtml(r.queue)}">${App.escHtml(r.queue)}</span>
                    <span class="tree-item__shortcut-env">${App.escHtml(r.connName)}</span>
                </div>
            </li>`).join('');
    }

    // ── Zoeken ─────────────────────────────────────────────
    function filterQueues(term) {
        const entries = document.querySelectorAll('[data-queue-entry]');
        let visible = 0;
        entries.forEach(li => {
            const name = li.querySelector('[data-queue-search]')?.dataset?.queueSearch ?? '';
            const match = !term || name.includes(term);
            li.style.display = match ? '' : 'none';
            if (match) visible++;
        });
        // Auto-expand parent vhost/connection lists that have visible items
        if (term) {
            document.querySelectorAll('[data-queue-entry]').forEach(li => {
                if (li.style.display !== 'none') {
                    let parent = li.parentElement;
                    while (parent && parent.tagName === 'UL') {
                        parent.style.display = 'block';
                        parent = parent.parentElement?.parentElement;
                    }
                }
            });
        }
        // Update search result count in placeholder
        const input = document.getElementById('sidebarSearch');
        if (input) input.placeholder = term ? `${visible} queue(s) gevonden` : 'Zoek queue...';
    }

    // ── Sectie in/uitklappen ───────────────────────────────
    function toggleSection(name) {
        const list    = document.getElementById(name === 'favorites' ? 'favoritesList' : 'recentList');
        const chevron = document.getElementById(`chevron${name.charAt(0).toUpperCase() + name.slice(1)}`);
        if (!list) return;
        const isOpen = list.style.display !== 'none';
        list.style.display = isOpen ? 'none' : '';
        if (chevron) chevron.style.transform = isOpen ? 'rotate(-90deg)' : '';
        // Persist
        const state = getSectionState();
        state[name] = !isOpen;
        localStorage.setItem(SECTION_KEY, JSON.stringify(state));
    }

    function restoreSectionState() {
        const state = getSectionState();
        ['favorites', 'recent'].forEach(name => {
            const list    = document.getElementById(name === 'favorites' ? 'favoritesList' : 'recentList');
            const chevron = document.getElementById(`chevron${name.charAt(0).toUpperCase() + name.slice(1)}`);
            if (!list) return;
            const open = state[name] !== false;
            list.style.display = open ? '' : 'none';
            if (chevron) chevron.style.transform = open ? '' : 'rotate(-90deg)';
        });
    }

    // ── Init ───────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        renderFavorites();
        renderRecent();
        restoreSectionState();

        // Sidebar zoekbalk
        const searchEl = document.getElementById('sidebarSearch');
        const clearBtn = document.getElementById('sidebarSearchClear');

        searchEl?.addEventListener('input', () => {
            const term = searchEl.value.toLowerCase().trim();
            filterQueues(term);
            if (clearBtn) clearBtn.style.display = term ? '' : 'none';
        });

        clearBtn?.addEventListener('click', () => {
            searchEl.value = '';
            clearBtn.style.display = 'none';
            filterQueues('');
            searchEl.placeholder = 'Zoek queue...';
            searchEl.focus();
        });
    });

    return { isFavorite, toggleFavorite, addRecent, renderFavorites, renderRecent, filterQueues, toggleSection };
})();
