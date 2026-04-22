namespace RabbitMQExplorer.Web.Models;

public class RabbitConnection
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 15672;
    public string Username { get; set; } = string.Empty;
    /// <summary>Encrypted via ASP.NET Core Data Protection API.</summary>
    public string PasswordEncrypted { get; set; } = string.Empty;
    public string Environment { get; set; } = string.Empty; // DEV, TST, ACC, PRD
    public string DefaultVHost { get; set; } = "/";
    public bool UseSsl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsReadOnly { get; set; }
}
