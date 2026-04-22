/* signalr-client.js — SignalR verbinding voor live queue updates */
(function () {
    const hubUrl = window.AppContext?.queueHubUrl ?? '/hubs/queue';

    const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect([0, 1000, 5000, 10000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

    connection.on('QueueStatUpdate', (update) => {
        window.updateQueueHealth?.(update);
        window.AlertThresholds?.check(
            update.connectionId, update.vHost, update.queueName, update.messages);
    });

    connection.on('ConnectionRefreshed', (update) => {
        window.updateConnectionRefreshed?.(update.connectionId, update.timestamp);
    });

    async function start() {
        try {
            await connection.start();
        } catch (err) {
            console.warn('[SignalR] Start mislukt:', err);
            setTimeout(start, 5000);
        }
    }

    connection.onclose(async () => {
        await start();
    });

    document.addEventListener('DOMContentLoaded', start);
    window.QueueHubConnection = connection;
})();
