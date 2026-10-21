# Politikverkstan 0.9.0 – Sammanträdesverkstad

## Funktion

Under skyddade **Arbetsytan → Sammanträden** kan godkända användare skapa privata sammanträden, registrera instans, datum, tid, plats och status samt bygga en **dagordning i vald ordning**. Varje punkt kan ha en rubrik, förberedelser, antecknat utfall och uppföljning. Den kan även kopplas till ett befintligt ärende som användaren får läsa.

Ägaren kan uttryckligen dela sammanträdet med **samtliga aktiva, godkända användare** i nuvarande SD Lekeberg-arbetsyta. Ägaren ensam får ändra mötesuppgifter, dagordning och delning eller radera mötet. Andra godkända användare kan läsa delade möten. Varje användare har egna mötesanteckningar som hålls privata på serversidan och **inte** ingår i utskriften.

En gemensam dagordning kan endast kopplas till gemensamma ärenden. När ett privat sammanträde redan innehåller privata ärendekopplingar avbryts försök att dela hela mötet. Först måste dessa kopplingar tas bort eller ärendena delas medvetet. Ändrad behörighet i ett kopplat ärende ger inte automatiskt åtkomst till ärendet via sammanträdet.

Detta är **inte** en synkroniserad kommunal möteskalender, automatisk import från mötesportal, officiellt protokoll eller ett system för formella beslut. Dagordning och uppföljning fylls i manuellt. Endast internt arbetsmaterial.

## Obligatorisk uppgradering

1. Kontrollera att migreringarna **0002–0008**, i synnerhet `0008_shared_cases.sql`, har körts i **rätt produktionsdatabas**. Att Cloudflare D1-konsolen svarade ”This query returned no data” är normalt för DDL men inte tillräckligt som ensam bekräftelse.
2. **Säkerhetskopiera D1 och verifiera möjlighet till återställning.** Migreringen kräver referenser till `work_users` och `work_cases`.
3. Kör **endast `migrations/0009_meetings.sql`** en gång i rätt Cloudflare D1-databas. Den skapar tre tabeller: `work_meetings`, `work_meeting_items`, `work_meeting_notes` samt index. Migreringen ändrar inte gamla ärenden eller deras åtkomst.
4. Verifiera strukturen:
   ```sql
   SELECT name FROM sqlite_master WHERE type='table'
     AND name IN ('work_meetings','work_meeting_items','work_meeting_notes')
   ORDER BY name;
   ```
   Resultatet ska innehålla tre rader.
5. Bygg och testa projektet med `npm run build && npm test && npm run test:browser` i en utvecklings- eller CI-miljö. Sista testsviten kräver Python, Playwright och Chromium. Node-test för möten använder `node:sqlite`.
6. Publicera **den nya Worker-koden och den byggda skyddade sidan tillsammans** enligt ordinarie Cloudflare/GitHub-process, först när databasmigreringen är genomförd.
7. Verifiera i riktig inloggad webbmiljö med två eller tre separata konton: privat möte kan inte läsas av annan användare; delning kan bara göras av ägaren; länkning av privat ärende stoppas i gemensamma möten; personliga mötesanteckningar förblir privata; återkallad delning stoppar åtkomst.
8. Provkör skapande av dagordningspunkter, flytt upp/ned, länkar till behöriga ärenden, eftermötesanteckningar, utskrift samt mobil- och mörkt läge.

## Filer

- `migrations/0009_meetings.sql`: D1-tabeller/index för möten, agenda och privata anteckningar.
- `worker/meetings.mjs`: skyddad CRUD för möten, dagordning, delning, anteckningar och ärendebehörighet.
- `worker/private.mjs`: kopplar nya endpoints till befintlig Cloudflare Access- och aktivt konto-kontroll.
- `src/meetings-ui.js`, `src/meetings-page.js`, `src/meetings-actions.js`: arbetssätt, gränssnitt och åtgärder. Byggs in i Arbetsytan via `build.py`.
- `src/workroom.css`: responsivt grafit- och terrakottatema samt utskriftsvy.
- `worker/workroom-page.mjs`: byggd, inloggningsskyddad sida.
- `tests/test-meetings.mjs` och `tests/test-meetings-ui.py`: rättighets- och gränssnittstester.

## Begränsningar och säkerhet

- Även om andra läser ett delat möte får de inte automatiskt redigera eller dela dagordningen. Ägaren samordnar tills vidare mötesstrukturen.
- Att dela ett möte delar dess **egna** rubriker, förberedelser, antecknade utfall och uppföljning. Kontrollera texterna innan delning.
- Ägaren kan återkalla delning, men detta kan inte återkalla tidigare nedladdade eller kopierade uppgifter.
- Alla godkända aktiva konton tillhör för närvarande samma grupp. Systemet är inte byggt för flera oberoende partiorganisationer.
- Redigering av dagordning med flera samtidiga användare är begränsad till ägaren. Mötets metadata har revisionskontroll.
- Det finns ingen automatisk kalenderhämtning, påminnelse, fulltextindexering, AI-granskning eller juridisk verifiering av protokoll.
- Fullständiga produktions- och webbläsartester måste genomföras separat innan känsliga politiska handlingar börjar användas i den nya funktionen.

**Viktigt:** GitHub-ändringarna installerar inte databasmigreringen, ändrar inte Cloudflare Access-policy och garanterar inte automatisk driftsättning.
