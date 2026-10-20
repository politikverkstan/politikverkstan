# Installera Politikverkstan Lekeberg i Cloudflare

**Viktigt:** Den nya lösningen är inte enbart en fristående HTML-fil. För riktig inloggning, användarhantering och privat lagring behövs en Worker och en D1-databas. Ladda därför upp/distribuera **hela projektet**, inte bara `index.html`.

## 1. Säkerhetskopiera befintlig lösning

Spara aktuell deploy och exportera befintlig D1-databas om en sådan finns. Behåll Worker-namnet `mandatportal` för att bevara adressen `https://mandatportal.joel-wennstrom.workers.dev`.

## 2. Bygg projektet

Från projektmappen:

```bash
python build.py
npm install
npm test
npm run test:browser
```

Verifiera att `dist/index.html` finns. Filen `worker/workroom-page.mjs` genereras samtidigt från de skyddade arbetsrumsfilerna. `dist` ska innehålla den publika startsidan, inte privata dokument eller hemligheter.

## 3. D1-databas

Öppna `wrangler.jsonc`. Om du använder databasen från tidigare version, **behåll samma databass UUID**. Om databasen inte finns, skapa en och ersätt `REPLACE_WITH_REAL_D1_DATABASE_UUID`:

```bash
npx wrangler d1 create mandatportal-analytics
```

Den behöver inte döpas om enbart för att portalens visningsnamn ändras.

Kör databasmigreringar på rätt databas:

```bash
npx wrangler d1 migrations apply mandatportal-analytics --remote
```

Migration `0002_workroom.sql` lägger till privata tabeller. Befintlig statistik i `0001_analytics.sql` bevaras. Kontrollera resultatet i Cloudflare Dashboard under D1.

## 4. Cloudflare Access – skydda endast privata paths

I **Zero Trust > Access > Applications** skapar du en **Self-hosted**-applikation som täcker privat arbetsrum och dess API på nuvarande hostname. Lägg till regler för båda vägtyperna i samma Access-applikation om gränssnittet tillåter det:

- `mandatportal.joel-wennstrom.workers.dev/arbetsrum*`
- `mandatportal.joel-wennstrom.workers.dev/api/private/*`

Beakta att specifik matchning och wildcardformulär kan skilja sig beroende på Cloudflares UI. Kontrollera därför faktiskt vilka URL:er som skyddas. Hela den publika rotadressen `/` ska fortfarande vara öppen.

**Använd INTE Cloudflares enklicksalternativ för att skydda hela Workern.** Då kan även den publika mandatdelen börja kräva inloggning.

Aktivera exempelvis e-post med engångskod som inloggningsmetod. Använd Access Allow-policy för godkända e-postadresser. Om användaradministrationen inne i arbetsrummet ska vara den enda allow-list som behöver uppdateras kan Access i stället tillåta autentiserade identiteter med engångskod, medan D1-registret blockerar alla som inte är godkända. **Använd aldrig Access Bypass för privata vägar.** Det senare alternativet bör bedömas ur riskperspektiv innan driftsättning.

Notera din Access **Team Domain** och **Application Audience (AUD) Tag**. Välj samma Access-app för arbetsrum och API så att en giltig identitet verifieras konsekvent.

Cloudflare referenser:
- https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/

## 5. Konfigurera Worker-hemligheter

Kör följande och ange värden när CLI frågar efter dem:

```bash
npx wrangler secret put ACCESS_TEAM_DOMAIN
npx wrangler secret put ACCESS_AUD
npx wrangler secret put BOOTSTRAP_ADMIN_EMAIL
```

- `ACCESS_TEAM_DOMAIN`: t.ex. `ditt-team.cloudflareaccess.com` utan `https://`.
- `ACCESS_AUD`: exakt audience-värde från din Access-app.
- `BOOTSTRAP_ADMIN_EMAIL`: din egen e-postadress som ska få rollen första administratör.

Sätt aldrig dessa värden eller andra hemligheter i `dist/index.html`.

Tidigare administrationsmodul `/admin` använder separat `ADMIN_EMAILS`, om du väljer att fortsätta använda den. Den modulen är inte detsamma som användaradministrationen i SD Arbetsrum.

## 6. Publicera hela applikationen

```bash
npx wrangler deploy
```

Verifiera följande adresser:

- `/` – offentlig startsida, ska inte kräva inloggning.
- `/arbetsrum` – ska kräva giltig Access-inloggning och D1-konto.
- `/api/private/me` – ska ge 403 för obehörig användare.
- `/api/private/motions` – ska inte lämna ut dokument utan rätt inloggning/ägarskap.

## 7. Skapa första administratören

Med Access-inloggningen för den e-postadress du satte som `BOOTSTRAP_ADMIN_EMAIL`, öppna:

`https://mandatportal.joel-wennstrom.workers.dev/arbetsrum/setup`

Klicka på **Aktivera administratören**. Detta skapar det första kontot endast om användartabellen är tom och den kryptografiskt verifierade e-postadressen matchar bootstrap-konfigurationen.

Därefter kan administratören lägga till standardanvändare via arbetsrummets meny **Användare**. Kom ihåg att personen även behöver passera Cloudflare Access policy, om den begränsats till särskilt angivna adresser.

När det första kontot är skapat kan du ta bort bootstrap-hemligheten:

```bash
npx wrangler secret delete BOOTSTRAP_ADMIN_EMAIL
```

## 8. Kontrollera funktioner efter installation

1. Anonymt besök på `/` fungerar och kan använda kartellbyggaren.
2. Privat `/arbetsrum` kräver inloggning.
3. Obekant inloggad person kan inte se arbetsrummet.
4. Administratör kan lägga till användare.
5. Standardanvändare kan skapa och spara motion.
6. Andra standardanvändaren kan inte läsa den första användarens utkast, även om dokument-ID är känt.
7. PDF-export från motionsverkstaden fungerar i vanlig webbläsare.
8. Ingen personuppgift eller privat text exponeras via publik källa eller telemetri.

## 9. Backup och drift

Ta regelbundna, åtkomstskyddade säkerhetskopior av D1. Rensa inte arbetsrumsdatabasen när du vill rensa statistik. Framtida ändringar görs genom nya databas-migreringar, inte genom att ta bort gamla tabeller.

**Driftsättningen har inte utförts av utvecklingsleveransen.** Tester är lokala; JWT-signaturkontroll och D1-åtkomst har testats med en lokal SQLite-anpassare, inte i din verkliga Cloudflare-organisation.
