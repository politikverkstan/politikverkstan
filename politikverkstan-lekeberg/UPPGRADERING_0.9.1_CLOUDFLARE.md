# Politikverkstan 0.9.1 – stabilisering, drift och kontroll

**Utgivning:** 0.9.1 (kod). **Databas:** oförändrat schema från 0.9.0, ingen ny D1-migrering. **Omfattning:** byggsäkring, kontinuerlig integration, migrationstester och tydligare driftrutiner. Inga nya funktioner som delar eller publicerar uppgifter.

## 1. Ändringar

- \`build.py\` stoppar bygget vid saknad mallmarkör, fel i CSP-markörernas antal eller privat API-referens i den publika filen. \`python build.py --check\` jämför genererade filer med källkod **utan att skriva över dem**.
- \`npm test\` kör kontroller för byggartefakter, samtliga versionerade D1-migreringar och tidigare Node-testsvit. \`npm run test:browser\` kör tidigare Playwright-/PDF-tester.
- \`.github/workflows/politikverkstan-ci.yml\` kör bygg, enhetstester och webbläsartester vid förändringar. Att arbetsflödet finns i GitHub är **inte ett bevis** på att Actions har aktiverats eller att ett test har passerat.
- \`tests/test-build.py\` testar felaktig mallmarkör, korrupt genererad fil och oavsiktlig privat API-referens i den publika koden.
- \`tests/test-migrations.py\` använder SQLite med främmande nycklar aktiverade, spelar upp \`0001\`–\`0009\` i ordning och prövar att äldre privata mötesanteckningar inte blir delad ärendetext.

## 2. Lokal kvalitetskontroll och release

Från mappen \`politikverkstan-lekeberg\`:

\`\`\`bash
python build.py
npm test
npm run test:browser
python build.py --check
\`\`\`

Kräver Node 22, Python 3.12 eller nyare, Python-paketen \`playwright\` och \`PyMuPDF\`, samt Chromium. GitHub Actions innehåller den använda installationskedjan. Webbläsartesterna är huvudsakligen mockade och ersätter **inte** en verklig Cloudflare Access-kontroll.

**Releaseordning:** 1) se godkänt testresultat, 2) kontrollera innehållet i GitHub-commiten, 3) verifiera D1 och ta backup enligt nedan, 4) publicera via befintlig Cloudflare-integration, 5) testkör med två konton. Flödet publicerar **inte** automatiskt i Cloudflare och utför aldrig \`d1 execute --remote\`.

### Separat CI-kontroll

Öppna GitHub → **Actions** → *Politikverkstan 0.9.1 quality*. Kräv gröna jobb för både **Build and tests** och **Chromium browser regressions**. Om Actions inte har körts, har blockerats eller är avstängt ska releasen betraktas som **otestad i CI**. Aktivera gärna branch protection/ruleset så att dessa checkar krävs innan större framtida ändringar slås samman. Ändra inte dessa behörigheter utan separat beslut.

## 3. Säkerhetskopia av D1 och återställningsberedskap

Börja med att kontrollera att du arbetar i rätt konto, rätt databas och med samma bindning som i \`wrangler.jsonc\`. Databasen heter här \`mandatportal-analytics\`. Namn, ID, konto och åtkomst måste jämföras med **faktisk produktionskonfiguration**. Kommandon nedan är instruktioner, **inte utförda åtgärder**.

Spara en fullständig SQL-export **utanför GitHub**. Exporten kan innehålla interna politiska dokument och personuppgifter:

\`\`\`bash
npx wrangler d1 export mandatportal-analytics --remote --output=politikverkstan-d1-backup.sql
\`\`\`

Verifiera att exporten existerar och har förväntad storlek, att filen kan importeras till en **separat tom testdatabas** och att bland annat \`work_users\`, \`work_cases\`, \`work_meetings\` och filtabeller har korrekt antal rader. Lägg aldrig backupfilen, privata SQL-dumpar eller access-token i ett publikt repository.

Cloudflare D1 har även Time Travel. Spara en aktuell återställningsbokmärkning:

\`\`\`bash
npx wrangler d1 time-travel info mandatportal-analytics
\`\`\`

Time Travel är tidsbegränsat beroende på plan och kan inte ersätta en verifierad separat backup. Om återställning skulle bli nödvändig måste ansvarig först stoppa skrivningar och utreda exakt vilka data som tillkommit sedan bokmärket skapades. **Kör aldrig en restore slentrianmässigt**: den skriver över produktionsdatabasen. Dokumentation: https://developers.cloudflare.com/d1/reference/time-travel/ och https://developers.cloudflare.com/d1/wrangler-commands/.

## 4. Kontroll av befintlig D1-struktur

Kör följande **läsfrågor** på rätt produktionsdatabas (via Cloudflare D1 Console eller \`wrangler d1 execute ... --remote --command\`):

\`\`\`sql
SELECT name FROM sqlite_master
WHERE type='table'
  AND name IN ('work_users','work_motions','work_files',
               'work_cases','work_case_notes','work_case_comments',
               'work_meetings','work_meeting_items','work_meeting_notes')
ORDER BY name;
\`\`\`

Resultatet ska ha **nio rader**. Kontrollera att \`work_cases\` innehåller \`scope\` och \`assignee_email\` och att \`work_meetings\` innehåller \`scope\` och \`revision\`:

\`\`\`sql
PRAGMA table_info(work_cases);
PRAGMA table_info(work_meetings);
PRAGMA foreign_key_check;
\`\`\`

\`PRAGMA foreign_key_check\` ska inte returnera några felrader. Frågorna är kontroller, **inte migreringar**. Kör **inte** om \`0008_shared_cases.sql\` (den innehåller \`ALTER TABLE\`). Att SQL-konsolen säger *This query returned no data* efter DDL är normalt, men inte en garanti för att rätt databas ändrats.

## 5. Behörighets- och funktionstest med riktiga användare

Testa med minst två **aktiva och godkända Cloudflare Access-konton**; använd gärna tillfällig testdata:

1. Konto A skapar ett privat ärende, privat möte och privat anteckning. Konto B ska inte kunna hitta, läsa eller ändra dem, inte ens via direkt API-URL.
2. Konto A delar ett ärende med gruppen och utser konto B till ansvarig. Konto B ska kunna redigera gemensamt innehåll men inte se A:s personliga anteckningar eller privata fil-/motionskopplingar.
3. Konto A skapar ett delat möte med dagordning. Försök att koppla privat ärende ska stoppas. Konto B ska kunna läsa mötet men inte ändra dagordningen. Varje användares mötesanteckningar ska förbli personliga.
4. Konto A återkallar delning av ärende och möte. Konto B ska förlora all ny åtkomst även via direkta adresser.
5. Kontrollera den publika startsidan utan inloggning och att endast öppna mandat-/analysfunktioner visas. Kontrollera också responsiv mobilvy, utskriftsunderlag och navigering mellan sammanträde och ärende.
6. Kontrollera att anslutning, Access-konfiguration, databas och statiska byggfiler stämmer överens mellan \`main\` och den aktiva Cloudflare-versionen.

## 6. Integritet och driftsäkerhet

**Aktuell inställning i repository:** \`TELEMETRY_ENABLED\` är \`true\`, medan användargränssnittet kräver en aktiv frivillig handling för att skicka en kartellobservation. \`SECURITY_LOG_ENABLED\` är \`false\`. Äldre dokument beskriver andra standardvärden; vid kontroll gäller aktuell konfiguration framför gammal dokumentation. Om ingen sammanställd statistik efterfrågas, pröva att stänga av telemetrin i en **separat beslutad driftändring**. Ändra inte produktionskonfiguration av misstag under 0.9.1.

\`wrangler.jsonc\` innehåller organisationsspecifika Access-identifierare, databas-ID och administrativa e-postadresser men inga API-nycklar i klartext. De är inte lösenord, men begränsa exponeringen av operativa uppgifter när konfigurationen görs om. Riktiga hemligheter ska ligga i Cloudflares secrets/vars med lämpliga behörigheter, inte i källkod eller backup som checkas in.

**Återstående krav innan driftverifiering:** faktiska resultat från GitHub Actions, testad produktionspublicering, två användarkonton, dokumenterat återställningstest, kontroll av informationsklassning och fastställt personuppgiftsansvar. CI med mockar är ett stöd, inte ett formellt säkerhetsgodkännande.

## 7. Kända gränser som inte ändrats

- Ärende- och sammanträdeshistorik är inte en fullständig revisionslogg med återställning.
- Filinnehåll lagras i D1; tillväxt och lagringskostnad bör mätas före val av alternativ (t.ex. R2).
- Organisationsregistret bygger fortfarande till stor del på preliminära och historiska källor. Platsuppgifterna för hela 2026–2030 har inte automatiskt omprövats.
- Automatisk kommunal mötesimport, fulltextsökning, AI-dokumentanalys och flerpartitenancy ingår inte i 0.9.1.
