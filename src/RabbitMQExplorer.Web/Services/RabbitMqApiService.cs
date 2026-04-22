using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using RabbitMQExplorer.Web.Models.RabbitMq;

namespace RabbitMQExplorer.Web.Services;

public sealed class RabbitMqApiService : IRabbitMqApiService
{
    private readonly HttpClient _http;
    private readonly ILogger<RabbitMqApiService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        NumberHandling = JsonNumberHandling.AllowReadingFromString
    };

    public RabbitMqApiService(HttpClient http, ILogger<RabbitMqApiService> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<IReadOnlyList<VHostDto>> GetVHostsAsync(CancellationToken ct = default)
    {
        var result = await GetAsync<List<VHostDto>>("/api/vhosts", ct);
        return result ?? [];
    }

    public async Task<VHostDto> GetVHostAsync(string vhost, CancellationToken ct = default)
    {
        var result = await GetAsync<VHostDto>($"/api/vhosts/{Uri.EscapeDataString(vhost)}", ct);
        return result ?? throw new InvalidOperationException($"VHost '{vhost}' not found.");
    }

    public async Task<IReadOnlyList<QueueDto>> GetQueuesAsync(string vhost, CancellationToken ct = default)
    {
        var result = await GetAsync<List<QueueDto>>($"/api/queues/{Uri.EscapeDataString(vhost)}", ct);
        return result ?? [];
    }

    public async Task<QueueDto> GetQueueAsync(string vhost, string queue, CancellationToken ct = default)
    {
        var result = await GetAsync<QueueDto>(
            $"/api/queues/{Uri.EscapeDataString(vhost)}/{Uri.EscapeDataString(queue)}", ct);
        return result ?? throw new InvalidOperationException($"Queue '{queue}' not found.");
    }

    public async Task<IReadOnlyList<MessageDto>> GetMessagesAsync(
        string vhost, string queue, int count, string ackmode = "ack_requeue_false", CancellationToken ct = default)
    {
        var url = $"/api/queues/{Uri.EscapeDataString(vhost)}/{Uri.EscapeDataString(queue)}/get";
        var body = new GetMessagesRequest(count, ackmode, "auto", 50000);
        var result = await PostAsync<GetMessagesRequest, List<MessageDto>>(url, body, ct);
        return result ?? [];
    }

    public Task<IReadOnlyList<MessageDto>> PeekMessagesAsync(
        string vhost, string queue, int count, CancellationToken ct = default) =>
        GetMessagesAsync(vhost, queue, count, "ack_requeue_true", ct);

    public async Task<PublishResponse> PublishMessageAsync(
        string vhost, string exchange, PublishMessageRequest request, CancellationToken ct = default)
    {
        var url = $"/api/exchanges/{Uri.EscapeDataString(vhost)}/{Uri.EscapeDataString(exchange)}/publish";
        var result = await PostAsync<PublishMessageRequest, PublishResponse>(url, request, ct);
        return result ?? new PublishResponse(false);
    }

    public async Task PurgeQueueAsync(string vhost, string queue, CancellationToken ct = default)
    {
        var url = $"/api/queues/{Uri.EscapeDataString(vhost)}/{Uri.EscapeDataString(queue)}/contents";
        var response = await _http.DeleteAsync(url, ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task<IReadOnlyList<NodeOverviewDto>> GetNodesAsync(CancellationToken ct = default)
    {
        var result = await GetAsync<List<NodeOverviewDto>>("/api/nodes", ct);
        return result ?? [];
    }

    private async Task<T?> GetAsync<T>(string path, CancellationToken ct)
    {
        try
        {
            var response = await _http.GetAsync(path, ct);
            response.EnsureSuccessStatusCode();
            var stream = await response.Content.ReadAsStreamAsync(ct);
            return await JsonSerializer.DeserializeAsync<T>(stream, JsonOptions, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GET {Path} failed", path);
            throw;
        }
    }

    private async Task<TResponse?> PostAsync<TRequest, TResponse>(string path, TRequest body, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(body, JsonOptions);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        try
        {
            var response = await _http.PostAsync(path, content, ct);
            response.EnsureSuccessStatusCode();
            var stream = await response.Content.ReadAsStreamAsync(ct);
            return await JsonSerializer.DeserializeAsync<TResponse>(stream, JsonOptions, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "POST {Path} failed", path);
            throw;
        }
    }
}
