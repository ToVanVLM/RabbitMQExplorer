using Microsoft.AspNetCore.SignalR;
using RabbitMQExplorer.Web.Services;

namespace RabbitMQExplorer.Web.Hubs;

/// <summary>
/// SignalR hub voor real-time queue statistieken.
/// Clients subscriben op een verbinding+vhost combinatie en ontvangen queue updates.
/// </summary>
public sealed class QueueHub : Hub
{
    private readonly RabbitMqClientFactory _factory;
    private readonly ILogger<QueueHub> _logger;

    public QueueHub(RabbitMqClientFactory factory, ILogger<QueueHub> logger)
    {
        _factory = factory;
        _logger = logger;
    }

    public async Task SubscribeToQueues(string groupKey) =>
        await Groups.AddToGroupAsync(Context.ConnectionId, groupKey);

    public async Task UnsubscribeFromQueues(string groupKey) =>
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupKey);
}

/// <summary>Payload pushed to clients when queue stats update.</summary>
public record QueueStatUpdate(
    int ConnectionId,
    string VHost,
    string QueueName,
    long Messages,
    long MessagesReady,
    long MessagesUnacknowledged,
    long Consumers,
    string? State,
    double? PublishRate
);

/// <summary>Payload pushed after all queues of a connection have been refreshed.</summary>
public record ConnectionRefreshed(int ConnectionId, DateTime Timestamp);
