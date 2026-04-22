using System.Net.Http.Headers;
using System.Text;
using Microsoft.AspNetCore.DataProtection;
using RabbitMQExplorer.Web.Data;
using RabbitMQExplorer.Web.Models;

namespace RabbitMQExplorer.Web.Services;

/// <summary>Builds an IRabbitMqApiService for a given connection.</summary>
public sealed class RabbitMqClientFactory
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IDataProtector _protector;

    public RabbitMqClientFactory(IHttpClientFactory httpClientFactory, IDataProtectionProvider dp)
    {
        _httpClientFactory = httpClientFactory;
        _protector = dp.CreateProtector("RabbitMQ.Connection.Password");
    }

    public IRabbitMqApiService CreateForConnection(RabbitConnection connection, ILogger<RabbitMqApiService> logger)
    {
        var client = _httpClientFactory.CreateClient("RabbitMQ");
        var scheme = connection.UseSsl ? "https" : "http";
        client.BaseAddress = new Uri($"{scheme}://{connection.Host}:{connection.Port}");

        var password = _protector.Unprotect(connection.PasswordEncrypted);
        var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{connection.Username}:{password}"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);

        return new RabbitMqApiService(client, logger);
    }

    public string EncryptPassword(string plainText) => _protector.Protect(plainText);
}
