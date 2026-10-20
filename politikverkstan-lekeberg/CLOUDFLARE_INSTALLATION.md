# Cloudflare-installation – Mandatportal Lekeberg 0.3

**Status:** distribution och säker backend-kod är framtagen och testad lokalt. Inget har installerats på ditt Cloudflare-konto. Statistikinsamling och IP-loggning är avstängda som standard.

## 1. Publicera enbart den publika portalen

Ladda upp **`dist/index.html`** som statisk fil i Workers & Pages. Startsidan ska fungera direkt på:

`https://mandatportal.joel-wennstrom.workers.dev/`

Publika funktioner (kartellbyggare, kandidatval, inflytandeanalys, förhandlingsverkstad, scenarioimport/-export) fungerar utan backend. Knappen som frivilligt delar statistik visar i detta läge att funktionen inte är aktiverad. Den privata administrationen finns inte förrän Worker-koden publiceras.

## 2. Välj Cloudflare Worker för säker backend

Full installation förutsätter åtkomst till Cloudflare-kontot och Wrangler via terminal:

```bash
npm install
npx wrangler login
npx wrangler d1 create mandatportal-analytics
```

Kopiera det riktiga `database_id` som kommandot visar och ersätt `REPLACE_WITH_REAL_D1_DATABASE_UUID` i `wrangler.jsonc`. Namn och binding är redan ifyllda. Förvänta dig **ingen fungerande distribution** om platshållar-ID:t står kvar.

Skapa tabellerna:

```bash
npx wrangler d1 migrations apply DB --remote
```

Den här migreringen skapar endast tabeller för aggregerade observationer och separat blockerad-admin-säkerhetslogg. Den börjar inte automatiskt samla in något.

## 3. Skydda `/admin` och `/api/admin/*` med Cloudflare Access

Gå till **Cloudflare Zero Trust → Access → Applications → Add application → Self-hosted**.

Skapa ett Access-skydd för aktuell **workers.dev-hostname**, begränsat till **båda** administratörssökvägarna `/admin*` och `/api/admin/*`. En och samma Access-applikation för dessa sökvägar ger samma application audience (AUD). Ge endast en godkänd administratör åtkomst, exempelvis genom e-postbaserad engångskod. Lägg inte Access på hela `mandatportal.joel-wennstrom.workers.dev`, för då skulle hela publika portalen kräva inloggning.

Följ Cloudflares aktuella guider för att ange flera skyddade sökvägar i en self-hosted app. Om din Cloudflare-konfiguration kräver separata Access-applikationer med olika `AUD`, behöver JWT-konfigurationen i Worker anpassas och testas för båda innan driftsättning.

Källa: https://developers.cloudflare.com/workers/configuration/cloudflare-access/

Källa: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/

Notera följande tre värden från Cloudflare Zero Trust: team-domän (t.ex. `minteam.cloudflareaccess.com`), applikationens AUD och den egna godkända admin-e-postadressen.

Lagra dem som Wrangler secrets. Exempel:

```bash
npx wrangler secret put ACCESS_TEAM_DOMAIN
npx wrangler secret put ACCESS_AUD
npx wrangler secret put ADMIN_EMAILS
```

Vid varje kommando anger du **ditt riktiga värde i terminalen**. Skicka inte hemliga uppgifter i meddelanden eller offentliga arkiv. `ADMIN_EMAILS` accepterar en kommaseparerad lista. Worker verifierar JWT-signaturen kryptografiskt, kontrollerar issuer, audience och e-postlista. Avsaknad av dessa inställningar ger alltid nekad åtkomst.

## 4. Publicera Worker + startsida

```bash
python build.py
npx wrangler deploy
```

Byggskriptet skapar alltid `dist/index.html` (och en kopia `index.html` i projektets rot). Inga andra HTML-filer är projektets startsida. `wrangler.jsonc` anger static assets i `dist` och att Worker ska köra först för admin och API. Vid publicering av samma Worker-namn bör befintlig workers.dev-adress behållas – kontrollera Worker-namn och Cloudflare-konto innan du publicerar.

### Test efter publicering

- `/` visar portalen utan inloggning.
- `/admin` begär Cloudflare Access-login och ger åtkomst endast till den godkända administratören.
- `/api/admin/summary` ger 403 utan giltigt JWT och korrekt administratörsidentitet.
- `/api/telemetry` ger 503 när statistik är avstängd.
- Gamla `/Mandatportal-Lekeberg` omdirigeras till `/`.

**Aktivera inte statistik förrän avsnittet om dataskydd är genomgånget.**

## 5. Frivillig statistik – avstängd som standard

Ändra `TELEMETRY_ENABLED` från `"false"` till `"true"` i `wrangler.jsonc` **först** efter dokumenterad laglighets- och integritetsbedömning samt uppdaterad integritetsinformation. Publicera därefter på nytt.

En observation skapas enbart när en besökare i Integritet-vyn aktivt godkänner och väljer att dela den aktuella kartellindelningen. Endast datum (UTC), normaliserad gruppindelning och en summerad räknare lagras. Ingen IP-adress eller person-ID sparas med gruppindelningen. Unika kartellkombinationer med färre än fem sammanlagda observationer visas inte i adminrapporten. För statistikens del sker gallring efter 90 dagar. Data från enskilda nätverksförfrågningar finns dock tillfälligt hos Cloudflare när anslutningen hanteras; rapportera därför inte att tjänsten har absolut anonymitet.

Dashboarden visar inte exakt antal **unika besökare** och saknar i denna version kontinuerlig automatisk sidvisningsmätning. Den visar enbart faktiskt frivilligt insamlade analyser, och ska inte betecknas som generell trafikmätare.

## 6. Valfri IP-baserad säkerhetslogg

`SECURITY_LOG_ENABLED` är `"false"` och måste förbli av tills rättslig grund och ändamål är dokumenterade och informationen till besökare har uppdaterats.

När den uttryckligen aktiveras registreras IP, timestamp och status **endast för nekade administrativa anrop**. Det finns ingen generell besökslogg som kopplar IP till vilka karteller någon testar. Loggposter gallras efter sju dagar av schemalagd Worker-uppgift (03:00 UTC). Cloudflare kan ha egen separat trafikloggning enligt kontots inställningar – kontrollera även denna.

## 7. Drift och felsökning

Om `/admin` ger 403 för en inloggad administratör: kontrollera att team-domän, AUD och `ADMIN_EMAILS` stämmer, att Access skickar JWT och att rätt sökvägar skyddas. Verifiera konfigurationen på både `/admin` och `/api/admin/summary`.

Om statistik ger 503: kontrollera flagga, D1-binding och migreringar. Om login fungerar men statistikpanelen är tom när flaggan är av, är det avsiktligt.

Använd aldrig personlig API-nyckel i `index.html` eller publika skript. Admin-kod finns endast i `worker/index.mjs` och returneras först efter behörighetskontroll.

## Kostnad och ansvar

Användning av D1, Workers och Cloudflare Access kan medföra kostnader beroende på volymer och abonnemang. Kontrollera aktuell prislista. Du ansvarar för din Cloudflare-konfiguration, administratörslista och beslut om eventuell personuppgiftsbehandling.
