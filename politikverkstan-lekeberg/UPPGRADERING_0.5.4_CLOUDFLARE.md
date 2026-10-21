# Uppgradering: Politikverkstan 0.5.4 – dokumentarkiv

Den här versionen ger det befintliga skyddade arbetsrummet en filarea med **Mina dokument**, **Våra dokument**, mappar/undermappar, filuppladdning och automatisk privat arkivering av motioner som exporteras till PDF.

**Inget nytt Cloudflare-konto, ingen ny Worker eller R2-bucket behövs.** Filerna sparas som uppdelade Base64-block i den befintliga D1-databasen. Befintliga motioner, delningar och användare berörs inte av datamigreringen.

## 1. Gör säkerhetskopia och kör ny migrering

Säkerhetskopiera den befintliga produktions-D1-databasen och kontrollera att den kan återställas. I samma databas, kör `migrations/0006_files.sql` via D1 Console **efter** `0005_branding.sql`. Den skapar tre nya tabeller och index (inga `ALTER`, `DROP` eller dataraderingar).

SQL-koden är idempotent för tabeller och index, men håll ordning på migrationshistoriken. Om tidigare migrationer körts manuellt kan Wranglers registrerade migrationshistorik skilja sig; kör inte samtliga gamla migrationsfiler igen utan kontroll.

Kontrollera efteråt:

```sql
SELECT name FROM sqlite_master
WHERE name IN ('work_folders','work_files','work_file_chunks')
ORDER BY name;
```

Tre tabeller ska visas.

## 2. Publicera befintlig Worker

Repository: `politikverkstan/politikverkstan`, projektrot `politikverkstan-lekeberg`.

- Bygg: `npm run build`
- Distribution: `npx wrangler deploy`
- Behåll nuvarande `wrangler.jsonc`, D1-bindning `DB` och Cloudflare Access-konfiguration.
- Cloudflare Access måste fortsatt skydda `/arbetsrum*` och `/api/private/*`. Workern kontrollerar även användarkonto och JWT på serversidan.

GitHub-commit kan utlösa automatisk publicering, men det måste kontrolleras i Cloudflare. **Kör datamigreringen innan den nya filarean används.** Utan tabellerna kommer filförfrågningar att misslyckas; övriga funktioner ska inte påverkas.

## 3. Så fungerar filhanteringen

- **Mina dokument**: endast filens ägare ser och hanterar egna filer. Även administratörer saknar generell läsbehörighet till andras privata filer.
- **Våra dokument**: samtliga *aktiva godkända* användare ser och kan hämta delade filer. Uppladdaren kan ändra namn, flytta eller radera sina filer. Varje användare kan skapa egna mappar i båda filareorna, även undermappar.
- **Dela/Gör privat**: ägaren flyttar filen mellan områdena genom ett uttryckligt val. Vid byte av område hamnar den i det nya områdets rotmapp.
- **PDF-export**: när man klickar **Exportera PDF** i motionsverkstaden laddas PDF:en ned som tidigare och ett exemplar sparas **privat** i rotmappen `Mina dokument`. Om arkiveringen misslyckas visas ett felmeddelande men nedladdningen fortsätter. Filer blir inte officiellt inlämnade genom detta.
- Mappar kan byta namn och raderas om de är tomma. Filer kan flyttas inom området och få nya namn.

## 4. Begränsningar och säkerhet

- Maximalt **10 MiB per fil** och **100 MiB totalt per ägare**, inklusive ägarens delade filer. Detta är ett mindre dokumentarkiv, inte avsett för stora mediafiler eller fullskalig molnlagring.
- Alla filer laddas ned som **bilagor**, inte som körbar HTML på webbplatsens domän; åtkomsten kontrolleras vid varje nedladdning.
- Ingen versionshistorik, per-fil-delning med enskilda personer, förhandsgranskning, virusskanning eller återställning från papperskorg finns i den här första versionen.
- `Våra dokument` innebär åtkomst för **hela den aktiva arbetsgruppen**. Filer med särskild sekretess, känsliga personuppgifter eller begränsad spridningsrätt ska inte laddas upp utan separat rättslig och teknisk bedömning.
- D1-lagring med Base64 har lagringspåslag. Vid större dokumentvolymer bör filinnehållet flyttas till Cloudflare R2, med kvarvarande behörigheter i D1.

## 5. Verifiering efter migrering och distribution

Testa med minst två olika godkända konton: skapa privat mapp/undermapp, ladda upp en PDF och kontrollera att kontot B **inte** ser eller kan hämta filen; dela därefter filen och kontrollera att B kan hämta men inte ändra den; gör filen privat igen och kontrollera att B:s hämtning nekas. Exportera en motion till PDF och kontrollera att samma PDF finns i `Mina dokument` och går att ladda ned.

Denna version är kodmässigt integrerad men **inte verifierad i produktions-Cloudflare** innan ovanstående kontroller utförts.
