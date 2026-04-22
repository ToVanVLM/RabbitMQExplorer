/* sparkline.js — mini SVG grafiek per queue in sidebar */
window.SparklineTracker = {
    history: {},   // key: `${connId}:${vhost}:${queue}` => number[]
    maxPoints: 20,

    record(connId, vhost, queue, count) {
        const key = `${connId}:${vhost}:${queue}`;
        if (!this.history[key]) this.history[key] = [];
        this.history[key].push(count);
        if (this.history[key].length > this.maxPoints) {
            this.history[key].shift();
        }
    },

    getSvg(connId, vhost, queue, width = 60, height = 16) {
        const key = `${connId}:${vhost}:${queue}`;
        const data = this.history[key] ?? [];
        if (data.length < 2) return '';
        const max = Math.max(...data, 1);
        const pts = data.map((v, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - (v / max) * height;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        const growing = data[data.length - 1] > data[data.length - 2];
        const color = growing ? 'var(--queue-warn)' : 'var(--queue-ok)';
        return `<svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <polyline fill="none" stroke="${color}" stroke-width="1.5" points="${pts}"/>
        </svg>`;
    }
};

// Hook into QueueStatUpdate van SignalR
const origUpdate = window.updateQueueBadge;
window.updateQueueBadge = function (connId, vhost, queue, count) {
    SparklineTracker.record(connId, vhost, queue, count);

    // Update sparkline in sidebar indien aanwezig
    const item = document.getElementById(`qi-${connId}-${encodeURIComponent(vhost)}-${encodeURIComponent(queue)}`);
    if (item) {
        let spark = item.querySelector('.sparkline-wrap');
        if (!spark) {
            spark = document.createElement('span');
            spark.className = 'sparkline-wrap';
            item.insertBefore(spark, item.querySelector('.tree-item__badge'));
        }
        spark.innerHTML = SparklineTracker.getSvg(connId, vhost, queue);
    }

    origUpdate?.(connId, vhost, queue, count);

    // Drempelwaarde check
    AlertThresholds.check(connId, vhost, queue, count);
};
