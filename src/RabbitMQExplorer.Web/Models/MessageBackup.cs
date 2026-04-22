namespace RabbitMQExplorer.Web.Models;

public class MessageBackup
{
    public int Id { get; set; }
    public int ConnectionId { get; set; }
    public string QueueName { get; set; } = string.Empty;
    public string VHost { get; set; } = "/";
    public string FilePath { get; set; } = string.Empty;
    public int MessageCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public RabbitConnection? Connection { get; set; }
}
