# Politikverkstan 0.8.0 – SD Lekeberg, gemensamma ärenden

## Vad som ändrats

`Ärenden` i den inloggade Arbetsytan har två tydliga lägen:
- **Mina privata** – den som skapar ett ärende äger det. Det kan endast läsas, ändras eller raderas av ägaren. Detta är även standard för alla nya och äldre ärenden.
- **Våra gemensamma** – ärendets ägare kan, efter uttrycklig bekräftelse, dela det gemensamma innehållet med **alla aktiva och godkända användare** i den nuvarande SD Lekeberg-arbetsytan. Det finns ännu **inte** flera avgränsade partigrupper i samma installation.

Ägaren kan utse en ansvarig (aktiv användare) som också kan redigera delat innehåll. Övriga får läsa och kommentera, men inte redigera, ändra delningen eller radera. Delning kan återkallas av ägaren.

**Personliga mötesanteckningar är separata** från ärendets gemensamma innehåll, lagras per användare och exponeras inte för kollegor. Privata fil- och motionskopplingar skickas inte till andra användare. Ett uttryckligen delat ärende kan dock innehålla annat arbetsmaterial i sina gemensamma textfält; ägaren måste bedöma innehållet före delning.

Enhetlig design, dokumentarkiv, motionsverkstad, publika mandatverktyg och befintliga API-behörigheter behålls. Det finns ingen publik API-åtkomst till ärenden.

## Obligatorisk D1-migrering före driftsättning

1. Kontrollera att `migrations/0007_cases.sql` och alla tidigare migreringar verkligen finns i produktionsdatabasen. Kontrollera korrekt Cloudflare-konto, databas-ID och Worker.
2. **Ta en verifierbar säkerhetskopia av D1.** Stoppa tillfälligt andra skrivningar under migreringen om möjligt.
3. Kör **endast** `migrations/0008_shared_cases.sql` på befintlig D1-databas efter 0007. **Kör den inte två gånger**: den innehåller `ALTER TABLE ... ADD COLUMN`.
4. SQL lägger till `scope` och `assignee_email` i `work_cases`, samt tabellerna `work_case_notes` och `work_case_comments`.
5. SQL kopierar **befintliga privata mötesanteckningar** från `work_cases.content_json.meeting_notes` till ägarens privata anteckningstabell. Därefter tas `meeting_notes` bort från ärendets gemensamma JSON. Kontrollera detta i en testkopia av databasen innan migrering i produktion.
6. **Distribuera inte 0.8.0 Worker före migreringen.** Den nya ärende-API-koden förutsätter de nya tabellerna och kolumnerna. Om migreringen misslyckas: avbryt publiceringen och återställ från säkerhetskopian efter databasansvarigs bedömning.

## Tester och releasekontroller

I en miljö med Node (inklusive `node:sqlite`), Python, Playwright och Chromium:

```bash
npm run build
npm test
npm run test:browser
```

De nya testerna `tests/test-cases-share.mjs` och `tests/test-shared-cases-ui.py` kontrollerar bland annat:
- 0.7.0-ärenden förblir privata och gamla personliga anteckningar flyttas säkert.
- Nya ärenden är privata tills ägaren väljer delning.
- En administratör kan inte öppna privata ärenden som tillhör någon annan.
- En ansvarig får redigera delat ärende, en vanlig gruppmedlem får endast kommentera.
- Personliga mötesanteckningar är skilda per användare.
- Länkade privata handlingar kan inte läsas genom det delade ärendet.
- Återkallad delning blockerar fortsatta API-anrop för andra användare.

Efter driftsättning: testa med minst två verkliga Cloudflare Access-konton (helst tre: ägare, ansvarig, läs-/kommentarsbehörig). Testa också att en inaktiverad användare nekas inloggning, att ägaren ensam kan återkalla delning och att äldre ärenden fortfarande är privata. Kontrollera att ingen privat data finns på den publika sidan.

## Rättighets- och hanteringsgränser

- `scope='team'` betyder samtliga **aktiva/godkända konton**, inte en viss partigrupp identifierad i databas. Innan konton från en annan organisation bjuds in måste flergruppsisolering byggas.
- Delning av ärendet innebär **inte** delning av privata motioner/filer som ägaren har kopplat till ärendet.
- Diskussionen följer ärendets synlighet. Kommentarer finns kvar när ett ärende görs privat igen, men tidigare gruppmedlemmar kan då inte öppna dem.
- Befintliga delade texter kan vara lästa eller kopierade av användare innan delningen dras tillbaka. Återkallelse stoppar ny åtkomst via API:et, inte redan mottagna kopior.
- Personliga anteckningar ingår inte i PDF/utskrift som standard.
- Ägaren bör alltid kontrollera material för sekretess, personuppgifter, interna överenskommelser och obestyrkta uppgifter före delning.
- Detta är ett arbetsverktyg, inte ett officiellt kommunalt dokument- eller beslutsregister.

## Produktion ännu inte verifierad

Koden är committad i GitHub. Migreringen har **inte körts i Cloudflare**, och fullständiga Node-/Chromium-tester, Cloudflare Access-policy, produktionens databas och återställningsrutiner kan inte bekräftas från denna konversation. Det här är en blockerande driftkontroll – **inte** ett klartecken att mata in skyddsvärda uppgifter.
