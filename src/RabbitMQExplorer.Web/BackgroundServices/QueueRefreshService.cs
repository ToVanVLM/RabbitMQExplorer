using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RabbitMQExplorer.Web.Data;
using RabbitMQExplorer.Web.Hubs;
using RabbitMQExplorer.Web.Services;

namespace RabbitMQExplorer.Web.BackgroundServices;

/// <summary>
/// Background service die periodiek queue statistieken ophaalt
/// en via SignalR naar verbonden clients pusht.
/// </summary>
public sealed class QueueRefreshService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<QueueHub> _hub;
    private readonly ILogger<QueueRefreshService> _logger;
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(15);

    public QueueRefreshService(
        IServiceScopeFactory scopeFactory,
        IHubContext<QueueHub> hub,
        ILogger<QueueRefreshService> logger)
    {
        _scopeFactory = scopeFactory;
        _hub = hub;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(Interval, stoppingToken);
            await PushQueueStatsAsync(stoppingToken);
        }
    }

    private async Task PushQueueStatsAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var factory = scope.ServiceProvider.GetRequiredService<RabbitMqClientFactory>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<RabbitMqApiService>>();

        var connections = await db.Connections.ToListAsync(ct);
        foreach (var conn in connections)
        {
            try
            {
                var svc = factory.CreateForConnection(conn, logger);
                var vhosts = await svc.GetVHostsAsync(ct);
                foreach (var vhost in vhosts)
                {
                    var queues = await svc.GetQueuesAsync(vhost.Name, ct);
                    foreach (var q in queues)
                    {
                        var update = new QueueStatUpdate(
                            conn.Id,
                            vhost.Name, q.Name, q.Messages, q.MessagesReady,
                            q.MessagesUnacknowledged, q.Consumers, q.State,
                            q.MessageStats?.PublishDetails?.Rate
                        );
                        await _hub.Clients.All.SendAsync("QueueStatUpdate", update, ct);
                    }
                }
                await _hub.Clients.All.SendAsync("ConnectionRefreshed",
                    new ConnectionRefreshed(conn.Id, DateTime.UtcNow), ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Queue stats ophalen mislukt voor verbinding {Name}", conn.Name);
            }
        }
    }
}
