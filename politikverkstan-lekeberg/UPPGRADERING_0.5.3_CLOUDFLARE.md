# Uppgradering: Politikverkstan Lekeberg 0.5.3

Versionen behåller Worker-namnet `politikverkstan`, dina Cloudflare Access-inställningar och den befintliga D1-bindningen `DB`.

## 1. Säkerhetskopiera D1
Gå till **Storage & databases → D1 → din befintliga databas** och säkerhetskopiera innan du gör ändringar. Skapa inte en ny databas.

## 2. Kör endast den nya SQL-migreringen
I D1 **Console** på den befintliga databasen kör:

```sql
CREATE TABLE IF NOT EXISTS work_branding (
  id INTEGER PRIMARY KEY CHECK(id=1),
  png_base64 TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Den skapar en separat tabell, men ändrar inga användarkonton, motioner, kommentarer, delningar eller äldre tabeller. SQL som körs manuellt registrerar inte automatiskt en Wrangler-migrering. Kör inte äldre migrationsfiler igen utan att kontrollera migrationshistoriken.

## 3. Publicering
Projektets GitHub-repository är `politikverkstan/politikverkstan`. Root directory: `politikverkstan-lekeberg`. Build: `npm run build`. Deploy: `npx wrangler deploy`. **Behåll befintligt D1-ID, `wrangler.jsonc` och Cloudflare Secrets.** Commits kan starta automatisk publicering; kontrollera under Cloudflare Workers & Pages → politikverkstan → Builds/Deployments.

## 4. Visningsnamn
Logga in under `/arbetsrum`, öppna **Administration → Användare → Godkända konton**. Redigera fältet Namn och klicka **Spara namn**. Inloggning, e-post och roll förblir oförändrade.

## 5. Godkänd logotyp
Under **Användare** finns **Dokumentprofil – logotyp**. Välj PNG-fil som du har rätt att använda (högst 250 KB och 2400×2400 pixlar). Tryck **Spara logotyp**. Den används i SD-mallens PDF och förhandsgranskning. Ingen logotyp är förinstallerad; textlayouten fungerar ändå.

## 6. Kontrollera
Öppna ett befintligt utkast, kontrollera namn och PDF-export (SD + neutral). Kontrollera att äldre motioner och delningar består. Testa uppladdad logo endast om du har godkänd fil.

## Viktiga begränsningar
PDF använder Times-Roman/Helvetica, inte påstått officiella SD-typsnitt. Full Unicode utanför WinAnsi stöds inte; källtexten lagras oförändrad. PDF-förhandsvisningen visar ungefärlig layout men inte identiska sidbrytningar. Testa i din Cloudflare-miljö efter publicering.
