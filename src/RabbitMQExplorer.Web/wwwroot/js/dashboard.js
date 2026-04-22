/* dashboard.js — operationeel overzicht */
window.Dashboard = (() => {
    function esc(s) { return App?.escHtml(s) ?? String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

    function envBadge(env) {
        return `<span class="env-badge ${esc(env).toLowerCase()}">${esc(env)}</span>`;
    }

    function numCell(n) {
        return `<td class="num">${Number(n).toLocaleString('nl-BE')}</td>`;
    }

    function renderConnections(rows) {
        const tbody = document.querySelector('#tblConnections tbody');
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-muted">Geen verbindingen gevonden.</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map(r => `
            <tr>
                <td>${esc(r.name)}</td>
                <td>${envBadge(r.environment)}</td>
                <td><span class="dash-status ${r.reachable ? 'ok' : 'down'}">${r.reachable ? '● Bereikbaar' : '● Onbereikbaar'}</span></td>
                <td class="text-muted" style="font-size:11px">${r.error ? esc(r.error) : ''}</td>
            </tr>`).join('');
    }

    function renderQueueTable(tableId, rows, valueKey) {
        const tbody = document.querySelector(`#${tableId} tbody`);
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-muted">Geen queues gevonden.</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map(r => `
            <tr>
                <td class="mono truncate" style="max-width:200px" title="${esc(r.queue)}">${esc(r.queue)}</td>
                <td class="mono">${esc(r.vHost)}</td>
                <td>${esc(r.connName)} ${envBadge(r.environment)}</td>
                ${numCell(r[valueKey])}
            </tr>`).join('');
    }

    async function load() {
        document.getElementById('dashLoading').style.display = 'flex';
        document.getElementById('dashCards').style.display   = 'none';
        document.getElementById('dashError').style.display   = 'none';
        document.getElementById('btnRefreshDash').disabled   = true;

        try {
            const data = await App.apiGet('/api/dashboard/summary');
            renderConnections(data.connections ?? []);
            renderQueueTable('tblTopDepth',   data.topByDepth   ?? [], 'messages');
            renderQueueTable('tblTopUnacked', data.topByUnacked ?? [], 'unacked');

            const ts = new Date(data.timestamp);
            document.getElementById('dashTimestamp').textContent =
                `Bijgewerkt om ${ts.toLocaleTimeString('nl-BE')}`;

            document.getElementById('dashLoading').style.display = 'none';
            document.getElementById('dashCards').style.display   = 'grid';
        } catch (e) {
            document.getElementById('dashLoading').style.display = 'none';
            const err = document.getElementById('dashError');
            err.textContent = 'Ophalen mislukt: ' + e.message;
            err.style.display = 'block';
        } finally {
            document.getElementById('btnRefreshDash').disabled = false;
        }
    }

    return { load };
})();
