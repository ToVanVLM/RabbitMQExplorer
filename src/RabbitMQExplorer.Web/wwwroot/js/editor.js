/* editor.js — Monaco Editor voor message body + detail panel */
let monacoEditor = null;
let isEditing    = false;
let bodyMode     = 'pretty'; // 'pretty' | 'raw'

require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });

window.showMessageDetail = function (msg) {
    if (!msg) return;
    const panel = document.getElementById('detailPanel');
    panel.style.removeProperty('display');

    const btnRepublish = document.getElementById('btnRepublish');
    if (btnRepublish) btnRepublish.style.removeProperty('display');

    window._currentMsg = msg;
    showDetailTab('body', document.querySelector('.detail-panel__tab'));
};

window.showDetailTab = function (name, tabEl) {
    document.querySelectorAll('.detail-panel__tab').forEach(t => t.classList.remove('active'));
    if (tabEl) tabEl.classList.add('active');

    ['body', 'properties', 'headers', 'dlq'].forEach(t => {
        const el = document.getElementById(`tab-${t}`);
        if (el) el.style.display = 'none';
    });

    // Body mode toggle: alleen zichtbaar bij body-tab
    const modeToggle = document.getElementById('bodyModeToggle');
    if (modeToggle) modeToggle.style.display = name === 'body' ? '' : 'none';

    // Invalid indicator verbergen bij andere tabs
    if (name !== 'body') {
        const ind = document.getElementById('bodyInvalidIndicator');
        if (ind) ind.style.display = 'none';
    }

    // Kopieer-knop: verberg bij DLQ, toon voor andere tabs
    const copyBtn = document.getElementById('btnCopySection');
    if (copyBtn) {
        copyBtn.style.display = name === 'dlq' ? 'none' : '';
        const titles = { body: 'Body kopiëren', properties: 'Properties kopiëren', headers: 'Headers kopiëren' };
        copyBtn.title = titles[name] ?? 'Inhoud kopiëren';
    }

    const msg = window._currentMsg;
    if (!msg) return;

    const el = document.getElementById(`tab-${name}`);
    if (el) el.style.removeProperty('display');

    if (name === 'body')       renderBodyTab(msg);
    else if (name === 'properties') renderPropertiesTab(msg);
    else if (name === 'headers')    renderHeadersTab(msg);
    else if (name === 'dlq')        renderDlqTab(msg);
};

// ── PRETTY / RAW TOGGLE ───────────────────────────────────
window.setBodyMode = function (mode) {
    bodyMode = mode;
    document.getElementById('btnPretty')?.classList.toggle('active', mode === 'pretty');
    document.getElementById('btnRaw')?.classList.toggle('active', mode === 'raw');
    const bodyEl = document.getElementById('tab-body');
    if (bodyEl && bodyEl.style.display !== 'none' && window._currentMsg) {
        renderBodyTab(window._currentMsg);
    }
};

function renderBodyTab(msg) {
    const container = document.getElementById('tab-body');
    if (!container) return;

    // Decode base64 indien nodig
    let body = msg.payload ?? '';
    if (msg.payload_encoding === 'base64') {
        try { body = atob(body); } catch { /* houd origineel */ }
    }

    const ct = msg.properties?.content_type ?? '';
    let lang = 'plaintext';
    let isValidJson = false;

    const looksLikeJson = ct.includes('json') ||
        body.trimStart().startsWith('{') || body.trimStart().startsWith('[');
    const looksLikeXml  = ct.includes('xml') || body.trimStart().startsWith('<');

    if (looksLikeJson) {
        lang = 'json';
        try {
            const parsed = JSON.parse(body);
            isValidJson = true;
            if (bodyMode === 'pretty') {
                body = JSON.stringify(parsed, null, 2);
            }
        } catch { /* ongeldige JSON — toon onbewerkt */ }
    } else if (looksLikeXml) {
        lang = 'xml';
    }

    // Ongeldige JSON-indicator
    const indicator = document.getElementById('bodyInvalidIndicator');
    if (indicator) {
        indicator.style.display = (looksLikeJson && !isValidJson) ? '' : 'none';
    }

    require(['vs/editor/editor.main'], function () {
        const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'vs' : 'vs-dark';
        if (monacoEditor) {
            monacoEditor.setValue(body);
            const model = monacoEditor.getModel();
            if (model) monaco.editor.setModelLanguage(model, lang);
            monacoEditor.updateOptions({ readOnly: !isEditing });
        } else {
            monacoEditor = monaco.editor.create(container, {
                value: body,
                language: lang,
                theme,
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                lineNumbers: 'on',
                automaticLayout: true,
                wordWrap: 'on'
            });
        }
    });
}

// ── COPY SECTION ──────────────────────────────────────────
window.copyCurrentSection = function () {
    const activeTab = document.querySelector('.detail-panel__tab.active')?.textContent?.trim().toLowerCase();
    const msg = window._currentMsg;
    if (!msg) return;

    let text = '';
    if (activeTab === 'body') {
        text = monacoEditor ? monacoEditor.getValue() : (msg.payload ?? '');
    } else if (activeTab === 'properties') {
        const props = { ...msg.properties };
        delete props.headers;
        text = JSON.stringify(props, null, 2);
    } else if (activeTab === 'headers') {
        text = JSON.stringify(msg.properties?.headers ?? {}, null, 2);
    }

    if (!text) return;
    navigator.clipboard.writeText(text)
        .then(() => Toast.success('Gekopieerd!'))
        .catch(() => {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            Toast.success('Gekopieerd!');
        });
};
