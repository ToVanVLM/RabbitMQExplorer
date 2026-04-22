using RabbitMQExplorer.Web.Models.RabbitMq;

namespace RabbitMQExplorer.Web.Services;

public interface IRabbitMqApiService
{
    Task<IReadOnlyList<VHostDto>> GetVHostsAsync(CancellationToken ct = default);
    Task<VHostDto> GetVHostAsync(string vhost, CancellationToken ct = default);
    Task<IReadOnlyList<QueueDto>> GetQueuesAsync(string vhost, CancellationToken ct = default);
    Task<QueueDto> GetQueueAsync(string vhost, string queue, CancellationToken ct = default);
    Task<IReadOnlyList<MessageDto>> GetMessagesAsync(string vhost, string queue, int count, string ackmode = "ack_requeue_false", CancellationToken ct = default);
    Task<IReadOnlyList<MessageDto>> PeekMessagesAsync(string vhost, string queue, int count, CancellationToken ct = default);
    Task<PublishResponse> PublishMessageAsync(string vhost, string exchange, PublishMessageRequest request, CancellationToken ct = default);
    Task PurgeQueueAsync(string vhost, string queue, CancellationToken ct = default);
    Task<IReadOnlyList<NodeOverviewDto>> GetNodesAsync(CancellationToken ct = default);
}
