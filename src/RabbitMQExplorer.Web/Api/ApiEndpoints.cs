using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using RabbitMQExplorer.Web.Data;
using RabbitMQExplorer.Web.Models;
using RabbitMQExplorer.Web.Models.RabbitMq;
using RabbitMQExplorer.Web.Services;

namespace RabbitMQExplorer.Web.Api;

/// <summary>
/// Registreert alle Minimal API endpoints onder /api/.
/// </summary>
public static class ApiEndpoints
{
    public static WebApplication MapApiEndpoints(this WebApplication app)
    {
        var api = app.MapGroup("/api");

        // ── Verbinding testen ─────────────────────────────────
        api.MapPost("/connections/test", async (
            HttpRequest req,
            IHttpClientFactory httpFactory,
            IDataProtectionProvider dp,
            ILogger<Program> logger) =>
        {
            var form = await req.ReadFormAsync();
            var host = form["Input.Host"].ToString().Trim();
            var port = int.TryParse(form["Input.Port"], out var p) ? p : 15672;
            var user = form["Input.Username"].ToString();
            var pass = form["Input.Password"].ToString();
            var ssl = form["Input.UseSsl"] == "true";

            var scheme = ssl ? "https" : "http";
            var client = httpFactory.CreateClient();
            client.BaseAddress = new Uri($"{scheme}://{host}:{port}");
            var creds = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{user}:{pass}"));
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", creds);
            client.Timeout = TimeSpan.FromSeconds(10);

            try
            {
                var response = await client.GetAsync("/api/overview");
                return response.IsSuccessStatusCode
                    ? Results.Ok(new { success = true, message = $"Verbonden met {host}:{port}" })
                    : Results.Ok(new { success = false, message = $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}" });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, message = ex.Message });
            }
        }).DisableAntiforgery();

        // ── VHosts ophalen ────────────────────────────────────
        api.MapGet("/connections/{id:int}/vhosts", async (
            int id, AppDbContext db, RabbitMqClientFactory factory,
            ILogger<RabbitMqApiService> logger) =>
        {
            var conn = await db.Connections.FindAsync(id);
            if (conn is null) return Results.NotFound();
            var svc = factory.CreateForConnection(conn, logger);
            var vhosts = await svc.GetVHostsAsync();
            return Results.Ok(vhosts);
        });

        // ── Queues ophalen per vhost ──────────────────────────
        api.MapGet("/connections/{id:int}/vhosts/{vhost}/queues", async (
            int id, string vhost, AppDbContext db, RabbitMqClientFactory factory,
            ILogger<RabbitMqApiService> logger) =>
        {
            var conn = await db.Connections.FindAsync(id);
            if (conn is null) return Results.NotFound();
            var svc = factory.CreateForConnection(conn, logger);
            var queues = await svc.GetQueuesAsync(Uri.UnescapeDataString(vhost));
            return Results.Ok(queues);
        });

        // ── Messages ophalen (peek) ───────────────────────────
        api.MapGet("/connections/{id:int}/vhosts/{vhost}/queues/{queue}/messages", async (
            int id, string vhost, string queue,
            int count, bool peek,
            AppDbContext db, RabbitMqClientFactory factory,
            ILogger<RabbitMqApiService> logger) =>
        {
            var conn = await db.Connections.FindAsync(id);
            if (conn is null) return Results.NotFound();
            var svc = factory.CreateForConnection(conn, logger);
            var messages = peek
                ? await svc.PeekMessagesAsync(Uri.UnescapeDataString(vhost), Uri.UnescapeDataString(queue), count)
                : await svc.GetMessagesAsync(Uri.UnescapeDataString(vhost), Uri.UnescapeDataString(queue), count);
            return Results.Ok(messages);
        });

        // ── Message(s) publiceren (copy/move/republish) ───────
        api.MapPost("/connections/{id:int}/vhosts/{vhost}/queues/{queue}/publish", async (
            int id, string vhost, string queue,
            PublishMessageRequest body,
            AppDbContext db, RabbitMqClientFactory factory,
            ILogger<RabbitMqApiService> logger) =>
        {
            var conn = await db.Connections.FindAsync(id);
            if (conn is null) return Results.NotFound();

            var svc = factory.CreateForConnection(conn, logger);
            var decodedVhost = Uri.UnescapeDataString(vhost);
            var decodedQueue = Uri.UnescapeDataString(queue);
            var request = string.IsNullOrWhiteSpace(body.RoutingKey)
                ? body with { RoutingKey = decodedQueue }
                : body;

            var result = await svc.PublishMessageAsync(decodedVhost, "amq.default", request);
            return Results.Ok(result);
        });

        // ── Queue leegmaken (purge) ───────────────────────────
        api.MapDelete("/connections/{id:int}/vhosts/{vhost}/queues/{queue}/messages", async (
            int id, string vhost, string queue,
            AppDbContext db, RabbitMqClientFactory factory,
            ILogger<RabbitMqApiService> logger) =>
        {
            var conn = await db.Connections.FindAsync(id);
            if (conn is null) return Results.NotFound();
            var svc = factory.CreateForConnection(conn, logger);
            await svc.PurgeQueueAsync(Uri.UnescapeDataString(vhost), Uri.UnescapeDataString(queue));
            return Results.NoContent();
        });

        // ── Extractieregels ───────────────────────────────────
        api.MapGet("/extraction-rules", async (AppDbContext db) =>
            Results.Ok(await db.ExtractionRules.OrderBy(r => r.Name).ToListAsync()));

        api.MapPost("/extraction-rules", async (ExtractionRule rule, AppDbContext db) =>
        {
            db.ExtractionRules.Add(rule);
            await db.SaveChangesAsync();
            return Results.Created($"/api/extraction-rules/{rule.Id}", rule);
        });

        api.MapPut("/extraction-rules/{id:int}", async (int id, ExtractionRule rule, AppDbContext db) =>
        {
            if (rule.Id != id) return Results.BadRequest();
            db.ExtractionRules.Update(rule);
            await db.SaveChangesAsync();
            return Results.Ok(rule);
        });

        api.MapDelete("/extraction-rules/{id:int}", async (int id, AppDbContext db) =>
        {
            var rule = await db.ExtractionRules.FindAsync(id);
            if (rule is null) return Results.NotFound();
            db.ExtractionRules.Remove(rule);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // ── Backup registratie ────────────────────────────────
        api.MapPost("/backups", async (MessageBackup backup, AppDbContext db) =>
        {
            db.MessageBackups.Add(backup);
            await db.SaveChangesAsync();
            return Results.Created($"/api/backups/{backup.Id}", backup);
        });

        api.MapGet("/backups", async (AppDbContext db) =>
            Results.Ok(await db.MessageBackups
                .Include(b => b.Connection)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync()));

        // ── Dashboard: geaggregeerde queue health ─────────────
        api.MapGet("/dashboard/summary", async (
            AppDbContext db, RabbitMqClientFactory factory,
            ILogger<RabbitMqApiService> logger) =>
        {
            var connections = await db.Connections.ToListAsync();

            var tasks = connections.Select(async conn =>
            {
                try
                {
                    var svc = factory.CreateForConnection(conn, logger);
                    var vhosts = await svc.GetVHostsAsync();
                    var queues = new List<QueueHealthSummary>();
                    foreach (var vh in vhosts)
                    {
                        var qs = await svc.GetQueuesAsync(vh.Name);
                        queues.AddRange(qs.Select(q => new QueueHealthSummary(
                            conn.Id, conn.Name, conn.Environment,
                            vh.Name, q.Name, q.Messages,
                            q.MessagesUnacknowledged, q.Consumers, q.State)));
                    }
                    return (queues, health: new ConnectionHealthSummary(
                        conn.Id, conn.Name, conn.Environment, true, null));
                }
                catch (Exception ex)
                {
                    return (queues: new List<QueueHealthSummary>(),
                        health: new ConnectionHealthSummary(
                            conn.Id, conn.Name, conn.Environment, false, ex.Message));
                }
            }).ToList();

            var results = await Task.WhenAll(tasks);
            var allQueues = results.SelectMany(r => r.queues).ToList();

            return Results.Ok(new
            {
                topByDepth   = allQueues.OrderByDescending(q => q.Messages).Take(10),
                topByUnacked = allQueues.Where(q => q.Unacked > 0)
                                        .OrderByDescending(q => q.Unacked).Take(10),
                connections  = results.Select(r => r.health),
                timestamp    = DateTime.UtcNow
            });
        });

        return app;
    }
}

// ── Dashboard response DTOs ───────────────────────────────
internal record QueueHealthSummary(
    int ConnId, string ConnName, string Environment,
    string VHost, string Queue,
    long Messages, long Unacked, long Consumers, string? State);

internal record ConnectionHealthSummary(
    int Id, string Name, string Environment,
    bool Reachable, string? Error);
