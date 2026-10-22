# Politikverkstan Lekeberg – 1.3.0

**Status:** Kodbas för den publika mandatportalen och den inloggningsskyddade Arbetsytan. Version 1.3.0 ger möjlighet att skapa egna privata mötesförberedelser från offentligt publicerade sammanträden, med validerad originalkälla och utan automatisk import av interna anteckningar. Version 1.2.0 inför statusfiltrering och en exportbar granskningslista för 57 organisationer, utan att osäkra platstal uppgraderas till verifierade fakta. Version 1.1.0 inför en sammanhållen ärendeöversikt för underlag, möten, uppföljningar, ställningstagande och historik utan nya behörighetsgränser eller tabeller. Version 1.0.2 lägger till en automatisk läskalender för Lekebergs fyra publika sammanträdesorgan. Version 1.0.1 stabiliserar 1.0 med en behörighetsstyrd översikt över ärendeuppföljningar, säkrare totalsiffror vid fel och utökade tester. Version 1.0 införde ärendehistorik, möteskopplingar, uppföljningar, sökning och spårbart förankrade ställningstaganden. Den publika startsidan har en separat Scenarioverkstad och mer särskiljande navigationsikoner. Version 1.0.2 kräver migrering **0012**, som kan köras av det kontrollerade Cloudflare-publiceringsflödet. [Drift- och releasechecklista för 1.0.2](UPPGRADERING_1.0.2_CLOUDFLARE.md).

## Funktioner

| Del | Funktion | Tillgänglighet |
|---|---|---|
| Publik mandatportal | Mandatfördelning, kandidater, samverkansscenarier, inflytande, register, metod och guidad analys | Öppen webbplats. Simuleringar är hypotetiska. |
| Arbetsyta – motioner | Privata och uttryckligen delade utkast, kommentarer, versionshistorik, export | Inloggad, behörighetsstyrd |
| Arbetsyta – dokument | Privata och gemensamma mappar/filer, filnamnssökning, privata kopplingar | Inloggad, behörighetsstyrd |
| Arbetsyta – ärenden | Privata/gemensamma ärenden, ansvar, diskussion, risker, ekonomi, versionsspårning, kopplade möten och uppföljningar | Inloggad, behörighetsstyrd |
| Arbetsyta – arbetsöversikt | Kommande sammanträden, egna/tilldelade ärenden, personliga uppgifter och öppna uppföljningar på ägda eller tilldelade gemensamma ärenden | Inloggad, uppgifter är privata även för admin |
| Arbetsyta – sökning och förankring | Gemensam behörighetsstyrd sökning, skiljer arbetsförslag från explicit internt förankrat ställningstagande | Inloggad, behörighetsstyrd |
| Arbetsyta – sammanträden | Privat/gemensam agenda, ärendekoppling, mötesförberedelser och separat offentlig månadskalender (KF, BUN, SN, KS) | Inloggad, behörighetsstyrd |
| Arbetsyta – privata anteckningar | Personliga ärende- och mötesanteckningar | Enbart anteckningens ägare |
| Administration | Aktivt godkända konton och valfri aggregerad statistik | Separat behörighet |

Arbetsytans gemensamma innehåll är för närvarande avsett för **en enda godkänd grupp, SD Lekeberg**. Det är inte en lösning för flera inbördes isolerade partiorganisationer. **Privat är standard**; att dela ett ärende eller möte är ett uttryckligt val. Innehållet är internt arbetsmaterial och utgör inte ett officiellt beslut eller partiyttrande.

## Struktur

- \`src/app.js\`, \`src/engine.js\`, \`src/candidate-engine.js\`, \`src/style.css\`, \`src/index.template.html\`: publikt gränssnitt och simulering.
- \`src/organizations.json\`: 57 organisationsposter med källstatus. Historiskt styrkta platstal är inte därmed fastställda för hela 2026–2030.
- \`src/workroom.js\`, \`src/meetings-*.js\`, \`src/workroom.css\`: skyddad Arbetsyta. \`src/workroom-pdf.js\` ger dokument- och utskriftsstöd.
- \`worker/private.mjs\`, \`worker/collaboration.mjs\`, \`worker/cases.mjs\`, \`worker/meetings.mjs\`, \`worker/official-meetings.mjs\`, \`worker/files.mjs\`: skyddade API:er med Cloudflare Access/JWT och D1-åtkomstkontroller.
- \`worker/index.mjs\`: Worker-routning, publik portal och frivillig telemetri.
- `worker/official-meetings-cache.mjs`, `ops/refresh-official-calendar.mjs` och `.github/workflows/meetingplus-calendar.yml`: GitHub hämtar offentliga MeetingPlus-uppgifter två gånger dagligen och lägger in dem i Worker-bundlen, utan utgående Cloudflare-anrop eller nya databasändringar.
- \`migrations/0001_*.sql\` till \`0012_*.sql\`: D1-migreringar. **1.0.2 kräver 0012_official_meetings.sql efter 0011.**
- \`build.py\`: genererar \`dist/index.html\`, rotens \`index.html\`, kopierar statiska tillgångar och bygger \`worker/workroom-page.mjs\`. Skyddad data ingår aldrig i den publika HTML-filen.
- \`.github/workflows/politikverkstan-ci.yml\`: automatiska bygg-, migrations-, Node- och webbläsartester. CI-aktivering och godkänt resultat måste kontrolleras på GitHub.

## Bygg och tester

I mappen \`politikverkstan-lekeberg\`:

\`\`\`bash
python build.py
npm test
npm run test:browser
python build.py --check
\`\`\`

\`--check\` gör inga ändringar; den misslyckas om de fem genererade artefakterna inte motsvarar källfilerna. Node 22 och Python 3.12+ rekommenderas; webbläsarsviten kräver Playwright, Chromium och PyMuPDF. CI installeras separat och innehåller ingen produktionsdatabasåtkomst.

**Viktigt:** GitHub Actions ger testresultat i en isolerad utvecklingsmiljö. Den verifierar inte Cloudflare Access-policy, aktiva D1-data, publik DNS, säkerhetskopiering eller verkliga användarkonton. Se [1.0-driftguiden](UPPGRADERING_1.0_CLOUDFLARE.md) för produktionskontroller.

## Integritet och tillförlitlighet

- Inga privata motioner, ärenden, möten eller dokument får publiceras på den öppna portalen.
- Publicerade mandatberäkningar är matematiska simuleringar; formella val, reglementen och gällande beslut måste verifieras separat.
- En användares personliga anteckningar ska inte delas eller ingå i standardutskrifter.
- Nuvarande \`wrangler.jsonc\` har \`TELEMETRY_ENABLED: "true"\`, men appen kräver frivilligt godkännande innan den skickar aggregerat analysdata. Säkerhets-IP-loggning är avstängd i repositorykonfigurationen. Ändra driftsinställningar medvetet, inte som sidoeffekt av en koduppdatering.
- Backup/återställning och behörighetsprover med två riktiga Cloudflare-konton måste verifieras innan skarp gruppanvändning.
- Dokumentation för personuppgiftsbehandling är ännu inte en fastställd integritetspolicy. Se [integritetsåtgärder](INTEGRITET_OCH_ATGARDER.md).

## Driftguider och historik

**Gällande:** [1.0.2 – offentlig sammanträdeskalender](UPPGRADERING_1.0.2_CLOUDFLARE.md). Tidigare: [1.0.1 – stabilisering och arbetsöversikt](UPPGRADERING_1.0.1_CLOUDFLARE.md). Tidigare: [1.0.0 – spårbarhet och sammanhängande arbetsflöde](UPPGRADERING_1.0_CLOUDFLARE.md). Tidigare: [0.9.2 – arbetsöversikt och privata uppgifter](UPPGRADERING_0.9.2_CLOUDFLARE.md). Tidigare: [0.9.1 – kvalitetssäkring och Cloudflare](UPPGRADERING_0.9.1_CLOUDFLARE.md).

**Senaste funktionsutgåvor:** [0.9.0 – Sammanträdesverkstad](UPPGRADERING_0.9.0_CLOUDFLARE.md), [0.8.0 – gemensamma ärenden](UPPGRADERING_0.8.0_CLOUDFLARE.md), [0.7.0 – privata ärenden](UPPGRADERING_0.7.0_CLOUDFLARE.md).

**Tidigare referensmaterial:** [Historisk README](README_HISTORIK.md), [arkitektur- och säkerhetsbegränsningar](SAKERHET_OCH_BEGRANSNINGAR.md), [källverifiering](ETAPP_1_VERIFIERING.md), [äldre testrapporter](TESTRAPPORT.md). Äldre texter är inte bevis för godkänd drift av 0.9.1.

**Driftstatus:** GitHub-kod och byggfiler är skilda från skarp driftsättning. Produktionsmigrering, åtkomstkontroll med verkliga användare och säkerhetskopia kräver separat verifiering.
