# Politikverkstan 1.0.1 – stabilisering och korrekt uppföljning

**Status:** Kodleverans. Cloudflare-produktionsstatus och faktiska användarbehörigheter måste verifieras separat. Ingen ny D1-migrering ingår i 1.0.1.

## Ändringar

- Arbetsöversikten visar öppna strukturerade ärendeuppföljningar från 1.0, separat från privata personliga uppgifter.
- `Att följa upp` räknar **öppna personliga uppgifter + öppna strukturerade ärendeuppföljningar** där användaren äger ärendet eller är utsedd ansvarig för en uppföljning i ett delat ärende. Ärenden som endast har status `uppfoljning` räknas inte längre som en egen extra uppgift. Syftet är att undvika dubbelräkning.
- Uppföljningslistan visar högst sex poster i snabböversikten; totalsiffran hämtas oberoende från databasen och hanterar fler än sex öppna uppföljningar.
- Nytt server-API `GET /api/private/workflow/dashboard`, skyddat av samma Access- och kontokontroller som övriga privata API:er. API:et visar endast öppna uppföljningar i egna ärenden eller som tilldelats användaren i delade ärenden. Privata ärenden får inte synas enbart för att de tilldelats någon.
- `loadDashboard` läser ärenden, möten, personliga uppgifter och uppföljningar självständigt. Fel i en del ersätts med tydlig felstatus utan att dölja övriga delar.
- Regressionstester för separat uppföljning, behörigheter, återkallad delning, totalsiffror och enskilda API-fel.

## Kontroll av tidigare D1-migreringar

Den befintliga databasen förutsätts ha hela baslinjen `0001–0011`, inklusive `work_followups` och triggers från `0011`. Version 1.0.1 innehåller **ingen** fil `0012`.

Den befintliga automatiska migrationsspärren i `ops/deploy-with-d1-check.mjs` stoppar publicering vid saknad historik och kör bara ännu ej registrerade framtida migrationsfiler. Engångsbaslinjen i `ops/manual-baseline-0001-to-0011.sql` får inte köras om som en ny version.

Kontrollera i D1:

```sql
SELECT id,name FROM d1_migrations ORDER BY id;
PRAGMA foreign_key_check;
PRAGMA quick_check;
```

Förväntat: 11 historikposter 0001–0011, inga främmande-nyckelfel och `ok`.

## Tester

Från projektkatalogen:

```bash
python build.py --check
npm test
npm run test:browser
```

Vid verklig driftsättning, verifiera med två aktiva Cloudflare Access-konton:

1. Privat ärende + dess öppna uppföljning: bara ägaren ser den i översikten.
2. Delat ärende + öppen uppföljning tilldelad användare B: B och ägaren ser uppföljningen; andra användare får inte den i sin personliga översikt.
3. När delning återkallas ska den tidigare tilldelade användaren inte längre se uppföljningen.
4. När uppföljningen markeras avslutad ska antalet öppna uppföljningar minska vid uppdatering.
5. Om ett API tillfälligt inte svarar ska övriga kort fortsätta fungera och totalsiffran inte visas som en missvisande nolla.

**Uppmärksamma:** Översikten är inte ett formellt kommunalt beslutsregister. Rättslig status och beslutskällor måste kontrolleras separat. Personliga uppgifter och strukturerade gemensamma uppföljningar är olika objekt och summeras som separata åtgärdsposter.

## Releasegräns

CI-körningar verifierar kod och simulerade åtkomstfall men inte verkliga Cloudflare-token, aktuell produktionsdatabas eller individuella Access-policyer. Kontrollera det senaste Cloudflare-bygget och utför ovanstående röktest innan versionen markeras produktionsverifierad.
