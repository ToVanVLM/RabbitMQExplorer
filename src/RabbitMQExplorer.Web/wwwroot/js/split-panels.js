/* split-panels.js — verstelbare sidebar en detailpanel */
(() => {
    const SIDEBAR_KEY = 'rabbitmqexplorer.sidebarWidth';
    const DETAIL_KEY = 'rabbitmqexplorer.detailHeight';

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function initSidebarSplitter() {
        const shell = document.getElementById('appShell');
        const splitter = document.getElementById('sidebarSplitter');
        if (!shell || !splitter) return;

        const saved = parseInt(localStorage.getItem(SIDEBAR_KEY), 10);
        if (!Number.isNaN(saved)) {
            shell.style.setProperty('--sidebar-width', `${saved}px`);
        }

        const setSidebarWidth = (clientX) => {
            const bounds = shell.getBoundingClientRect();
            const width = clamp(clientX - bounds.left, 220, Math.min(560, bounds.width - 320));
            shell.style.setProperty('--sidebar-width', `${width}px`);
            localStorage.setItem(SIDEBAR_KEY, String(Math.round(width)));
        };

        splitter.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            document.body.classList.add('is-resizing-col');
            splitter.setPointerCapture(e.pointerId);

            const onMove = (evt) => setSidebarWidth(evt.clientX);
            const onUp = (evt) => {
                setSidebarWidth(evt.clientX);
                document.body.classList.remove('is-resizing-col');
                splitter.releasePointerCapture(evt.pointerId);
                splitter.removeEventListener('pointermove', onMove);
                splitter.removeEventListener('pointerup', onUp);
                splitter.removeEventListener('pointercancel', onUp);
            };

            splitter.addEventListener('pointermove', onMove);
            splitter.addEventListener('pointerup', onUp);
            splitter.addEventListener('pointercancel', onUp);
        });
    }

    function initDetailSplitter() {
        const wrap = document.getElementById('msgGridWrap');
        const splitter = document.getElementById('detailSplitter');
        const panel = document.getElementById('detailPanel');
        if (!wrap || !splitter || !panel) return;

        const saved = parseInt(localStorage.getItem(DETAIL_KEY), 10);
        if (!Number.isNaN(saved)) {
            panel.style.flexBasis = `${saved}px`;
        }

        const syncVisibility = () => {
            const panelVisible = panel.style.display !== 'none';
            splitter.style.display = panelVisible ? '' : 'none';
        };

        const observer = new MutationObserver(syncVisibility);
        observer.observe(panel, { attributes: true, attributeFilter: ['style', 'class'] });
        syncVisibility();

        splitter.addEventListener('pointerdown', (e) => {
            if (panel.style.display === 'none') return;
            e.preventDefault();
            const startY = e.clientY;
            const startHeight = panel.getBoundingClientRect().height;

            document.body.classList.add('is-resizing-row');
            splitter.setPointerCapture(e.pointerId);

            const onMove = (evt) => {
                const wrapHeight = wrap.getBoundingClientRect().height;
                const nextHeight = clamp(startHeight + (startY - evt.clientY), 180, Math.max(220, wrapHeight - 120));
                panel.style.flexBasis = `${nextHeight}px`;
                localStorage.setItem(DETAIL_KEY, String(Math.round(nextHeight)));
            };

            const onUp = (evt) => {
                onMove(evt);
                document.body.classList.remove('is-resizing-row');
                splitter.releasePointerCapture(evt.pointerId);
                splitter.removeEventListener('pointermove', onMove);
                splitter.removeEventListener('pointerup', onUp);
                splitter.removeEventListener('pointercancel', onUp);
            };

            splitter.addEventListener('pointermove', onMove);
            splitter.addEventListener('pointerup', onUp);
            splitter.addEventListener('pointercancel', onUp);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initSidebarSplitter();
        initDetailSplitter();
    });
})();
