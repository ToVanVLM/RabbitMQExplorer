/* messages.js — message grid, ophalen, filtering, sortering, operaties */
window.MessageState = {
    connId: null,
    vhost: null,
    queue: null,
    messages: [],
    filtered: [],
    selected: new Set(),
    sortCol: 'index',
    sortAsc: true,
    searchTerm: '',
    refreshTimer: null,
    extractionRules: []
};

// ── FILTER STATE (chips) ──────────────────────────────────
window.FilterState = {
    chips: [],
    _nextId: 1,

    add(field, fieldLabel, value) {
        this.chips.push({ id: this._nextId++, field, fieldLabel, value });
        this.render();
        applyFilterAndSort();
    },

    remove(id) {
        this.chips = this.chips.filter(c => c.id !== id);
        this.render();
        applyFilterAndSort();
    },

    clear() {
        this.chips = [];
        this.render();
        applyFilterAndSort();
    },

    render() {
        const container = document.getElementById('filterChips');
        const clearBtn  = document.getElementById('btnClearFilters');
        const filterBar = document.getElementById('filterBar');
        if (!container) return;

        container.innerHTML = this.chips.map(c => `
            <span class="filter-chip">
                <span class="filter-chip__field">${App.escHtml(c.fieldLabel)}</span>
                <span class="filter-chip__value">"${App.escHtml(c.value)}"</span>
                <button class="filter-chip__remove" onclick="FilterState.remove(${c.id})" title="Filter verwijderen">×</button>
            </span>`).join('');

        const hasChips = this.chips.length > 0;
        const builderVisible = document.getElementById('filterBuilder')?.style.display !== 'none';
        if (clearBtn)  clearBtn.style.display  = hasChips ? '' : 'none';
        if (filterBar) filterBar.style.display = (hasChips || builderVisible) ? '' : 'none';
    }
};

window.loadQueueContent = async function (connId, vhost, queue) {
    MessageState.connId = connId;
    MessageState.vhost = vhost;
    MessageState.queue = queue;
    MessageState.messages = [];
    MessageState.selected.clear();

    const welcome = document.getElementById('welcomeState');
    const grid    = document.getElementById('msgGridWrap');
    const toolbar = document.getElementById('mainToolbar');
    if (welcome) welcome.style.display = 'none';
    if (grid)    grid.style.display = 'flex';
    if (toolbar) toolbar.style.removeProperty('display');

    // Reset zoek + filters bij nieuwe queue
    MessageState.searchTerm = '';
    const searchEl = document.getElementById('msgSearch');
    if (searchEl) searchEl.value = '';
    const clearBtn = document.getElementById('msgSearchClear');
    if (clearBtn)  clearBtn.style.display = 'none';
    FilterState.chips = [];
    FilterState.render();
    const fb = document.getElementById('filterBuilder');
    if (fb) fb.style.display = 'none';

    document.getElementById('statusConnection').textContent = '';
    document.getElementById('statusQueue').textContent = queue;
    document.getElementById('statusQueueSep').style.removeProperty('display');
    document.getElementById('msgTbody').innerHTML = '<tr><td colspan="99" class="text-muted" style="text-align:center;padding:20px">Klik op "Ophalen" om berichten te laden.</td></tr>';
    document.getElementById('detailPanel').style.display = 'none';

    const ro   = isActiveConnectionReadOnly();
    const roEl = document.getElementById('statusReadOnly');
    if (roEl) roEl.style.display = ro ? '' : 'none';

    updateBulkButtons();

    try {
        MessageState.extractionRules = await App.apiGet('/api/extraction-rules');
        renderExtractionColumns();
    } catch { /* niet kritiek */ }
};

window.fetchMessages = async function () {
    const { connId, vhost, queue } = MessageState;
    if (!connId || !queue) return;
    const count = parseInt(document.getElementById('fetchCount').value) || 100;
    const tbody = document.getElementById('msgTbody');
    tbody.innerHTML = '<tr><td colspan="99" class="text-muted" style="text-align:center;padding:20px">Laden...</td></tr>';

    try {
        const msgs = await App.apiGet(
            `/api/connections/${connId}/vhosts/${encodeURIComponent(vhost)}/queues/${encodeURIComponent(queue)}/messages?count=${count}&peek=true`
        );
        MessageState.messages = msgs.map((m, i) => ({ ...m, _index: i + 1 }));
        MessageState.selected.clear();
        applyFilterAndSort();
        document.getElementById('statusMessages').textContent = `${msgs.length} bericht(en)`;
        updateSelectionCount();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="99" class="text-error" style="text-align:center;padding:20px">${App.escHtml(e.message)}</td></tr>`;
        Toast.error('Berichten ophalen mislukt: ' + e.message);
    }
};

window.sortBy = function (col) {
    if (MessageState.sortCol === col) {
        MessageState.sortAsc = !MessageState.sortAsc;
    } else {
        MessageState.sortCol = col;
        MessageState.sortAsc = true;
    }
    applyFilterAndSort();
    updateSortHeaders();
};

document.addEventListener('DOMContentLoaded', () => {
    const searchEl = document.getElementById('msgSearch');
    if (searchEl) {
        searchEl.addEventListener('input', () => {
            MessageState.searchTerm = searchEl.value.toLowerCase();
            const cb = document.getElementById('msgSearchClear');
            if (cb) cb.style.display = searchEl.value ? '' : 'none';
            applyFilterAndSort();
        });
        searchEl.addEventListener('keydown', e => {
            if (e.key === 'Escape') clearSearch();
        });
    }
    document.getElementById('fbValue')?.addEventListener('keydown', e => {
        if (e.key === 'Enter')  addFilterFromBuilder();
        if (e.key === 'Escape') hideFilterBuilder();
    });
});

// ── FILTER BUILDER FUNCTIES ───────────────────────────────
window.clearSearch = function () {
    const el = document.getElementById('msgSearch');
    if (el) { el.value = ''; el.dispatchEvent(new Event('input')); }
};

window.showFilterBuilder = function () {
    const builder   = document.getElementById('filterBuilder');
    const filterBar = document.getElementById('filterBar');
    if (builder)   builder.style.display   = 'flex';
    if (filterBar) filterBar.style.display = '';
    setTimeout(() => document.getElementById('fbValue')?.focus(), 50);
};

window.hideFilterBuilder = function () {
    const builder = document.getElementById('filterBuilder');
    if (builder) builder.style.display = 'none';
    FilterState.render();
};

window.addFilterFromBuilder = function () {
    const field = document.getElementById('fbField')?.value ?? 'any';
    const value = (document.getElementById('fbValue')?.value ?? '').trim();
    if (!value) return;
    const labels = {
        any: 'Alle velden', body: 'Body', routing_key: 'Routing Key',
        exchange: 'Exchange', content_type: 'Content-Type',
        message_id: 'Message-ID', correlation_id: 'Correlation-ID',
        header_key: 'Header sleutel', header_value: 'Header waarde'
    };
    FilterState.add(field, labels[field] ?? field, value);
    const fbVal = document.getElementById('fbValue');
    if (fbVal) fbVal.value = '';
    hideFilterBuilder();
};

window.clearAllFilters = function () {
    FilterState.clear();
    clearSearch();
};

function applyFilterAndSort() {
    let msgs = [...MessageState.messages];

    // Globale zoekterm — doorzoekt ALLE velden
    const term = MessageState.searchTerm;
    if (term) {
        msgs = msgs.filter(m => matchesSearchTerm(m, term));
    }

    // Chip filters (AND)
    for (const chip of FilterState.chips) {
        msgs = msgs.filter(m => matchesChip(m, chip));
    }

    // Sorteren
    const col = MessageState.sortCol;
    msgs.sort((a, b) => {
        let va = getColVal(a, col);
        let vb = getColVal(b, col);
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return MessageState.sortAsc ? -1 : 1;
        if (va > vb) return MessageState.sortAsc ? 1 : -1;
        return 0;
    });

    MessageState.filtered = msgs;
    renderTable(msgs);

    // Match count in statusbalk
    const total     = MessageState.messages.length;
    const hasFilter = term || FilterState.chips.length > 0;
    document.getElementById('statusFilter').textContent =
        hasFilter && total > 0 ? `${msgs.length} van ${total}` : '';
}

function matchesSearchTerm(m, term) {
    const t = term.toLowerCase();
    if ((m.routing_key ?? '').toLowerCase().includes(t))  return true;
    if ((m.exchange    ?? '').toLowerCase().includes(t))  return true;
    if ((m.payload     ?? '').toLowerCase().includes(t))  return true;
    const p = m.properties ?? {};
    if ((p.content_type   ?? '').toLowerCase().includes(t)) return true;
    if ((p.message_id     ?? '').toLowerCase().includes(t)) return true;
    if ((p.correlation_id ?? '').toLowerCase().includes(t)) return true;
    if ((p.reply_to       ?? '').toLowerCase().includes(t)) return true;
    if ((p.type           ?? '').toLowerCase().includes(t)) return true;
    if ((p.app_id         ?? '').toLowerCase().includes(t)) return true;
    // Headers: sleutels + waarden
    for (const [k, v] of Object.entries(p.headers ?? {})) {
        if (k.toLowerCase().includes(t)) return true;
        const sv = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
        if (sv.toLowerCase().includes(t)) return true;
    }
    return false;
}

function matchesChip(m, chip) {
    const v = chip.value.toLowerCase();
    switch (chip.field) {
        case 'any':           return matchesSearchTerm(m, v);
        case 'body':          return (m.payload ?? '').toLowerCase().includes(v);
        case 'routing_key':   return (m.routing_key ?? '').toLowerCase().includes(v);
        case 'exchange':      return (m.exchange ?? '').toLowerCase().includes(v);
        case 'content_type':  return (m.properties?.content_type ?? '').toLowerCase().includes(v);
        case 'message_id':    return (m.properties?.message_id ?? '').toLowerCase().includes(v);
        case 'correlation_id':return (m.properties?.correlation_id ?? '').toLowerCase().includes(v);
        case 'header_key': {
            const headers = m.properties?.headers ?? {};
            return Object.keys(headers).some(k => k.toLowerCase().includes(v));
        }
        case 'header_value': {
            const headers = m.properties?.headers ?? {};
            return Object.values(headers).some(hv => {
                const sv = typeof hv === 'object' ? JSON.stringify(hv) : String(hv ?? '');
                return sv.toLowerCase().includes(v);
            });
        }
        default: return true;
    }
}

function getColVal(m, col) {
    switch (col) {
        case 'index':         return m._index;
        case 'routing_key':   return m.routing_key ?? '';
        case 'exchange':      return m.exchange ?? '';
        case 'content_type':  return m.properties?.content_type ?? '';
        case 'payload_bytes': return m.payload_bytes ?? 0;
        case 'timestamp':     return m.properties?.timestamp ?? 0;
        case 'message_id':    return m.properties?.message_id ?? '';
        case 'correlation_id':return m.properties?.correlation_id ?? '';
        default:              return extractCustomCol(m, col);
    }
}

function extractCustomCol(m, colName) {
    const rule = MessageState.extractionRules.find(r => r.columnName === colName);
    if (!rule) return '';
    return window.ExtractionEngine ? window.ExtractionEngine.extract(m.payload, rule) : '';
}

function renderTable(msgs) {
    const tbody = document.getElementById('msgTbody');
    if (!tbody) return;

    if (!msgs.length) {
        tbody.innerHTML = '<tr><td colspan="99" class="text-muted" style="text-align:center;padding:20px">Geen berichten gevonden.</td></tr>';
        return;
    }

    const rows = msgs.map((m, idx) => {
        const isDlq = m.properties?.headers?.['x-death'] != null;
        const poisonCount = Array.isArray(m.properties?.headers?.['x-death'])
            ? m.properties.headers['x-death'].reduce((s, d) => s + (d.count ?? 0), 0) : 0;
        const isPoison = poisonCount > 3;
        const cls = isPoison ? 'poison' : isDlq ? 'dlq' : '';
        const ts = m.properties?.timestamp ? App.formatTs(m.properties.timestamp) : '';
        const checked = MessageState.selected.has(idx) ? 'checked' : '';

        const customCols = MessageState.extractionRules
            .filter(r => r.isActive)
            .map(r => `<td class="mono">${App.escHtml(window.ExtractionEngine ? window.ExtractionEngine.extract(m.payload, r) : '')}</td>`)
            .join('');

        return `<tr class="${cls}" data-idx="${idx}" draggable="true"
                    ondragstart="startDrag(event, ${idx})"
                    onclick="selectMessage(${idx}, event)">
            <td onclick="event.stopPropagation()">
                <input type="checkbox" ${checked} data-idx="${idx}"
                       onchange="toggleMessage(${idx}, this.checked, event)" />
            </td>
            <td>${m._index}</td>
            <td class="mono truncate" style="max-width:200px" title="${App.escHtml(m.routing_key)}">${App.escHtml(m.routing_key)}</td>
            <td class="mono">${App.escHtml(m.exchange || '(default)')}</td>
            <td>${App.escHtml(m.properties?.content_type ?? '')}</td>
            <td>${App.formatBytes(m.payload_bytes)}</td>
            <td>${ts}</td>
            <td class="mono truncate" style="max-width:150px" title="${App.escHtml(m.properties?.message_id ?? '')}">${App.escHtml(m.properties?.message_id ?? '')}</td>
            <td class="mono truncate" style="max-width:150px" title="${App.escHtml(m.properties?.correlation_id ?? '')}">${App.escHtml(m.properties?.correlation_id ?? '')}</td>
            ${customCols}
        </tr>`;
    });

    tbody.innerHTML = rows.join('');
}

let lastChecked = null;
window.toggleSelectAll = function (cb) {
    const count = MessageState.filtered.length;
    for (let i = 0; i < count; i++) {
        if (cb.checked) MessageState.selected.add(i);
        else MessageState.selected.delete(i);
    }
    renderTable(MessageState.filtered);
    updateSelectionCount();
    updateBulkButtons();
};

window.toggleMessage = function (idx, checked, event) {
    if (event.shiftKey && lastChecked !== null) {
        const from = Math.min(lastChecked, idx);
        const to = Math.max(lastChecked, idx);
        for (let i = from; i <= to; i++) {
            checked ? MessageState.selected.add(i) : MessageState.selected.delete(i);
        }
        renderTable(MessageState.filtered);
    } else {
        checked ? MessageState.selected.add(idx) : MessageState.selected.delete(idx);
    }
    lastChecked = idx;
    updateSelectionCount();
    updateBulkButtons();
};

window.selectMessage = function (idx, event) {
    if (event.target.type === 'checkbox') return;
    showMessageDetail(MessageState.filtered[idx]);
};

function updateSelectionCount() {
    const el = document.getElementById('selectionCount');
    if (el) el.textContent = MessageState.selected.size > 0
        ? `${MessageState.selected.size} geselecteerd`
        : `${MessageState.filtered.length} bericht(en)`;
}

function updateBulkButtons() {
    const hasSel = MessageState.selected.size > 0;
    const ro = isActiveConnectionReadOnly();
    document.getElementById('btnCopy').disabled = !hasSel || ro;
    document.getElementById('btnMove').disabled = !hasSel || ro;
    document.getElementById('btnPurge').disabled = !MessageState.queue || ro;
}

function updateSortHeaders() {
    document.querySelectorAll('.msg-table th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.col === MessageState.sortCol) {
            th.classList.add(MessageState.sortAsc ? 'sort-asc' : 'sort-desc');
        }
    });
}

function renderExtractionColumns() {
    const tr = document.querySelector('.msg-table thead tr');
    if (!tr) return;
    document.querySelectorAll('.msg-table th[data-extraction]').forEach(el => el.remove());
    for (const rule of MessageState.extractionRules.filter(r => r.isActive)) {
        const th = document.createElement('th');
        th.setAttribute('data-extraction', rule.id);
        th.setAttribute('data-col', rule.columnName);
        th.textContent = rule.columnName;
        th.addEventListener('click', () => sortBy(rule.columnName));
        tr.appendChild(th);
    }
}

// ── OPERATIES ─────────────────────────────────────────────
window.getSelectedMessages = () =>
    [...MessageState.selected].map(i => MessageState.filtered[i]).filter(Boolean);

function isActiveConnectionReadOnly() {
    const conn = (window.AppContext?.connections ?? []).find(c => c.id === MessageState.connId);
    return conn?.isReadOnly ?? false;
}

function isActiveConnectionProd() {
    const conn = (window.AppContext?.connections ?? []).find(c => c.id === MessageState.connId);
    return (conn?.environment ?? '').toUpperCase() === 'PRD';
}

function showProdConfirmModal(action, targetLabel, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal modal--prod-warning">
            <div class="modal__header modal__header--danger">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Productieomgeving — bevestig destructieve actie
            </div>
            <div class="modal__body">
                <p class="prod-warning__text">
                    Je staat op het punt <strong>${App.escHtml(action)}</strong> uit te voeren op<br>
                    <strong class="prod-warning__target">${App.escHtml(targetLabel)}</strong><br>
                    in de <span class="env-badge prd">PRD</span>-omgeving.
                </p>
                <p class="prod-warning__text" style="margin-top:10px">
                    Typ de queuenaam ter bevestiging:
                </p>
                <input class="form-control" id="prodConfirmInput" placeholder="${App.escHtml(MessageState.queue)}" autocomplete="off" />
            </div>
            <div class="modal__footer">
                <button class="btn btn--ghost" onclick="this.closest('.modal-backdrop').remove()">Annuleren</button>
                <button class="btn btn--danger" id="prodConfirmBtn" disabled>Bevestigen</button>
            </div>
        </div>`;
    document.getElementById('modalContainer').appendChild(modal);

    const input = modal.querySelector('#prodConfirmInput');
    const btn = modal.querySelector('#prodConfirmBtn');
    input.addEventListener('input', () => {
        btn.disabled = input.value !== MessageState.queue;
    });
    btn.addEventListener('click', () => {
        modal.remove();
        onConfirm();
    });
    setTimeout(() => input.focus(), 50);
}

function guardDestructive(actionLabel, targetLabel, action) {
    if (isActiveConnectionReadOnly()) {
        Toast.warn('Deze verbinding is read-only. De actie is niet beschikbaar.');
        return;
    }
    if (isActiveConnectionProd()) {
        showProdConfirmModal(actionLabel, targetLabel, action);
    } else {
        action();
    }
}

window.purgeQueue = function () {
    const { connId, vhost, queue } = MessageState;
    if (!connId || !queue) return;

    const doModal = () => {
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal__header modal__header--danger">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                    Purge queue
                </div>
                <div class="modal__body">
                    <p>Alle berichten in <strong>${App.escHtml(queue)}</strong> worden definitief verwijderd.</p>
                    <p class="text-warn" style="margin-top:8px">⚠ Deze actie kan niet ongedaan gemaakt worden.</p>
                </div>
                <div class="modal__footer">
                    <button class="btn btn--ghost" onclick="this.closest('.modal-backdrop').remove()">Annuleren</button>
                    <button class="btn btn--danger" id="doPurgeBtn">Queue leegmaken</button>
                </div>
            </div>`;
        document.getElementById('modalContainer').appendChild(modal);
        modal.querySelector('#doPurgeBtn').addEventListener('click', async () => {
            modal.remove();
            try {
                await App.apiDelete(`/api/connections/${connId}/vhosts/${encodeURIComponent(vhost)}/queues/${encodeURIComponent(queue)}/messages`);
                Toast.success(`Queue "${queue}" is leeggemaakt.`);
                await fetchMessages();
            } catch (e) {
                Toast.error('Purge mislukt: ' + e.message);
            }
        });
    };

    guardDestructive('Purge queue', queue, doModal);
};

window.copySelected = async function () {
    if (isActiveConnectionReadOnly()) { Toast.warn('Deze verbinding is read-only.'); return; }
    const msgs = getSelectedMessages();
    if (!msgs.length) return;
    showQueuePickerModal('Kopieer naar queue', async (targetConnId, targetVhost, targetQueue) => {
        let ok = 0;
        for (const m of msgs) {
            try {
                await App.apiPost(
                    `/api/connections/${targetConnId}/vhosts/${encodeURIComponent(targetVhost)}/queues/${encodeURIComponent(targetQueue)}/publish`,
                    { properties: m.properties ?? {}, routing_key: targetQueue, payload: m.payload, payload_encoding: m.payload_encoding ?? 'string' }
                );
                ok++;
            } catch { /* skip */ }
        }
        Toast.success(`${ok} bericht(en) gekopieerd naar ${targetQueue}`);
    });
};

window.moveSelected = async function () {
    if (isActiveConnectionReadOnly()) { Toast.warn('Deze verbinding is read-only.'); return; }
    const msgs = getSelectedMessages();
    if (!msgs.length) return;
    showQueuePickerModal('Verplaats naar queue', async (targetConnId, targetVhost, targetQueue) => {
        let ok = 0;
        for (const m of msgs) {
            try {
                await App.apiPost(
                    `/api/connections/${targetConnId}/vhosts/${encodeURIComponent(targetVhost)}/queues/${encodeURIComponent(targetQueue)}/publish`,
                    { properties: m.properties ?? {}, routing_key: targetQueue, payload: m.payload, payload_encoding: m.payload_encoding ?? 'string' }
                );
                ok++;
            } catch { /* skip */ }
        }
        Toast.success(`${ok} bericht(en) verplaatst naar ${targetQueue}`);
        await fetchMessages();
    });
};

window.saveMessages = function () {
    const msgs = MessageState.filtered.length ? MessageState.filtered : MessageState.messages;
    if (!msgs.length) { Toast.warn('Geen berichten om te exporteren.'); return; }
    const json = JSON.stringify(msgs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${MessageState.queue}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success(`${msgs.length} bericht(en) geëxporteerd.`);
};

window.importMessages = async function (input) {
    if (isActiveConnectionReadOnly()) { Toast.warn('Deze verbinding is read-only.'); return; }
    const file = input.files[0];
    if (!file) return;
    const text = await file.text();
    let msgs;
    try { msgs = JSON.parse(text); } catch { Toast.error('Ongeldig JSON bestand.'); return; }
    if (!Array.isArray(msgs)) { Toast.error('Verwacht een JSON array van berichten.'); return; }
    showQueuePickerModal('Importeer naar queue', async (connId, vhost, queue) => {
        let ok = 0;
        for (const m of msgs) {
            try {
                await App.apiPost(
                    `/api/connections/${connId}/vhosts/${encodeURIComponent(vhost)}/queues/${encodeURIComponent(queue)}/publish`,
                    { properties: m.properties ?? {}, routing_key: queue, payload: m.payload, payload_encoding: m.payload_encoding ?? 'string' }
                );
                ok++;
            } catch { /* skip */ }
        }
        Toast.success(`${ok} bericht(en) geïmporteerd in ${queue}`);
    });
    input.value = '';
};

// ── AUTO REFRESH ──────────────────────────────────────────
window.setRefreshInterval = function (seconds) {
    clearInterval(MessageState.refreshTimer);
    const s = parseInt(seconds);
    if (s > 0) {
        MessageState.refreshTimer = setInterval(() => fetchMessages(), s * 1000);
        document.getElementById('statusRefresh').textContent = `Auto-refresh: ${s}s`;
    } else {
        document.getElementById('statusRefresh').textContent = '';
    }
};

// ── QUEUE PICKER MODAL ─────────────────────────────────────
function showQueuePickerModal(title, callback) {
    const conns = window.AppContext?.connections ?? [];
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal__header">
                ${App.escHtml(title)}
                <button class="btn btn--icon" onclick="this.closest('.modal-backdrop').remove()">✕</button>
            </div>
            <div class="modal__body">
                <div class="form-group">
                    <label class="form-label">Verbinding</label>
                    <select class="form-control" id="mpConn" onchange="loadVHostsForPicker()">
                        ${conns.map(c => `<option value="${c.id}">${App.escHtml(c.name)} (${c.environment})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">VHost</label>
                    <select class="form-control" id="mpVhost" onchange="loadQueuesForPicker()">
                        <option value="/">/ (standaard)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Queue</label>
                    <select class="form-control" id="mpQueue" style="width:100%"></select>
                </div>
            </div>
            <div class="modal__footer">
                <button class="btn btn--ghost" onclick="this.closest('.modal-backdrop').remove()">Annuleren</button>
                <button class="btn" id="mpConfirm">Bevestigen</button>
            </div>
        </div>`;
    document.getElementById('modalContainer').appendChild(modal);

    const confirmBtn = modal.querySelector('#mpConfirm');
    confirmBtn.addEventListener('click', async () => {
        const connId = parseInt(modal.querySelector('#mpConn').value);
        const vhost = modal.querySelector('#mpVhost').value;
        const queue = modal.querySelector('#mpQueue').value;
        if (!queue) { Toast.warn('Selecteer een queue.'); return; }
        modal.remove();
        await callback(connId, vhost, queue);
    });

    window.loadVHostsForPicker = async function () {
        const connId = modal.querySelector('#mpConn').value;
        try {
            const vhosts = await App.apiGet(`/api/connections/${connId}/vhosts`);
            modal.querySelector('#mpVhost').innerHTML = vhosts.map(v => `<option value="${App.escHtml(v.name)}">${App.escHtml(v.name)}</option>`).join('');
            await loadQueuesForPicker();
        } catch { /* skip */ }
    };

    window.loadQueuesForPicker = async function () {
        const connId = modal.querySelector('#mpConn').value;
        const vhost = modal.querySelector('#mpVhost').value;
        try {
            const queues = await App.apiGet(`/api/connections/${connId}/vhosts/${encodeURIComponent(vhost)}/queues`);
            modal.querySelector('#mpQueue').innerHTML = queues.map(q => `<option value="${App.escHtml(q.name)}">${App.escHtml(q.name)} (${q.messages})</option>`).join('');
        } catch { /* skip */ }
    };

    if (conns.length) loadVHostsForPicker();
}
