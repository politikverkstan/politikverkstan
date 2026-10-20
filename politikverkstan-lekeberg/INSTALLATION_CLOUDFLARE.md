# Uppdatera Politikverkstan 0.5.0 → 0.5.1 via GitHub och Cloudflare

**Avsedd webbadress:** `https://politikverkstan.joel-wennstrom.workers.dev/`. Befintligt SD Arbetsrum och D1-databas ska återanvändas. Du behöver inte installera Wrangler på din dator om du redan använder Cloudflares GitHub-anslutna byggning.

## A. Säkerhetskopiera först

1. Logga in på Cloudflare Dashboard och öppna **Storage & databases → D1**. Identifiera den D1-databas som den fungerande `politikverkstan`-Workern använder. Notera databasens **namn och UUID**; ändra dem inte.
2. Kontrollera databasens tillgängliga **backup-/återställningsfunktioner** i Dashboard och gör en återställningsbar säkerhetskopia innan SQL körs. Ta gärna även en SQL-export enligt D1:s aktuella anvisningar. Om du inte kan verifiera återställningsmöjligheten: **kör inte migreringen på enda produktionskopian**.
3. Spara en kopia av den fungerande GitHub-versionen och `wrangler.jsonc` med ditt riktiga databas-ID, och dokumentera befintliga Secrets i Cloudflare utan att skriva ut deras innehåll.

## B. Uppdatera D1 – via webbläsaren

**Förutsättning:** 0.5.0:s tabeller `work_users`, `work_motions`, `work_motion_versions` och `work_ideas` finns redan. Kör **inte** `0001` eller `0002` igen.

1. Gå till D1-databasen i Cloudflare och öppna **Console**.
2. Kontrollera den gamla strukturen:

```sql
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'work_%' ORDER BY name;
```

3. Öppna `migrations/0003_collaboration.sql` från paketet. Kopiera SQL och kör den i **samma befintliga databas**, en gång, i angiven ordning. Om konsolen bara accepterar en sats åt gången, kör varje `ALTER TABLE`, `CREATE TABLE`, `CREATE INDEX` och `UPDATE` för sig i exakt den ordning de förekommer.
4. Kontrollera att de nya tabellerna finns:

```sql
SELECT name FROM sqlite_master WHERE type='table' AND name IN ('work_motion_shares','work_motion_comments','work_idea_comments') ORDER BY name;
```

5. Kontrollera att ingen gammal motion blivit delad:

```sql
SELECT COUNT(*) AS oavsiktligt_delade FROM work_motions WHERE team_permission <> 'none';
```

Resultatet bör vara **0** direkt efter migreringen, förutsatt att ingen har delat dokument med den nya versionen ännu.

**OBS:** SQLite/D1 stöder inte pålitlig återkörning av samma kolumntillägg i alla miljöer. Kör `0003_collaboration.sql` **bara en gång**. Om du tidigare utfört migreringar manuellt i Console kan Wranglers migrationshistorik fortfarande vara osynkroniserad. Kör därför inte `wrangler d1 migrations apply --remote` blint i efterhand; den kan försöka köra redan utförda migrationer. Håll migrationshistoriken dokumenterad.

### Vad migreringen gör

Nya kolumner i `work_motions`, `work_motion_versions` och `work_ideas`, samt tre nya tabeller för behörigheter och kommentarer. Den tar **inte** bort konton, motioner, idéer eller gamla versioner. Alla tidigare motioner får explicit *privat* som standard (`team_permission='none'`).

## C. Uppdatera befintligt GitHub-projekt

1. Öppna **det befintliga** GitHub-repositoryt för Politikverkstan. Skapa inte ett nytt repo, Worker eller D1 för uppgraderingen.
2. Ersätt projektets källfiler med 0.5.1-paketets filer (håll samma projektrot som tidigare och kontrollera var `package.json` finns). **Behåll värdena från din redan fungerande `wrangler.jsonc` för `database_id` och eventuella miljöinställningar.** Skriv inte över detta med paketets `REPLACE_WITH_REAL_D1_DATABASE_UUID`.
3. Kontrollera att `wrangler.jsonc` har `"name":"politikverkstan"`, korrekt verkligt D1 UUID, `binding:"DB"` och `assets.directory:"./dist"`. Behåll `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` och andra Secrets som redan fungerar i Workerns inställningar. Lägg **inte** in hemliga värden i GitHub.
4. Kontrollera att `worker/collaboration.mjs`, `migrations/0003_collaboration.sql` och uppdaterade `worker/private.mjs`, `src/workroom.js`, `src/workroom.css` samt genererade `worker/workroom-page.mjs` finns i repo. Även `dist/index.html` ska ingå.
5. Publicera via **Commit changes**. GitHub-integrationen ska starta Cloudflare-byggningen. Om den inte gör det, använd **Retry deployment**.

Byggkonfiguration i Cloudflare Workers:

- **Root directory:** den undermapp där `package.json` ligger, eller tomt om den ligger direkt i GitHub-repots rot. Namnet på GitHub-repot är inte i sig en root directory.
- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`

Publicera inte enbart `index.html`: det ger ingen riktig serverbaserad delning eller datalagring. Kom också ihåg att ett ombyggt Github-projekt kan skriva över manuella `vars`-inställningar om du tar bort dem från `wrangler.jsonc`. Styr konfigurationen konsekvent och lagra känsliga värden som Cloudflare Secrets.

## D. Behåll Cloudflare Access

Den befintliga Access-applikationen för `politikverkstan.joel-wennstrom.workers.dev` ska skydda **både**:

- `/arbetsrum` och `/arbetsrum/*`
- `/api/private/*`

Det är viktigt att även API:erna är skyddade. Workern kontrollerar dessutom signerat token och D1-behörighet. Rotadressen `/` ska vara publik. Behåll samma Audience (AUD) som den nu fungerande Access-inloggningen. Om en ny Access-applikation skapas av misstag kan tidigare token sluta fungera.

## E. Verifiera med två konton innan verkligt bruk

1. Logga in som administratör och kontrollera att tidigare motioner fortfarande finns under **Mina motioner**, privata som standard.
2. Se till att en andra person har ett aktivt D1-konto **och** tillåts i Cloudflare Access.
3. Skapa ett *testdokument*, dela med den andra användaren med **Kan läsa**. Kontrollera att personen kan läsa och exportera men inte redigera eller kommentera.
4. Ändra till **Kan kommentera** och prova kommentar. Ändra till **Kan redigera** och prova att spara ett dokument med nytt revisionsnummer.
5. Återkalla delningen och kontrollera att åtkomst nekas vid nästa API-anrop (observera att redan visade lokala kopior inte kan raderas från någons webbläsare).
6. Skapa en idé under **Våra idéer** med standardanvändaren; låt den andra kommentera. Välj **Skapa motion av idé** och kontrollera att det nya utkastet är privat.
7. Kontrollera att `/` fortfarande visar den publika Mandatportalen utan inloggning.

**Driftsättning har inte utförts i ditt Cloudflare-konto av denna kodleverans.** Lokala tester ersätter inte ovanstående verkliga åtkomstprov eller oberoende säkerhetsgranskning. Om något misslyckas: avbryt användningen av nya delningsfunktioner och behåll den föregående fungerande Workerversionen medan felet undersöks.
