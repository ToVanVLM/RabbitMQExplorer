/* sidebar.js — sidebar tree management */
window.SidebarState = {
    activeConnectionId: null,
    activeVHost: null,
    activeQueue: null
};

window.toggleConnection = async function (id, el) {
    const list = document.getElementById(`vhosts-${id}`);
    if (!list) return;
    const isOpen = list.style.display !== 'none';
    if (isOpen) {
        list.style.display = 'none';
        return;
    }
    list.innerHTML = '<li class="tree-item text-muted">Laden...</li>';
    list.style.display = 'block';
    try {
        const vhosts = await App.apiGet(`/api/connections/${id}/vhosts`);
        list.innerHTML = '';
        for (const vhost of vhosts) {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="tree-item tree-item--vhost" onclick="toggleVHost(${id}, '${encodeURIComponent(vhost.name)}', this)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><path d="M3 3h18v5H3zM3 10h18v5H3zM3 17h18v4H3z"/></svg>
                    <span class="truncate flex-1">${App.escHtml(vhost.name)}</span>
                </div>
                <ul class="tree" id="queues-${id}-${encodeURIComponent(vhost.name)}" style="display:none"></ul>`;
            list.appendChild(li);
        }
    } catch (e) {
        list.innerHTML = `<li class="tree-item text-error">${App.escHtml(e.message)}</li>`;
    }
};

function buildQueueItem(connId, vhost, q, connName) {
    const isDlq = (q.arguments?.['x-dead-letter-exchange'] !== undefined) ||
                  q.name.toLowerCase().includes('dead') ||
                  q.name.toLowerCase().includes('dlq') ||
                  q.name.toLowerCase().includes('dlx');
    const thresholds = window.QueueThresholds ?? { warnMessages: 1000, dangerMessages: 10000 };
    const countClass = q.messages >= thresholds.dangerMessages ? 'danger'
                     : q.messages >= thresholds.warnMessages  ? 'warn' : '';
    const icon = isDlq
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`;
    const isFav = window.SidebarExtras?.isFavorite(connId, vhost, q.name) ?? false;
    const venc = encodeURIComponent(vhost);
    const qenc = encodeURIComponent(q.name);

    const healthHtml = buildHealthHtml(q.messages, q.messagesUnacknowledged ?? 0, q.consumers ?? 0);

    const li = document.createElement('li');
    li.setAttribute('data-queue-entry', '');
    li.innerHTML = `
        <div class="tree-item tree-item--queue ${isDlq ? 'dlq' : ''}"
             data-conn="${connId}" data-vhost="${App.escHtml(vhost)}" data-queue="${App.escHtml(q.name)}"
             data-conn-name="${App.escHtml(connName)}"
             data-queue-search="${q.name.toLowerCase()}"
             id="qi-${connId}-${venc}-${qenc}"
             onclick="openQueueTab(${connId}, '${venc}', '${qenc}')"
             ondragover="event.preventDefault(); this.classList.add('drag-over')"
             ondragleave="this.classList.remove('drag-over')"
             ondrop="handleDropOnQueue(event, ${connId}, '${App.escHtml(vhost)}', '${App.escHtml(q.name)}')">
            ${icon}
            <span class="truncate flex-1" title="${App.escHtml(q.name)}">${App.escHtml(q.name)}</span>
            ${isDlq ? '<span class="q-risk-badge q-risk-badge--dlq" title="Dead Letter Queue">DLQ</span>' : ''}
            <button class="btn-fav ${isFav ? 'active' : ''}"
                    onclick="event.stopPropagation(); SidebarExtras.toggleFavorite(${connId}, '${App.escHtml(connName)}', '${App.escHtml(vhost)}', '${App.escHtml(q.name)}', this)"
                    title="${isFav ? 'Uit favorieten' : 'Aan favorieten toevoegen'}" aria-label="Favoriet">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </button>
            <span class="tree-item__health" id="health-${connId}-${venc}-${qenc}">${healthHtml}</span>
            <span class="tree-item__badge ${countClass}" id="badge-${connId}-${venc}-${qenc}">${q.messages.toLocaleString('nl-BE')}</span>
        </div>`;
    return li;
}

function buildHealthHtml(messages, unacked, consumers) {
    const thresholds = window.QueueThresholds ?? { warnUnacked: 100, dangerUnacked: 1000 };
    let html = '';
    if (consumers === 0 && messages > 0) {
        html += `<span class="q-risk-badge q-risk-badge--noconsumers" title="Geen consumers — queue staat vast">NC</span>`;
    }
    if (unacked > 0) {
        const cls = unacked >= thresholds.dangerUnacked ? 'danger' : unacked >= thresholds.warnUnacked ? 'warn' : '';
        const label = unacked > 9999 ? Math.floor(unacked / 1000) + 'k' : unacked;
        html += `<span class="q-health-unacked ${cls}" title="${unacked} onbevestigd">↑${label}</span>`;
    }
    html += `<span class="q-health-consumers" title="${consumers} consumer(s)">${consumers}c</span>`;
    return html;
}

window.toggleVHost = async function (connId, vhostEncoded, el) {
    const vhost = decodeURIComponent(vhostEncoded);
    const listId = `queues-${connId}-${vhostEncoded}`;
    const list = document.getElementById(listId);
    if (!list) return;
    const isOpen = list.style.display !== 'none';
    if (isOpen) { list.style.display = 'none'; return; }
    list.innerHTML = '<li class="tree-item text-muted">Laden...</li>';
    list.style.display = 'block';
    try {
        const queues = await App.apiGet(`/api/connections/${connId}/vhosts/${vhostEncoded}/queues`);
        list.innerHTML = '';
        const connName = (window.AppContext?.connections ?? []).find(c => c.id === connId)?.name ?? '';
        for (const q of queues.sort((a, b) => a.name.localeCompare(b.name))) {
            list.appendChild(buildQueueItem(connId, vhost, q, connName));
        }
        if (!queues.length) {
            list.innerHTML = '<li class="tree-item text-muted" style="padding-left:44px">Geen queues</li>';
        }
        const term = document.getElementById('sidebarSearch')?.value?.toLowerCase() ?? '';
        if (term) window.SidebarExtras?.filterQueues(term);
    } catch (e) {
        list.innerHTML = `<li class="tree-item text-error">${App.escHtml(e.message)}</li>`;
    }
};

// ── Live updates via SignalR ──────────────────────────────
window.updateQueueHealth = function (update) {
    const { connectionId, vHost, queueName, messages, messagesUnacknowledged, consumers, state } = update;
    const venc = encodeURIComponent(vHost);
    const qenc = encodeURIComponent(queueName);
    const thresholds = window.QueueThresholds ?? { warnMessages: 1000, dangerMessages: 10000 };

    const badge = document.getElementById(`badge-${connectionId}-${venc}-${qenc}`);
    if (badge) {
        badge.textContent = messages.toLocaleString('nl-BE');
        badge.className = 'tree-item__badge ' +
            (messages >= thresholds.dangerMessages ? 'danger' : messages >= thresholds.warnMessages ? 'warn' : '');
    }

    const healthEl = document.getElementById(`health-${connectionId}-${venc}-${qenc}`);
    if (healthEl) {
        healthEl.innerHTML = buildHealthHtml(messages, messagesUnacknowledged ?? 0, consumers ?? 0);
    }
};

// Kept for backwards compatibility (sparkline.js may call this)
window.updateQueueBadge = function (connId, vhost, queue, count) {
    const badge = document.getElementById(`badge-${connId}-${encodeURIComponent(vhost)}-${encodeURIComponent(queue)}`);
    if (!badge) return;
    badge.textContent = count.toLocaleString('nl-BE');
    const thresholds = window.QueueThresholds ?? { warnMessages: 1000, dangerMessages: 10000 };
    badge.className = 'tree-item__badge ' +
        (count >= thresholds.dangerMessages ? 'danger' : count >= thresholds.warnMessages ? 'warn' : '');
};

window.updateConnectionRefreshed = function (connId, timestamp) {
    const el = document.getElementById(`refreshed-${connId}`);
    if (!el) return;
    const t = new Date(timestamp);
    el.textContent = t.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    el.title = `Bijgewerkt om ${t.toLocaleString('nl-BE')}`;
};
