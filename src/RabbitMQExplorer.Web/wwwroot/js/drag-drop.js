/* drag-drop.js — drag & drop berichten tussen queues */
let dragPayload = [];

window.startDrag = function (event, idx) {
    const row = event.currentTarget;
    if (MessageState.selected.size > 0 && MessageState.selected.has(idx)) {
        dragPayload = getSelectedMessages();
    } else {
        dragPayload = [MessageState.filtered[idx]];
    }
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.setData('text/plain', JSON.stringify({ count: dragPayload.length }));
    row.style.opacity = '0.5';
    row.addEventListener('dragend', () => { row.style.opacity = ''; }, { once: true });
};

window.handleDropOnQueue = async function (event, connId, vhost, queue) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    if (!dragPayload.length) return;

    const action = event.ctrlKey ? 'move' : 'copy';
    const label = action === 'copy' ? 'gekopieerd' : 'verplaatst';

    let ok = 0;
    for (const m of dragPayload) {
        try {
            await App.apiPost(
                `/api/connections/${connId}/vhosts/${encodeURIComponent(vhost)}/queues/${encodeURIComponent(queue)}/publish`,
                {
                    properties: m.properties ?? {},
                    routing_key: queue,
                    payload: m.payload,
                    payload_encoding: m.payload_encoding ?? 'string'
                }
            );
            ok++;
        } catch { /* skip */ }
    }

    Toast.success(`${ok} bericht(en) ${label} naar ${queue}. (Ctrl = verplaatsen, geen Ctrl = kopiëren)`);
    dragPayload = [];
};
