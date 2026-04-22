/* alerts.js — drempelwaarde notificaties bij queue groei */
window.AlertThresholds = {
    rules: JSON.parse(localStorage.getItem('rmqe-alerts') ?? '[]'),
    lastFired: {},

    save() {
        localStorage.setItem('rmqe-alerts', JSON.stringify(this.rules));
    },

    add(pattern, threshold) {
        this.rules.push({ pattern, threshold: parseInt(threshold) });
        this.save();
    },

    remove(idx) {
        this.rules.splice(idx, 1);
        this.save();
    },

    check(connId, vhost, queue, count) {
        for (const rule of this.rules) {
            const regex = new RegExp('^' + rule.pattern.replace(/\*/g, '.*') + '$');
            if (!regex.test(queue)) continue;
            const key = `${connId}:${vhost}:${queue}`;
            if (count >= rule.threshold && !this.lastFired[key]) {
                Toast.warn(`Queue "${queue}" heeft ${count.toLocaleString('nl-BE')} berichten (drempel: ${rule.threshold.toLocaleString('nl-BE')})`);
                this.lastFired[key] = Date.now();
                // Reset na 5 minuten
                setTimeout(() => delete this.lastFired[key], 5 * 60 * 1000);
            } else if (count < rule.threshold) {
                delete this.lastFired[key];
            }
        }
    }
};

// ── Drempelwaarden voor sidebar-badges ────────────────────
window.QueueThresholds = {
    warnMessages:    parseInt(localStorage.getItem('rmqe-thresh-warn')            ?? '1000'),
    dangerMessages:  parseInt(localStorage.getItem('rmqe-thresh-danger')          ?? '10000'),
    warnUnacked:     parseInt(localStorage.getItem('rmqe-thresh-unacked-warn')    ?? '100'),
    dangerUnacked:   parseInt(localStorage.getItem('rmqe-thresh-unacked-danger')  ?? '1000'),

    save() {
        localStorage.setItem('rmqe-thresh-warn',           this.warnMessages);
        localStorage.setItem('rmqe-thresh-danger',         this.dangerMessages);
        localStorage.setItem('rmqe-thresh-unacked-warn',   this.warnUnacked);
        localStorage.setItem('rmqe-thresh-unacked-danger', this.dangerUnacked);
    },

    update(warnMsg, dangerMsg, warnUnacked, dangerUnacked) {
        this.warnMessages   = parseInt(warnMsg)       || 1000;
        this.dangerMessages = parseInt(dangerMsg)     || 10000;
        this.warnUnacked    = parseInt(warnUnacked)   || 100;
        this.dangerUnacked  = parseInt(dangerUnacked) || 1000;
        this.save();
    }
};

window.showThresholdSettings = function () {
    const t = window.QueueThresholds;
    const existing = document.getElementById('thresholdModal');
    if (existing) { existing.remove(); return; }

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.id = 'thresholdModal';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal__header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-.33-1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 .33 1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.24.32.45.68.6 1 .11.33.17.67.17 1s-.06.67-.17 1c-.15.32-.36.68-.6 1z"/></svg>
                Drempelwaarden
                <button class="btn btn--icon" onclick="document.getElementById('thresholdModal').remove()">✕</button>
            </div>
            <div class="modal__body">
                <p class="text-muted" style="margin-bottom:14px;font-size:12px">
                    Bepaal wanneer queue-badges van kleur wisselen in de sidebar.
                </p>

                <div class="thresh-group">
                    <div class="thresh-group__title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="11" height="11"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                        Berichtendiepte (messages)
                    </div>
                    <div class="thresh-row">
                        <label class="form-label">Waarschuwing vanaf</label>
                        <span class="tree-item__badge warn thresh-preview">≥ N</span>
                        <input class="form-control" id="thWarnMsg" type="number" min="1" value="${t.warnMessages}" />
                    </div>
                    <div class="thresh-row">
                        <label class="form-label">Gevaar vanaf</label>
                        <span class="tree-item__badge danger thresh-preview">≥ N</span>
                        <input class="form-control" id="thDangerMsg" type="number" min="1" value="${t.dangerMessages}" />
                    </div>
                </div>

                <div class="thresh-group">
                    <div class="thresh-group__title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="11" height="11"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        Onbevestigde berichten (unacked)
                    </div>
                    <div class="thresh-row">
                        <label class="form-label">Waarschuwing vanaf</label>
                        <span class="q-health-unacked warn thresh-preview">↑N</span>
                        <input class="form-control" id="thWarnUn" type="number" min="0" value="${t.warnUnacked}" />
                    </div>
                    <div class="thresh-row">
                        <label class="form-label">Gevaar vanaf</label>
                        <span class="q-health-unacked danger thresh-preview">↑N</span>
                        <input class="form-control" id="thDangerUn" type="number" min="0" value="${t.dangerUnacked}" />
                    </div>
                </div>
            </div>
            <div class="modal__footer">
                <button class="btn btn--ghost" onclick="document.getElementById('thresholdModal').remove()">Annuleren</button>
                <button class="btn" id="thSaveBtn">Opslaan</button>
            </div>
        </div>`;
    document.getElementById('modalContainer').appendChild(modal);
    modal.querySelector('#thSaveBtn').addEventListener('click', () => {
        window.QueueThresholds.update(
            modal.querySelector('#thWarnMsg').value,
            modal.querySelector('#thDangerMsg').value,
            modal.querySelector('#thWarnUn').value,
            modal.querySelector('#thDangerUn').value
        );
        modal.remove();
        Toast.success('Drempelwaarden opgeslagen.');
    });
};
