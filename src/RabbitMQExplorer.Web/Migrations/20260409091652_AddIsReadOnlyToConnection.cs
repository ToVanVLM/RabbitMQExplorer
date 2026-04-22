using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RabbitMQExplorer.Web.Migrations
{
    /// <inheritdoc />
    public partial class AddIsReadOnlyToConnection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsReadOnly",
                table: "Connections",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsReadOnly",
                table: "Connections");
        }
    }
}
