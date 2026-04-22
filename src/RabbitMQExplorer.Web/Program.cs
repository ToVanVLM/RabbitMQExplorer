using Microsoft.EntityFrameworkCore;
using RabbitMQExplorer.Web.Api;
using RabbitMQExplorer.Web.BackgroundServices;
using RabbitMQExplorer.Web.Data;
using RabbitMQExplorer.Web.Hubs;
using RabbitMQExplorer.Web.Services;

var builder = WebApplication.CreateBuilder(args);

// Razor Pages + SignalR
builder.Services.AddRazorPages();
builder.Services.AddSignalR();

// Data Protection (voor password encryption)
builder.Services.AddDataProtection();

// EF Core + SQL Server
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// HttpClient voor RabbitMQ API
builder.Services.AddHttpClient("RabbitMQ")
    .AddStandardResilienceHandler();

// Named client factory voor testen zonder resilience handler
builder.Services.AddHttpClient();

// Applicatieservices
builder.Services.AddScoped<RabbitMqClientFactory>();
builder.Services.AddHttpContextAccessor();

// Background service voor queue stat push
builder.Services.AddHostedService<QueueRefreshService>();

// Session voor actieve verbindingsselectie
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(o =>
{
    o.Cookie.HttpOnly = true;
    o.Cookie.IsEssential = true;
    o.IdleTimeout = TimeSpan.FromHours(8);
});

var app = builder.Build();

// Automatische database migratie bij opstarten
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseSession();
app.UseAuthorization();

app.MapStaticAssets();
app.MapRazorPages().WithStaticAssets();
app.MapHub<QueueHub>("/hubs/queue");
app.MapApiEndpoints();

app.Run();

