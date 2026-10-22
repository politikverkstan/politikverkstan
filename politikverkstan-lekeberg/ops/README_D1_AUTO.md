# Automatiska D1-migreringar med befintlig Cloudflare GitHub-koppling

**Status:** Kodstöd inlagt; inte aktiverat i Cloudflare och inga produktionsdata ändrade.

## Förutsättningar

- Cloudflare Worker `politikverkstan` är kopplad till `politikverkstan/politikverkstan`, gren `main`.
- Cloudflare Builds rotkatalog är `politikverkstan-lekeberg`.
- Produktionsdatabasen i `wrangler.jsonc` är `mandatportal-analytics`.
- Cloudflares byggmiljö har Wrangler och behörighet att utföra **D1 Edit** på den databasen, inte bara Worker Deploy.
- De gamla SQL-filerna 0001–0011 har körts manuellt och **saknar ännu** normal migrationshistorik. Använd aldrig `wrangler d1 migrations apply --remote` innan engångsregistreringen är verifierad.

## Engångsarbete: registrera befintligt schema

1. Ta en fullständig export/säkerhetskopia av produktionsdatabasen i Cloudflare och kontrollera att exporten har skapats. Hantera filen som skyddsvärt arbetsmaterial, inte som en publik GitHub-fil.
2. Kontrollera att objekten i originalmigreringarna finns. Detta omfattar 51 explicit definierade tabeller/index/triggers och 12 kolumner som tillkommit via `ALTER TABLE`. SQL-filen nedan vägrar skapa poster om något av dessa saknas. Den verifierar inte exakt SQL-definition på befintliga objekt.
3. I D1 SQL Console, kör de här **separata, läsande** kontrollfrågorna:

```sql
PRAGMA foreign_key_check;
PRAGMA quick_check;
```

Förväntat: **inga rader** från `foreign_key_check`, respektive **ok** från `quick_check`. Om annat: avbryt.

4. Kör efter denna kontroll endast filen [`ops/manual-baseline-0001-to-0011.sql`](manual-baseline-0001-to-0011.sql) i **rätt** databas. Den skapar Wranglers `d1_migrations` och registrerar bara filnamnen 0001–0011, förutsatt att alla 51 objekt och de 12 kompletterade kolumnerna finns. Den kör **inte** om någon äldre DDL eller uppdaterar arbetsdata. Vid ofullständigt schema registreras inga gamla migreringar.
5. Kontrollera att:

```sql
SELECT id, name FROM d1_migrations ORDER BY id;
```

ger exakt **11** förväntade unika filnamn `0001_analytics.sql` till `0011_traceability.sql`, i rätt ordning. Om något saknas eller är oväntat: avbryt och granska före automatisk deployment.

## Aktivera via befintlig Cloudflare Builds

Gå till **Cloudflare Dashboard → Workers & Pages → politikverkstan → Settings → Builds** (menynamn kan variera).

Behåll repository och branch `main` och projektkatalogen `politikverkstan-lekeberg`. Ändra **Deploy command** till:

```bash
npm run deploy:cloudflare
```

Viktigt: Använd det som **deploy-kommandot**, inte build-kommandot. Ändra inte Cloudflares GitHub-anslutning. Kräv erforderlig D1-behörighet för byggmiljön. Om integreringen inte har den rättigheten, konfigurera behörighet i Cloudflare; kontrollera innan eventuell credential-rotation.

Kommandot `ops/deploy-with-d1-check.mjs`:

1. Gör en läsande fråga efter migreringshistoriken i **remote** D1.
2. Vägrar fortsätta om tabellen saknas, historiken inte omfattar exakt den lokala baslinjen 0001–0011, poster är dubblerade eller okända eller databasenamnet avviker.
3. Kör `wrangler d1 migrations apply mandatportal-analytics --remote` endast vid nya filer. Wrangler hanterar då registrering och D1-snapshot per migration.
4. Kontrollerar att alla lokala migrationer nu finns registrerade och kör först därefter `wrangler deploy`.

**Ingen auto-baseline:** Framtida migreringar i `migrations/` kan köras automatiskt efter att historiken etablerats. Engångsfilen i `ops/` upptäcks inte av Wrangler.

## Begränsningar

- Bygg-/enhetstester i GitHub Actions verifierar inte verkliga Cloudflare-inställningar eller D1-innehåll.
- Ett godkänt schemaobjektsnamn garanterar inte att befintliga kolumner, constraints och triggers har exakt korrekt definition; vid osäkerhet ska schemat jämföras före baslinjen godkänns.
- Cloudflare Builds kan köra även om GitHub Actions ännu inte hunnit bli grönt. Överväg separat releasegodkännande för databasändringar på sikt.
- Nya ändringar kräver **nya numrerade migrationsfiler** (0012, 0013, ...), inte ändringar i redan registrerade gamla filer.
- D1-migrering är en produktionsändring. Ta en export före engångsbaslinjen och ha återställningsplan; Wrangler tar migreringssnapshot när migrationer tillämpas enligt Cloudflares dokumentation.
