# Politikverkstan Lekeberg 0.5.2

Läs **UPPGRADERING_0.5.2_CLOUDFLARE.md** före installation mot en befintlig databas.

# Politikverkstan Lekeberg — 0.5.1

**Uppdatering av befintliga Politikverkstan, inte en ny applikation.** Huvudfilen för den publika portalen är alltid `dist/index.html`, med en kopia som `index.html` i projektroten. Cloudflare Workern har namnet `politikverkstan` och den avsedda adressen är `https://politikverkstan.joel-wennstrom.workers.dev/`.

## Innehåll

**Offentliga delen**: den befintliga mandat-/kartellbyggaren, kandidatberäkning, lottningar, inflytande, förhandling, organisationsregister, export och scenarier. Oförändrade beräkningskällfiler.

**SD Arbetsrum** (`/arbetsrum`, skyddat via Cloudflare Access och serverbaserade D1-behörigheter):

- **Mina motioner**: privata och av ägaren delade utkast, sökning, autosparning, versionshistorik och PDF-export.
- **Våra motioner**: dokument som delats med hela gruppen eller enskilda personer. Dokumentägaren kan ge behörigheterna `read`, `comment`, `edit` eller ingen behörighet. *Privat är standard.* Enbart aktivt godkända användare kan se dokument.
- **Kommentarer**: interna kommentarer, markera åtgärdade, författare och tid. Kommentarer exporteras inte i PDF.
- **Versionskontroll**: optimistisk dokumentrevision förhindrar tyst överskrivning, och versionerna anger redaktör för ändringar gjorda efter migreringen.
- **Våra idéer**: aktiva standardanvändare kan skapa idéer och kommentera. Idéansvarig eller administratör kan ange status. En idé kan bli ett nytt *privat* motionsutkast. Endast användare som har behörighet ser kopplade motioner.
- **Användaradministration**: från 0.5.0, administratör hanterar konton utan generell dokumentåtkomst.

Inget AI-API behövs; ingen koppling finns mellan privata dokument och den publika besöksstatistiken. Inget förslag är automatiskt ett officiellt ställningstagande. Verktyget ersätter inte juridisk och saklig granskning.

## Uppgradera en installerad 0.5.0

1. **Ta säkerhetskopia på befintlig D1-databas och projektkod.**
2. Läs `INSTALLATION_CLOUDFLARE.md`. **Återanvänd exakt samma databas-ID, Worker-variabler, Access-konfiguration och konto**. Denna ZIP innehåller bara en platshållare för D1 UUID, eftersom vi inte har ditt verkliga ID. Skriv aldrig över din fungerande konfiguration med en platshållare.
3. Kör SQL-migreringen `migrations/0003_collaboration.sql` **en gång** på befintlig databas, efter `0001` och `0002`. Via webbläsaren kan den köras i D1 Console, med stegvis vägledning i installationsguiden.
4. Uppdatera projektkoden i GitHub och publicera via Cloudflares Git-integration. Byggkommandot är `npm run build`; distributionskommandot är `npx wrangler deploy`.
5. Testa åtkomst med två separata godkända användare innan verkliga motioner delas.

Databasmigreringen **raderar inga befintliga konton, motioner, idéer eller versioner**. Nya `work_motions.team_permission` får `none` och det finns inga delningsposter förrän ägaren delar aktivt. Kör inte om samma `ALTER TABLE`-satser om de redan genomförts.

## Utveckling och tester

```bash
npm run build
npm test
npm run test:browser
```

`npm run build` kör Python och genererar `dist/index.html` samt den skyddade servermodulen `worker/workroom-page.mjs` från `src/workroom.js` och CSS. De genererade filerna ingår i paketet för enkel GitHub-publicering. `npm test` behöver Node.js 22 för inbyggt test-SQLite; en vanlig installation av Workern behöver inte Node SQLite.

## Säkerhetsmodell

- Cloudflare Access RS256-JWT kontrolleras på servern: signatur, issuer, audience och utgångstid.
- En extra intern lista i D1 kräver aktiv användare. `admin` innebär inte generellt tillträde till dokument.
- Alla listningar, läsningar, ändringar, kommentarer, PDF-underlagskontroller och delningar har kontroll på serversidan.
- Begärda ändringar måste matcha aktuell dokumentrevision. Delningsändringar görs i en databastransaktion.
- Fullständiga dokument, kommentarer och upphovsmän lagras inte i statistiktabellerna.

**Status:** lokalt testad releasekandidat. Inte driftsatt eller penetrationstestad på ditt Cloudflare-konto. Undvik att behandla känsligt arbetsmaterial i produktion före verifierad Access-konfiguration, säkerhetskopiering och test av kontogränserna.
