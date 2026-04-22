# RabbitMQ Explorer

Een VS Code–geïnspireerde, browser-gebaseerde RabbitMQ management applicatie gebouwd op ASP.NET Core 10 Razor Pages. Kan gehost worden in IIS als alternatief voor de standaard RabbitMQ Management UI.

## Features

| Feature | Status |
|---|---|
| Meerdere verbindingen (DEV/TST/ACC/PRD) | ✅ |
| VHost selector in sidebar | ✅ |
| Explorer-achtige GUI (VS Code stijl, licht + donker) | ✅ |
| Tab-systeem voor meerdere open queues | ✅ |
| Message grid: sorteren, filteren, zoeken | ✅ |
| Monaco Editor voor body (JSON/XML syntax highlighting) | ✅ |
| Alle AMQP headers en properties bekijken en bewerken | ✅ |
| Berichten kopiëren, verplaatsen, verwijderen | ✅ |
| Bulk operaties (meerdere berichten tegelijk) | ✅ |
| Drag & drop tussen queues (Ctrl = verplaatsen) | ✅ |
| Edit body + properties en opnieuw versturen | ✅ |
| Exporteer/importeer berichten naar/van JSON bestand | ✅ |
| Dead-letter queue detectie en inspectie | ✅ |
| x-death history timeline | ✅ |
| Poison message detectie (x-death count > 3) | ✅ |
| Auto-refresh via SignalR (15s server push) | ✅ |
| Queue groei sparklines in sidebar | ✅ |
| Drempelwaarde notificaties | ✅ |
| Business data extractie (JSONPath/XPath/Regex) | ✅ |
| Dynamische extractiekolommen in grid | ✅ |
| CSV/JSON export met extractiedata | ✅ |
| Backup queue naar JSON bestand | ✅ |
| Restore vanuit backup bestand | ✅ |
| Migratie wizard (bron → doel omgeving) | ✅ |

## Vereisten

- .NET 10 Runtime / Hosting Bundle
- SQL Server (of SQL Server Express / LocalDB voor development)
- RabbitMQ met **Management Plugin** actief (`rabbitmq-plugins enable rabbitmq_management`)
- IIS met ASP.NET Core Module V2

## Installatie

### 1. Database configureren

Pas de connection string aan in `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=JOUW_SERVER;Database=RabbitMQExplorer;Integrated Security=True;"
  }
}
```

### 2. Publiceren

```powershell
cd src\RabbitMQExplorer.Web
dotnet publish -c Release -o C:\inetpub\rmqexplorer
```

### 3. IIS configuratie

1. Zorg dat het **ASP.NET Core Module V2** is geïnstalleerd (via .NET 10 Hosting Bundle)
2. Maak een nieuwe IIS site of application aan:
   - **Physical path:** `C:\inetpub\rmqexplorer`
   - **Application Pool:** Geen managed code (`.NET CLR Version: No Managed Code`)
3. De `web.config` is automatisch aanwezig na publicatie

### 4. Eerste gebruik

1. Navigeer naar de URL van de IIS site
2. Klik op **+** (verbinding toevoegen) in de sidebar
3. Vul de RabbitMQ Management API gegevens in:
   - **Host:** bijv. `rabbitmq.intern.be` of `localhost`
   - **Poort:** standaard `15672`
   - **Gebruikersnaam/Wachtwoord:** RabbitMQ Management gebruiker
4. Klik op **Verbinding testen**, daarna **Opslaan**

## Ontwikkeling

```powershell
cd src\RabbitMQExplorer.Web
dotnet run
```

De applicatie start op `https://localhost:5001`.

### Database migraties (EF Core)

```powershell
dotnet ef migrations add NieuweWijziging
dotnet ef database update
```

## Projectstructuur

```
src/
  RabbitMQExplorer.Web/
    Api/                  # Minimal API endpoints
    BackgroundServices/   # SignalR queue refresh
    Data/                 # EF Core DbContext
    Hubs/                 # SignalR QueueHub
    Models/               # Domain + RabbitMQ DTOs
    Pages/                # Razor Pages
      Connections/        # Verbindingen CRUD
      Messages/           # Backup & Restore
    Services/             # RabbitMQ API service
    wwwroot/
      css/app.css         # VS Code–stijl design systeem
      js/                 # Vanilla JS modules
tests/
  RabbitMQExplorer.Tests/
```

## Bekende beperkingen

- **Verwijderen** van individuele berichten werkt via re-queue mechanisme (hetzelfde als qhopper). RabbitMQ heeft geen natieve "delete één bericht" API.
- **AMQP directe verbinding** is niet ondersteund — enkel via Management API. Dit is bewust gekozen voor eenvoud en veiligheid.
- **Exchange/binding beheer** valt buiten scope — gebruik hiervoor de standaard Management UI.
- **JSONPath** implementatie is vereenvoudigd (geen wildcards of array indexing). Voor complexe queries: gebruik Regex.
