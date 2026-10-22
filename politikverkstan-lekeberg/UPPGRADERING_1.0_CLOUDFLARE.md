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
