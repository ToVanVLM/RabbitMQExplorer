namespace RabbitMQExplorer.Web.Models;

public class SavedFilter
{
    public int Id { get; set; }
    public int ConnectionId { get; set; }
    public string QueueName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string FilterJson { get; set; } = "{}";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public RabbitConnection? Connection { get; set; }
}
