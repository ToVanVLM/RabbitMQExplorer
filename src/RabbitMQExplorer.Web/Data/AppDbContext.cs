using Microsoft.EntityFrameworkCore;
using RabbitMQExplorer.Web.Models;

namespace RabbitMQExplorer.Web.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<RabbitConnection> Connections => Set<RabbitConnection>();
    public DbSet<ExtractionRule> ExtractionRules => Set<ExtractionRule>();
    public DbSet<SavedFilter> SavedFilters => Set<SavedFilter>();
    public DbSet<MessageBackup> MessageBackups => Set<MessageBackup>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RabbitConnection>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.Host).HasMaxLength(250).IsRequired();
            e.Property(x => x.Username).HasMaxLength(100).IsRequired();
            e.Property(x => x.PasswordEncrypted).IsRequired();
            e.Property(x => x.Environment).HasMaxLength(10);
            e.Property(x => x.DefaultVHost).HasMaxLength(200);
        });

        modelBuilder.Entity<ExtractionRule>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.QueuePattern).HasMaxLength(200);
            e.Property(x => x.Expression).IsRequired();
            e.Property(x => x.ColumnName).HasMaxLength(80).IsRequired();
        });

        modelBuilder.Entity<SavedFilter>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Connection).WithMany().HasForeignKey(x => x.ConnectionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MessageBackup>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Connection).WithMany().HasForeignKey(x => x.ConnectionId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
