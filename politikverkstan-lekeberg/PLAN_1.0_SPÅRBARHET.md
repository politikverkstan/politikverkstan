# Politikverkstan 1.0 – Spårbarhet och sammanhängande arbetsflöde

**Status:** Utvecklingsspecifikation, inte driftsatt release.  
**Bas:** 0.9.2 samt senare navigeringsändringar på `main`.  
**Versionshantering:** Befintligt GitHub-repository `politikverkstan/politikverkstan`, gren `main`. Ingen flytt eller ändring av Cloudflare-konfiguration avses.

## Syfte

Ett ärende ska kunna följas genom analys, beredning, ett eller flera sammanträden, utfall, ställningstaganden och uppföljningar. Alla nya funktioner ska respektera befintliga privata och gemensamma behörighetsgränser. Historiken får inte förväxlas med ett officiellt kommunalt protokoll.

## Leveranser och acceptanskriterier

### 1. Fullständig ärendehistorik

- Registrera skapande, sakändringar, statusändringar, delning och ansvarsfördelning i en append-only-historik med tidpunkt, aktör, ändringstyp och revisionsnummer.
- Visa historiken kronologiskt i ärendets detaljvy; ange ändrade fält och tidigare/nya värden där uppgifterna är åtkomliga.
- Utför sakändring och historikskrivning atomiskt. Misslyckas historikskrivningen får inte ärendet uppdateras utan spår.
- Tillåt inte obehöriga att läsa historik. Privata dokument- och motionskopplingar, personliga anteckningar och tidigare värden får inte läcka till andra medarbetare genom historiken.
- Bevara etablerade revisionskontroller (konflikt vid samtidig redigering). Historiken ska inte tillåta omärkta ändringar från äldre API-vägar.
- Definiera retention/radering med hänsyn till dataskydd och ärendets livscykel; append-only innebär inte att radering enligt tillämpliga regler får omöjliggöras.

### 2. Sammanträden och beslutsuppföljning

- Stöd flera dagordningspunkter och sammanträden kopplade till samma ärende.
- Visa berörda sammanträden i ärendets detaljvy och erbjuda navigering till tillåtna mötesvyer.
- Skilj mellan antecknat mötesutfall, verifierat kommunalt beslut och internt förslag.
- Inför explicita uppföljningsposter kopplade till ärenden och/eller mötespunkter med ansvar, tidsfrist, status och utfallet av uppföljningen.
- Respektera att en privat möteskoppling aldrig ska exponera mötets existens eller innehåll för den som endast har åtkomst till ett delat ärende.

### 3. Gemensam sökning

- Sök i tillåtna ärenden, möten, motioner och dokument från en gemensam sökvy.
- Visa typ, rubrik, uppdateringsdatum och relevant kontext; filtrera efter objekttyp.
- Servern måste tillämpa samma åtkomstkontroller som respektive resurs. Ingen global indexering av privat innehåll i den publika portalen.
- Hantera tom sökning, inga träffar och stora träffmängder utan att hämta privat material utanför användarens rättigheter.

### 4. Förankrade ställningstaganden

- Separera `diskussion/arbetsförslag`, `personligt ställningstagande`, `föreslaget gemensamt` och `förankrat gemensamt` från faktiska beslut i kommunen.
- Lagra källa till förankringen: datum, beslutsform, ansvarig registrerare och eventuell dokument- eller mötesreferens.
- Ingen gemensam förankringsstatus ska kunna uppstå automatiskt genom ändrad ärendestatus, kommentar eller rekommendation.
- Definiera vem som får markera ett ställningstagande förankrat; endast uttryckligen behöriga får göra detta.
- Visa historiska statusändringar; skilj uttryckligen intern gruppförankring från officiellt partibeslut.

## Föreslagen teknisk sekvens

1. **Datamodell och tester:** ny framåtriktad D1-migrering efter `0010_dashboard_tasks.sql`, utan destruktiva ändringar i befintliga tabeller. Säkerhets- och migrationsprov först.
2. **Ärendehistorik:** atomisk serverlogg, behörighetsfiltrerat GET-API och historikvy. Testa samtidiga ändringar och privat information.
3. **Ärende ↔ möte ↔ uppföljning:** utöka befintliga ärende- och mötes-API:er, återanvänd befintliga kopplingar där det går, visa relationer i båda riktningar.
4. **Gemensam sökning:** en egen behörighetsprövad endpoint och samlad sökvy. Sök endast i tillåtna fält.
5. **Ställningstaganden:** statusmodell och explicit behörighetskontrollerad förankringshändelse, med historik.
6. **Releasekontroll:** `python build.py`, `npm test`, `npm run test:browser` och `python build.py --check`. Uppdatera genererade filer och dokumentation. Skarp Cloudflare/D1-drift och Access-policy verifieras separat.

## Avgränsningar och risker

- `work_cases` har redan `revision`, `scope`, `assignee_email`; `work_meeting_items` har redan `case_id`. Utnyttja detta före nya tabeller och undvik dataduplicering.
- 0.9.2:s personliga uppgifter i `work_tasks` ska förbli privata; gemensamma uppföljningar behöver separat auktorisationsmodell.
- För privata eller känsliga uppgifter måste både aktuell vy och historiska versioner behörighetskontrolleras.
- Befintliga motioners versionshistorik ersätts inte; ärendehistoriken kompletterar den.
- Ingen automatisk publicering eller databasuppgradering följer av kodändringar i GitHub.
- Uppdatera inte versionsnumret till 1.0.0 förrän acceptanskriterierna är testade och granskade.

## Definition av färdig 1.0

Samtliga fyra funktionella områden fungerar i den skyddade Arbetsytan, relevanta migreringar är dokumenterade, regressionstester för behörighet och dataintegritet passerar och release-/driftinstruktioner skiljer verifierad kod från verifierad produktion.
