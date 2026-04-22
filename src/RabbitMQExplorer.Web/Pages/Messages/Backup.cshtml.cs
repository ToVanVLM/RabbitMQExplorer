using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using RabbitMQExplorer.Web.Data;
using RabbitMQExplorer.Web.Models;

namespace RabbitMQExplorer.Web.Pages.Messages;

public class BackupModel : PageModel
{
    private readonly AppDbContext _db;
    public BackupModel(AppDbContext db) => _db = db;

    public IReadOnlyList<RabbitConnection> Connections { get; private set; } = [];

    public async Task OnGetAsync() =>
        Connections = await _db.Connections.OrderBy(c => c.Name).ToListAsync();
}
