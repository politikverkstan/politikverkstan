# Politikverkstan 1.7.1 – driftsäkring
Datum: 2026-10-24.

## Kodändringar
1. GitHubs kalenderjobb committar fortfarande **endast offentligt material** till `main`, men när något ändrats skickar det uttryckligen `workflow_dispatch` till den ordinarie kvalitetsworkflowen. En GITHUB_TOKEN-push utlöser normalt inte push-workflows; workflow_dispatch är det dokumenterade undantaget.
2. Kvalitetsflödet verifierar genererade filer, matematiska motorer, behörighets- och migrationskontrakt, Playwright Chromium och PDF. En `workflow_dispatch`-startad körning befordras av **samma kvalitetsworkflow**, efter att båda testjobben godkänts. Vanliga `push`-körningar befordras genom separat `workflow_run`. Båda vägarna använder samma fast-forward-skript, kräver testad SHA = aktuell `main` och får inte skriva över nyare kod.
3. Arbetsytan visar version 1.7.1; den offentliga kalendern varnar när en källa saknar bekräftad uppdatering de senaste 48 timmarna. Varningen innebär INTE att mötesuppgifterna är verifierade.
4. Ingen D1-migrering, ingen automatisk databasexport, ingen ändring av användarroller eller delningsregler.

## Manuellt arbete som fortfarande krävs för säker produktion
- **Cloudflare:** Workers & Pages → politikverkstan → Settings → Build → Branch control. Välj `production` som produktionsgren. Kontrollera att `main` inte publicerar direkt till skarp tjänst (förhandsbyggen kan behöva vara avstängda eller strikt isolerade), samt build- och deploykommando. Detta kan inte ändras från koden i GitHub.
- **GitHub:** säkra `main` och `production` med lämpliga regler, begränsa direktpush/force-push och låt CI vara releasekrav. **Observera:** nuvarande kalenderjobb pushar från GitHub Actions till `main`; ett krav på PR för alla commits kan blockera det. Anpassa då kalenderflödet till PR eller använd uttryckligen avgränsad bypass innan regeln aktiveras. Inför inte regler som bryter kalenderhämtningen.
- **Remote D1:** kör `npm run check:production` i `politikverkstan-lekeberg` från behörig lokal terminal. Detta är läsande SQL och redovisar migrationshistorik, integritet och nycklar. Förändra inte baslinje eller schema automatiskt.
- **Backup/restore:** gör skyddad D1-säkerhetskopia, återläs i separat testdatabas och kontrollera tabeller och tillgång till dokument utan att ändra skarp databas.
- **Verkliga åtkomster:** testa med två godkända identiteter och minst en nekad/inaktiverad: privat ärende, personliga anteckningar, dokument, delning/återkallelse, adminrättigheter och Access-policy för `/arbetsrum`, `/admin` och `/api/private/*`.
- **GDPR:** ansvarig måste fastställa riktlinjer för privata arbetsuppgifter, rättslig grund, politiskt känsliga uppgifter, gallring, incidenthantering och eventuellt konsekvensbedömning. Se `INTEGRITET_OCH_ATGARDER.md`.
- **Kontrollera kalenderflödet:** invänta en verklig ändring i snapshot; verifiera att dispatchad kvalitetstestning fullföljs med gröna browsertester, följt av godkänd befordran till `production`. En grön byggning av `main` räcker inte.

## Verifieringskriterier
Kod-CI och produktionsdrift är skilda. Release 1.7.1 är **kodmässigt** levererad när CI är helt grön, men **driftmässigt säkrad** först efter ovanstående kontroller.

Officiella dokument:
- https://docs.github.com/en/actions/concepts/security/github_token
- https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/
