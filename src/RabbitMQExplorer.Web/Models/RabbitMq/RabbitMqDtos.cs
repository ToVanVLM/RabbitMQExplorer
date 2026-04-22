using System.Text.Json.Serialization;

namespace RabbitMQExplorer.Web.Models.RabbitMq;

public record VHostDto(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("tags")] string[]? Tags
);

public record QueueDto(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("vhost")] string VHost,
    [property: JsonPropertyName("messages")] long Messages,
    [property: JsonPropertyName("messages_ready")] long MessagesReady,
    [property: JsonPropertyName("messages_unacknowledged")] long MessagesUnacknowledged,
    [property: JsonPropertyName("consumers")] long Consumers,
    [property: JsonPropertyName("state")] string? State,
    [property: JsonPropertyName("type")] string? Type,
    [property: JsonPropertyName("message_stats")] QueueMessageStatsDto? MessageStats,
    [property: JsonPropertyName("arguments")] IDictionary<string, object?>? Arguments
);

public record QueueMessageStatsDto(
    [property: JsonPropertyName("publish_details")] RateDetailDto? PublishDetails,
    [property: JsonPropertyName("deliver_get_details")] RateDetailDto? DeliverGetDetails,
    [property: JsonPropertyName("ack_details")] RateDetailDto? AckDetails
);

public record RateDetailDto(
    [property: JsonPropertyName("rate")] double Rate
);

public record MessageDto(
    [property: JsonPropertyName("redelivered")] bool Redelivered,
    [property: JsonPropertyName("exchange")] string Exchange,
    [property: JsonPropertyName("routing_key")] string RoutingKey,
    [property: JsonPropertyName("message_count")] long MessageCount,
    [property: JsonPropertyName("properties")] MessagePropertiesDto? Properties,
    [property: JsonPropertyName("payload_encoding")] string? PayloadEncoding,
    [property: JsonPropertyName("payload_bytes")] long PayloadBytes,
    [property: JsonPropertyName("payload")] string Payload
);

public record MessagePropertiesDto(
    [property: JsonPropertyName("content_type")] string? ContentType,
    [property: JsonPropertyName("content_encoding")] string? ContentEncoding,
    [property: JsonPropertyName("priority")] int? Priority,
    [property: JsonPropertyName("correlation_id")] string? CorrelationId,
    [property: JsonPropertyName("reply_to")] string? ReplyTo,
    [property: JsonPropertyName("expiration")] string? Expiration,
    [property: JsonPropertyName("message_id")] string? MessageId,
    [property: JsonPropertyName("timestamp")] long? Timestamp,
    [property: JsonPropertyName("type")] string? Type,
    [property: JsonPropertyName("user_id")] string? UserId,
    [property: JsonPropertyName("app_id")] string? AppId,
    [property: JsonPropertyName("cluster_id")] string? ClusterId,
    [property: JsonPropertyName("delivery_mode")] int? DeliveryMode,
    [property: JsonPropertyName("headers")] IDictionary<string, object?>? Headers
);

public record PublishMessageRequest(
    [property: JsonPropertyName("properties")] IDictionary<string, object?> Properties,
    [property: JsonPropertyName("routing_key")] string RoutingKey,
    [property: JsonPropertyName("payload")] string Payload,
    [property: JsonPropertyName("payload_encoding")] string PayloadEncoding
);

public record GetMessagesRequest(
    [property: JsonPropertyName("count")] int Count,
    [property: JsonPropertyName("ackmode")] string Ackmode,
    [property: JsonPropertyName("encoding")] string Encoding,
    [property: JsonPropertyName("truncate")] int Truncate
);

public record PublishResponse(
    [property: JsonPropertyName("routed")] bool Routed
);

public record NodeOverviewDto(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("type")] string? Type,
    [property: JsonPropertyName("running")] bool Running,
    [property: JsonPropertyName("mem_used")] long MemUsed,
    [property: JsonPropertyName("fd_used")] long FdUsed,
    [property: JsonPropertyName("proc_used")] long ProcUsed
);
