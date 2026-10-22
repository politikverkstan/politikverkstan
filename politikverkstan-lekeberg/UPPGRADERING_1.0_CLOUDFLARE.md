# Politikverkstan 1.0.0 – Drift och uppgradering

## Versionsstatus

Kod och byggfiler för version 1.0 finns i GitHub-repositoryt `politikverkstan/politikverkstan`. Detta är **inte** ett bevis på att samma version är driftsatt på Cloudflare. `main` är den avsedda källan. Befintliga Cloudflare Access-inställningar, D1-databas-ID, domän och GitHub-koppling ska behållas.

## Omfattning

- **Spårbar ärendehistorik:** nya händelser för skapande, redigering, delning och ansvar registreras med användare och tidpunkt via SQLite-triggers. Sakuppdateringen och logghändelsen blir atomiska.
- **Möteskopplingar:** samma ärende kan visas i flera sammanträden och dagordningspunkter; andra användares privata möten avslöjas inte av ärendevyn.
- **Gemensam uppföljning:** fristående uppföljningsposter med uppgift, beskrivning, ansvarig, förfallodag och status. De är skilda från 0.9.2:s personliga uppgiftslista.
- **Gemensam sökning:** ärenden, möten, motioner och filnamn söks över ett behörighetskontrollerat API.
- **Förankring:** ägaren kan registrera ställningstagande och välja mellan arbetsdiskussion, personligt, föreslaget och internt förankrat. Förankring kräver källa och datum och innebär inte något formellt kommunalt beslut.
- **Publikt gränssnitt:** Scenarioverkstaden ligger bakom egen ingång och är inte längre direkt på den publika startsidan. Navigationsikonerna har särskilts; startsidans text beskriver endast publika analysverktyg.

## Databas – obligatorisk migrering 0011

1. Bekräfta att produktionsdatabasen verkligen är `DB`-bindningen i den **befintliga** `wrangler.jsonc`, och att 0001–0010 redan har utförts. Kontrollera förekomst av `work_cases`, `work_meetings` och `work_tasks`.
2. Ta en verifierad säkerhetskopia och dokumentera hur den kan återställas. Följ `UPPGRADERING_0.9.1_CLOUDFLARE.md` och din etablerade Cloudflare-process.
3. Kör endast `migrations/0011_traceability.sql` en gång på rätt miljö. Följ gärna Cloudflare-konsolens D1 SQL-körning eller den redan använda migrationsrutinen. Kör **inte om** äldre `ALTER TABLE`-migreringar.
4. Kontrollera tabeller, triggers och dataintegritet:

```sql
SELECT name FROM sqlite_master
 WHERE type='table' AND name IN ('work_case_events','work_followups','work_case_positions');
SELECT name FROM sqlite_master
 WHERE type='trigger' AND name LIKE 'work_%audit_%';
PRAGMA table_info(work_cases);
PRAGMA foreign_key_check;
PRAGMA integrity_check;
```

Förväntat är tre nya tabeller, de nya revisions- och händelsetriggrarna, kolumnen `last_editor_email`, ingen rapporterad främmande-nyckelkonflikt och resultatet `ok` vid integritetskontroll.

5. Publicera Worker och byggda tillgångar via befintlig Cloudflare-integration. Kontrollera att Worker-routningen verkligen betjänar `/api/private/workflow/` först efter Access-verifiering.
6. Testa med två aktiva Access-konton där åtminstone ett konto har administratörsroll: privata ärenden, historik och kopplade privata möten får inte synas för obehöriga. Prova även delat ärende, tilldelad redigerare, avslutad uppföljning, sökträffar och återtagen delning.
7. Kontrollera att `Scenarioverkstad` är en egen ingång på publika sidan och att en användare fortfarande kan öppna, spara, importera och jämföra scenarier i sin webbläsare.

## Återställning vid delvis genomförd migrering 0011

Om `work_case_events` finns, men `work_followups` och `work_case_positions` saknas, har D1 ännu inte hela 1.0-schemat. **Kör inte om `migrations/0011_traceability.sql`**, eftersom den bland annat innehåller `ALTER TABLE work_cases ADD COLUMN last_editor_email` utan någon `IF NOT EXISTS`.

1. Kontrollera att du använder **produktionsdatabasen** i rätt `wrangler.jsonc` och ta en export/säkerhetskopia före ändringar.
2. Kontrollera att kolumnen `last_editor_email` finns i `work_cases` och att `work_case_events` innehåller `id`, `case_id`, `actor_email`, `kind`, `case_revision`, `scope_at_event`, `changes_json` och `created_at`:

```sql
PRAGMA table_info('work_cases');
PRAGMA table_info('work_case_events');
SELECT name, type FROM sqlite_master
WHERE name IN ('work_case_events','work_followups','work_case_positions',
 'work_case_audit_create','work_case_audit_update',
 'work_followups_audit_create','work_followups_audit_update',
 'work_positions_audit_create','work_positions_audit_update');
```

3. Om förkontrollerna motsvarar ovanstående förutsättningar, kör bara [`ops/repair_0011_missing_tables.sql`](ops/repair_0011_missing_tables.sql). Filen innehåller ingen radering, uppdatering av befintliga data eller `ALTER TABLE`, och använder `IF NOT EXISTS` för tabeller, index och historiktriggers. Den är ett återställningssteg, inte en ny numrerad migrering.

Från katalogen `politikverkstan-lekeberg` med korrekt Cloudflare-inloggning och befintlig Wrangler-konfiguration:

```bash
npx wrangler d1 export <DATABASNAMN> --remote --output backup_fore_reparation.sql
npx wrangler d1 execute <DATABASNAMN> --remote --file=ops/repair_0011_missing_tables.sql
```

Byt `<DATABASNAMN>` mot den faktiska databasen i projektets befintliga `wrangler.jsonc`. Exporten ska slutföras och sparas säkert innan exekvering. Cloudflare D1 Time Travel är ytterligare ett alternativ för återställning, men ska inte förväxlas med att en export har skapats.

4. Kör efterkontrollerna och säkerställ att de tre tabellerna och alla sex historiktriggers finns. Kontrollera att `PRAGMA foreign_key_check` ger **inga rader** och att `PRAGMA quick_check` ger **ok**:

```sql
SELECT name FROM sqlite_master
WHERE type='table' AND name IN
 ('work_case_events','work_followups','work_case_positions')
ORDER BY name;
SELECT name FROM sqlite_master
WHERE type='trigger' AND name IN
 ('work_case_audit_create','work_case_audit_update',
  'work_followups_audit_create','work_followups_audit_update',
  'work_positions_audit_create','work_positions_audit_update')
ORDER BY name;
PRAGMA foreign_key_check;
PRAGMA quick_check;
```

5. Öppna ett tidigare sparat ärende och kontrollera att delning, sammanträdeskopplingar, ändringshistorik, uppföljningar och ställningstaganden fungerar. Kontrollera med ett annat godkänt konto att privata data fortfarande är skyddade.

**Avbryt vid andra schemavarianter** (exempelvis avvikande kolumner eller redan existerande tabeller med annan definition). `IF NOT EXISTS` kontrollerar inte att en befintlig tabells kolumner är rätt. Reparationsfilen är därför inte en generell ersättning för verifiering av schemat.

## Kvalitetskontroller för release

Kör från `politikverkstan-lekeberg`:

```bash
python build.py
npm test
npm run test:browser
python build.py --check
```

Godkända GitHub Actions-jobb på den **senaste** releasecommiten krävs: `Build and tests` samt `Chromium browser regressions`. Testen är inte ersättning för verkliga tester av Cloudflare Access, D1, användarkonton, mobil layout eller DNS.

## Risker och avgränsningar

- Historik skapas först **efter** att migreringen 0011 körts. Tidigare revisionsfält ger inte rekonstruerbara äldre värden. Det finns ingen säker retroaktiv historik.
- Historiken avser ärendet och dess uppföljningar; privata anteckningar, privata fil-ID:n och privata motions-ID:n ingår inte i historiksnapshots.
- En användare får bara se historik, länkar och sökträffar som behörighetskontrollen medger. Ändringar från när ett ärende var privat ska inte visas bara för att ärendet senare delas.
- Radering av ett ärende raderar också dess händelser och uppföljningar enligt databasens relationsregler. Detta är inte en oföränderlig extern revisionslogg för juridisk arkivering.
- Existerande personliga uppgifter i `work_tasks` förblir privata och ingår inte i den gemensamma uppföljningen.
- Ställningstagande märkt *förankrat* är en intern registrering som måste styrkas av användaren. Politikverkstan intygar inte att beslutet fattats av någon kommunal eller partiorganisation.
- Inga driftsinställningar, Access-policier, dataöverföringar eller produktionsmigreringar utförs automatiskt i samband med kodcommitar.
