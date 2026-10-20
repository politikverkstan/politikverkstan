# Uppgradera Politikverkstan från 0.5.1 till 0.5.2

**Produktionsadress:** `https://politikverkstan.joel-wennstrom.workers.dev/`.

Denna uppdatering ändrar samma befintliga applikation och databas. **Skapa inte en ny D1-databas** och ersätt inte befintliga Access-inställningar.

## 1. Säkerhetskopiera och kontrollera

1. Öppna Cloudflare Dashboard → Storage & databases → D1 → den databas som redan används av Politikverkstan.
2. Ta en säkerhetskopia/export innan några SQL-ändringar. Om webbgränssnittet inte erbjuder export, **avvakta migrationen** tills en återställbar kopia ordnats med Cloudflares D1-backup eller officiella exportverktyg.
3. I D1 Console, kontrollera att tabellerna `work_motions`, `work_ideas`, `work_motion_shares`, `work_motion_comments` och `work_idea_comments` finns. Om inte: den befintliga 0.5.1-migreringen har inte genomförts fullt ut; kör **inte** 0004 förrän detta är löst.
4. Kontrollera att `wrangler.jsonc` i **GitHub** redan pekar på det riktiga databas-ID:t. ZIP-paketet innehåller en platshållare, eftersom vi inte har tillgång till ditt databas-ID.

## 2. Kör bara den nya databasändringen

I Cloudflare D1 Console, kör innehållet i `migrations/0004_lifecycle.sql` **en gång**. Kör satserna i ordning och dela upp dem om Console inte kan köra samtliga tillsammans. **Kör inte om 0001, 0002 eller 0003.**

För att kontrollera vilka kolumner som finns efteråt:

```sql
PRAGMA table_info(work_motions);
```

Kontrollera att `archived_at`, `archived_by` och `trashed_at` finns. Kontrollera även:

```sql
SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'work_idea_status_history';
```

Den nya migrationen ändrar **inga existerande dokumentrader** och tar **inte bort** gamla tabeller. Om du redan har utfört den manuellt ska den inte köras igen: SQLite returnerar fel för kolumner som redan finns.

**Varning om migrationer:** SQL som körs manuellt via D1 Console registreras inte nödvändigtvis i Wranglers tabell `d1_migrations`. Dokumentera att `0004_lifecycle.sql` har körts manuellt så att inte ett senare `wrangler d1 migrations apply --remote` försöker köra samma migration igen. Använd konsekvent migrationshantering efter detta.

## 3. Lägg in källkoden på GitHub

1. Uppdatera ditt **befintliga** GitHub-repository för Politikverkstan med projektets filer. ZIP-filen ska packas upp: en ensam ZIP som laddas upp till GitHub fungerar inte som källkod.
2. **Överskriv inte** din fungerande `wrangler.jsonc` utan att först jämföra filerna. Behåll ditt korrekta `database_id`, `name: "politikverkstan"`, worker-routes, Access-konfiguration och befintliga bygginställningar. Källkodens `wrangler.jsonc` innehåller ett exempel-ID, inte ditt verkliga.
3. Publicera ändringarna (*Commit changes*). När Cloudflare kör GitHub-byggningen ska dess Root directory peka på mappen där `package.json` finns.
4. Byggkommandot är `npm run build`; publiceringskommandot är `npx wrangler deploy`. Python behövs i Cloudflares byggmiljö för `build.py`, inte på din egen dator.
5. Kontrollera att publiceringen lyckas innan du använder nya arkiveringsfunktioner.

**Ordningen är viktig:** kör migrationsfilen och verifiera den **innan** nya Workern tas i bruk. Den nya koden använder kolumner som inte finns i v0.5.1.

## 4. Kontrollera funktionerna

1. Logga in på `/arbetsrum`. Din befintliga Cloudflare Access-konfiguration ska fortsätta fungera.
2. Dela en av dina motioner med hela gruppen. Den ska visas både under **Mina motioner** och **Våra motioner → Gemensamma motioner**, med samma dokument-ID.
3. Välj `⋯` på en motion under **Mina motioner** och arkivera den. Kontrollera att den visas i **Arkiverade** och kan återaktiveras.
4. Flytta en testmotion till papperskorgen. Kontrollera att den kan återställas. Permanent radering ska endast ske efter uttrycklig bekräftelse med `RADERA`.
5. Sätt en testidé till **Avslutad**. Kontrollera att den försvinner från **Aktiva idéer** och återfinns under **Avslutade idéer**. Återaktivera den och kontrollera dess historik.
6. Granska startsidan och **Integritet** i både dator- och mobilvy.
7. Om ett fel uppstår: kontrollera Cloudflares Worker-logs, men dela inga JWT-token, databashemligheter, personliga dokument eller IP-adresser.

## Begränsningar

- Automatisk permanent radering efter 30 dagar är **inte** aktiverad. Endast ägarens uttryckligt bekräftade permanenta radering tar bort ett dokument.
- Arkivering är på **dokumentnivå**; personlig ”Dölj för mig” är inte implementerad.
- Statushistorik för idéer börjar registreras vid användning av version 0.5.2. Äldre historiska statusbyten kan inte rekonstrueras.
- Lokala automatiserade tester motsvarar inte en säkerhetsrevision av ditt produktionskonto. Kontrollera Access och befintliga databasrättigheter efter publiceringen.
- Vid permanent radering rensas dokumentversioner, kommentarer och individuella delningsposter. Idéer som en raderad motion ursprungligen byggde på behålls.
