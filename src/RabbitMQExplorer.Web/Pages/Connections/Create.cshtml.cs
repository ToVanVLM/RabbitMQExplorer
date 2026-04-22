using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using RabbitMQExplorer.Web.Data;
using RabbitMQExplorer.Web.Models;
using RabbitMQExplorer.Web.Services;

namespace RabbitMQExplorer.Web.Pages.Connections;

public class CreateModel : PageModel
{
    private readonly AppDbContext _db;
    private readonly RabbitMqClientFactory _factory;

    public CreateModel(AppDbContext db, RabbitMqClientFactory factory)
    {
        _db = db;
        _factory = factory;
    }

    [BindProperty]
    public InputModel Input { get; set; } = new();

    public void OnGet() { }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid) return Page();

        var conn = new RabbitConnection
        {
            Name = Input.Name,
            Host = Input.Host,
            Port = Input.Port,
            Username = Input.Username,
            PasswordEncrypted = _factory.EncryptPassword(Input.Password),
            DefaultVHost = Input.DefaultVHost,
            Environment = Input.Environment,
            UseSsl = Input.UseSsl,
            IsReadOnly = Input.IsReadOnly,
            CreatedAt = DateTime.UtcNow
        };

        _db.Connections.Add(conn);
        await _db.SaveChangesAsync();

        return RedirectToPage("/Index");
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

        [Required(ErrorMessage = "Wachtwoord is verplicht")]
        public string Password { get; set; } = string.Empty;

        public string DefaultVHost { get; set; } = "/";
        public string Environment { get; set; } = "DEV";
        public bool UseSsl { get; set; }
        public bool IsReadOnly { get; set; }
    }
}
