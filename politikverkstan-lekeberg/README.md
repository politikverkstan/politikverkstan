> **Nyhet 0.8.0 – Gemensam ärendehantering:** `Ärenden` i den skyddade Arbetsytan erbjuder privata ärenden och ärenden som ägaren uttryckligen delar med **alla aktiva, godkända användare i den enda nuvarande SD Lekeberg-arbetsgruppen**. Endast ägaren kan dela, utse ansvarig och radera. Den utsedda ansvariga får redigera gemensamt innehåll; övriga får läsa och kommentera. **Personliga mötesanteckningar lagras per användare**, visas inte för andra och kommer inte med i standardutskriften. Egna fil- och motionskopplingar delas inte automatiskt. Existerande ärenden förblir privata. **Måste installeras med migrering `0008_shared_cases.sql` efter `0007_cases.sql`**, innan ny Worker-kod tas i bruk. Ingen generell flerpartitenancy finns. Se [uppgraderingsguiden](UPPGRADERING_0.8.0_CLOUDFLARE.md). Fullständiga Node-/webbläsartester och produktionsdrift återstår att verifiera.

> **Nyhet 0.7.0 – Etapp 2:** Privat **Mina ärenden** i den inloggade Arbetsytan med mötesdatum, status, etiketter, frågor, alternativ, ekonomi, risker, ställningstagande, uppföljning och privata kopplingar till egna motioner/filer. Sök/filter i ärenden och sökning efter filnamn över alla mappar inom valt dokumentområde. **Skriv ut / spara som PDF** använder webbläsarens utskriftsdialog och ger ett märkt internt beslutsunderlag. Ärenden är strikt personliga; inte heller en administratör kan läsa någon annans ärenden. Behörighet verifieras på servern. **Kräver den nya D1-migreringen `migrations/0007_cases.sql` efter `0006_files.sql` innan funktionen används.** Inga publika ärendedata. Se [uppgraderingsguiden](UPPGRADERING_0.7.0_CLOUDFLARE.md). Fullständiga webbläsar- och produktionskontroller återstår.

> **Nyhet 0.6.0 – Etapp 1:** Den öppna mandatportalen har fått en **guidad analys i tre steg** (val av nämnd, hypotetisk samverkan, granskning av simulering), medan befintligt avancerat läge är kvar. Organisationsregistret skiljer tydligare på historiskt dokumenterade 2025-uppgifter, förslag och ännu ej verifierade platstal; 10 poster har kontrollerats mot 2025 års reglemente men **ingen post anges som slutligt verifierad för hela mandatperioden 2026–2030**. Se [verifieringsprotokollet](ETAPP_1_VERIFIERING.md) för exakta statusantal och vad som återstår. Ingen ny D1-migrering. Webbläsar-/produktionskontroller återstår innan release betraktas som driftverifierad.

> **Nyhet 0.5.6 – Graphite & Clay:** Gemensam grafitgrå och terrakottafärgad design i publik mandatportal, inloggad **Arbetsyta** och skyddad administrationsvy. Publika startsidan har ett originalritat, **Lekeberg-inspirerat** landskap (inte ett fotografi av Fjugesta), länkar till *faktiska offentliga analysfunktioner* samt inloggning. **Inga motioner, privata dokument eller exempelposter publiceras på den öppna sidan.** Arbetsytans skyddade startsida visar endast befintliga egna och av användarens behörigheter tillgängliga delade motioner; är listan tom visas ingen påhittad post. Tema-växling och sparad preferens fungerar i båda lägena. Alla tidigare mandatberäkningar, PDF-mallar, rättigheter och dokumentlagring behålls. **Ingen ytterligare D1-migrering krävs för 0.5.6**, men `0006_files.sql` från 0.5.4 behövs om filarkivet inte redan installerats. Uppdaterade UI-tester finns under `tests/`, men måste köras i miljö med Chromium för fullständig verifiering.

> **Nyhet 0.5.5:** Publika gränssnittet är partineutralt med ingången **Arbetsyta** i stället för SD Arbetsrum. Enhetlig skifferblå/turkos design och växling mellan **Ljust/Mörkt** läge på både den publika portalen och den inloggade arbetsytan. Valet sparas lokalt i webbläsaren under `politikverkstan-theme` och följer med mellan båda vyerna. Utan sparat val används operativsystemets färginställning. Befintlig behörighetsmodell, PDF-export och den valbara SD-motionsmallen är oförändrade. **Ingen ny D1-migrering** krävs för enbart dessa UI-förändringar. Föregående 0.5.4-filarea kräver fortfarande `0006_files.sql` om den inte redan är installerad.

> **Nyhet 0.5.4:** Filarea i det inloggade arbetsrummet med **Mina dokument**, **Våra dokument**, mappar/undermappar, uppladdning och automatisk privat lagring av exporterade PDF:er. Befintlig D1-databas används. Kör `migrations/0006_files.sql` enligt [uppgraderingsguiden](UPPGRADERING_0.5.4_CLOUDFLARE.md) innan funktionen används. Max 10 MiB per fil och 100 MiB per ägare.

> **Nyhet 0.5.3:** Professionell SD-inspirerad motionsmall, frivillig godkänd PNG-logotyp, förbättrad PDF-export och redigerbara visningsnamn. Se [uppgraderingsguiden](UPPGRADERING_0.5.3_CLOUDFLARE.md) och [testrapporten](TESTRAPPORT_0.5.3.md). Kräver D1-migreringen `0005_branding.sql` för logotypstöd.

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
