using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using RabbitMQExplorer.Web.Data;
using RabbitMQExplorer.Web.Services;

namespace RabbitMQExplorer.Web.Pages.Connections;

public class EditModel : PageModel
{
    private readonly AppDbContext _db;
    private readonly RabbitMqClientFactory _factory;

    public EditModel(AppDbContext db, RabbitMqClientFactory factory)
    {
        _db = db;
        _factory = factory;
    }

    [BindProperty]
    public InputModel Input { get; set; } = new();

    public async Task<IActionResult> OnGetAsync(int id)
    {
        var conn = await _db.Connections.FindAsync(id);
        if (conn is null) return NotFound();

        Input = new InputModel
        {
            Name = conn.Name,
            Host = conn.Host,
            Port = conn.Port,
            Username = conn.Username,
            DefaultVHost = conn.DefaultVHost,
            Environment = conn.Environment,
            UseSsl = conn.UseSsl,
            IsReadOnly = conn.IsReadOnly
        };

        return Page();
    }

    public async Task<IActionResult> OnPostAsync(int id)
    {
        if (!ModelState.IsValid) return Page();

        var conn = await _db.Connections.FindAsync(id);
        if (conn is null) return NotFound();

        conn.Name = Input.Name;
        conn.Host = Input.Host;
        conn.Port = Input.Port;
        conn.Username = Input.Username;
        conn.DefaultVHost = Input.DefaultVHost;
        conn.Environment = Input.Environment;
        conn.UseSsl = Input.UseSsl;
        conn.IsReadOnly = Input.IsReadOnly;

        if (!string.IsNullOrWhiteSpace(Input.Password))
        {
            conn.PasswordEncrypted = _factory.EncryptPassword(Input.Password);
        }

        await _db.SaveChangesAsync();
        return RedirectToPage("/Connections/Index");
    }

    public async Task<IActionResult> OnPostDeleteAsync(int id)
    {
        var conn = await _db.Connections.FindAsync(id);
        if (conn is not null)
        {
            _db.Connections.Remove(conn);
            await _db.SaveChangesAsync();
        }

        return RedirectToPage("/Connections/Index");
    }

    public class InputModel
    {
        [Required(ErrorMessage = "Naam is verplicht")]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Host is verplicht")]
        [MaxLength(250)]
        public string Host { get; set; } = string.Empty;

        [Range(1, 65535)]
        public int Port { get; set; } = 15672;

        [Required(ErrorMessage = "Gebruikersnaam is verplicht")]
        public string Username { get; set; } = string.Empty;

        [MaxLength(200)]
        public string Password { get; set; } = string.Empty;

        public string DefaultVHost { get; set; } = "/";
        public string Environment { get; set; } = "DEV";
        public bool UseSsl { get; set; }
        public bool IsReadOnly { get; set; }
    }
}
