# Politikverkstan 0.7.0 – uppgradering för Etapp 2

Version 0.7.0 innehåller privat ärendehantering, mötesförberedelser, etiketter och sökning, koppling av egna motioner/privata filer samt utskriftsvänliga beslutsunderlag. Funktionen `Mina ärenden` öppnas endast i skyddade Arbetsytan. Inga ärendedata exponeras i den publika portalen.

## Före publicering

1. Kontrollera att Cloudflare Access redan skyddar `/arbetsrum` och `/api/private/*`, samt att Workern verifierar JWT och aktivt konto i D1.
2. **Säkerhetskopiera den befintliga D1-databasen.** Återanvänd samma databas-ID, befintliga miljövariabler och Access-inställningar.
3. Verifiera att migreringar `0002_workroom.sql`–`0006_files.sql` har körts i ordning. Den här versionen kräver `work_files` och `work_motions.trashed_at`.
4. Kör **enbart den nya** `migrations/0007_cases.sql` i samma D1-databas, lämpligen med Cloudflare D1 Console eller Wrangler kopplad till rätt produktionsdatabas. SQL innehåller `CREATE TABLE IF NOT EXISTS` samt index och tar inte bort befintliga tabeller.
5. Kör projektets befintliga byggkommando `npm run build` och testerna `npm test` och `npm run test:browser` (Node 22, Python + Playwright + Chromium krävs för sistnämnda) i en miljö som kan nå projektets källkod.
6. Publicera rätt Worker- och statiska artefakter via den befintliga Cloudflare/GitHub-pipelinen. Kör inte om tidigare `ALTER TABLE`-migreringar.
7. Verifiera att den inloggade sidan visar `Mina ärenden` och att ett privat ärende kan skapas, sparas, filtreras, skrivas ut och raderas. Kontrollera med två separata konton: konto B (även om det är administratör) får inte se konto A:s privata ärenden.
8. Kontrollera att endast ägarens egna privata filer kan kopplas till ett ärende, att kopplade egna motioner kan öppnas och att den publika sidan fortfarande bara visar mandat-/analysinformation.
9. Testa också mobilvy och mörkt tema; utskriften använder webbläsarens funktion `Skriv ut`, där användaren själv kan välja `Spara som PDF`.

## Drift och ansvar

- Ärenden och deras text är strikt personliga. Det finns i 0.7.0 **ingen gruppdelning av ärenden**, ingen kalendersynkronisering, ingen automatisk PDF-arkivering och ingen AI-behandling.
- Länkade motioner/filer är begränsade till sådana som tillhör samma användare. Om filen senare delas eller raderas kan länken bli otillgänglig; systemet utökar inte åtkomst för att upprätthålla länken.
- Sökning och filtrering sker i den redan behörighetskontrollerade listan som hämtas av användaren. Den är inte en separat global söktjänst.
- Ärendets anteckningar och ställningstaganden är **inte officiella beslut**, och ett exporterat arbetsunderlag får inte framställas som kommunens handling eller partiets antagna ståndpunkt utan separat godkännande.
- Ärenden har optimistisk revisionskontroll vid sparning: ett gammalt utkast får HTTP 409 vid konflikt. **Versionshistorik för ärenden har inte byggts i denna etapp**; revisionsnumret är en konfliktsignal och inte en återställningsfunktion.
- Begär fullständig verifiering av produktion före användning med sekretessbelagt eller annars känsligt material. Behåll rutiner för lagringstid, åtkomstprövning och säkerhetskopiering.

## Tekniska filer

- `migrations/0007_cases.sql`: ny tabell `work_cases` och index.
- `worker/cases.mjs`: API `GET/POST /api/private/cases` och `GET/PUT/DELETE /api/private/cases/:id`, endast efter Cloudflare Access och godkänt D1-konto.
- `worker/private.mjs`: kopplar in API:et efter autentisering.
- `src/workroom.js` och `src/workroom.css`: gränssnitt, dokumentlänkar, ärendesökning och utskrift.
- `worker/workroom-page.mjs`: byggd skyddad sidmodul.
- `tests/test-cases.mjs`, `tests/test-stage2-ui.py`: integritets-, revisions- och flödestester.

## Kända verifieringsbegränsningar

Detta är en kodförändring i GitHub. Cloudflare Access-policy, D1-migrering, publiceringspipeline och verklig webbläsarupplevelse kan inte garanteras utan åtkomst till installerad produktionsmiljö och separata tester. Verifiera dem innan driftsättning.
