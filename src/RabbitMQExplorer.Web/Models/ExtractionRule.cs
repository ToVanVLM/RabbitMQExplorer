namespace RabbitMQExplorer.Web.Models;

public class ExtractionRule
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    /// <summary>Glob pattern matched against queue names, e.g. "*error*" or "order.*"</summary>
    public string QueuePattern { get; set; } = "*";
    public ExtractionType Type { get; set; }
    public string Expression { get; set; } = string.Empty;
    public string ColumnName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum ExtractionType
{
    JsonPath,
    XPath,
    Regex
}
