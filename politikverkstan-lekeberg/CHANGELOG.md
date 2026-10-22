# Ändringslogg – Politikverkstan Lekeberg

## Förbättring efter 0.9.2 – Navigering

- Diskret tillbaka-knapp i sidhuvudet i både publik portal och skyddad Arbetsyta.
- Webbläsarens tillbaka-/framåtknappar och musens motsvarande knappar navigerar mellan portalens vyer utan att lämna sidan.
- Arbetsytans navigationshistorik omfattar öppnade ärenden, sammanträden och motioner; osparade ändringar skyddas av befintliga bekräftelser.
- Nytt Chromium-test för intern navigering, inklusive detaljvyer och framåt/tillbaka. Ingen D1-migrering behövs.

## 0.9.2 – Min arbetsöversikt

- Ny inloggad arbetsöversikt med kommande möten, tilldelade ärenden, uppföljningar och motionsutkast.
- Privat att-göra-lista med prioritering, förfallodatum, status och behörighetskontrollerade länkar till egna/delade ärenden och möten.
- Ny D1-migrering 0010_dashboard_tasks.sql skapar work_tasks. Befintliga ärenden och möten ändras inte.
- Behörighets- och versionskontroller på servern; ingen administratör kan läsa andra användares privata uppgifter.
- Utökade Node-, migrations- och webbläsartester. Den publika portalen behåller sina funktioner.

## 0.9.1 – stabilisering och kvalitet

- Byggskriptet stoppar nu vid saknade mallmarkörer och skyddar mot att privata API-referenser av misstag byggs in i det publika paketet.
- `python build.py --check` verifierar alla genererade filer utan att skriva över dem.
- Ny GitHub Actions-kontroll för fullständig Node-testsvit, migreringar 0001–0009, Chromium och PDF-regressioner.
- Nya regressionstester för felaktiga byggfiler, kvarstående privata anteckningar efter migrering och D1-referensintegritet.
- Rättat fel i `worker/cases.mjs`: ägarkontrollerna för kopplade motioner/filer använder nu rätt D1-bindning. Felet hittades av CI-testet för ärenden.
- Stabiliserat äldre webbläsartester med entydiga navigationsselektorer och en testrunner som redovisar samtliga testfel.
- README uppdaterad; äldre README arkiverad i `README_HISTORIK.md`.
- Ny `UPPGRADERING_0.9.1_CLOUDFLARE.md` med säkra D1-kontroller, backup- och återställningsberedskap samt tvåanvändarprov.
- Ingen ny D1-migrering; den aktuella konfigurationen för Cloudflare, Access och telemetri har inte ändrats.

**Verifieringsstatus:** avgörs av senaste faktiska GitHub Actions-jobb samt separata drift- och behörighetskontroller. CI-verifiering med mockar är inte en produktionsrevision.

## 0.9.0 – Sammanträdesverkstad

- Skyddade sammanträden, dagordning, ärendekopplingar och uppföljning.
- Personliga mötesanteckningar separerade från gemensam dagordning.
- D1-migrering `0009_meetings.sql`.

## 0.8.0 – gemensamma ärenden

- Ägarstyrd delning och ansvarsfördelning; kommentarer och personliga anteckningar.
- D1-migrering `0008_shared_cases.sql`.

## 0.7.0 – ärenden

- Privata ärenden, risker, ekonomi, dokumentkopplingar och beslutsunderlag.
- D1-migrering `0007_cases.sql`.

## 0.6.0 – guidad mandatberäkning och källstatus

- Frivillig trestegsguide och tydligare dokumenterad källosäkerhet i organisationsregistret.

## Tidigare versioner

## 0.5.1 – SD Arbetsrum: samarbete och gemensamma dokument

- **Mina motioner**: sökning, delningsstatus och tidigare funktioner bibehållna.
- **Våra motioner**: särskild vy för gruppdelade eller direktdelade motioner. Kontrollerad åtkomst via delning, inte via administratörsroll.
- **Delningsinställningar**: motionens ägare väljer privat, enskilda personer eller hela arbetsgruppen; read/comment/edit. Gruppdelning föreslår läs- och kommentarsrätt först.
- **Kommentarer**: interna synpunkter per motion, stäng/öppna, behörighetskontroller och avskiljning från PDF.
- **Säker dokumentredigering**: atomisk sparning/versionsarkivering i D1-batch, CAS på revision, kontroll av redigeringsrätt vid skrivning, autosparning som inte tyst förlorar nyare ändringar.
- **Våra idéer**: standardanvändare kan skapa idéer, diskutera med kommentarer och följa status. Ägare/administratör kan uppdatera status.
- **Idé → motion**: skapar ny privat motion; koppling sparas men bara behöriga kan se länkade dokument.
- **D1-migrering `0003_collaboration.sql`**: nya delnings- och kommentarstabeller, revisionsredaktör och idékoppling. Befintliga motioner får *privat* som standard; inga destruktiva DROP/DELETE.
- **Cloudflare Worker `name`** ändrat i paketets exempel till `politikverkstan` för att motsvara nuvarande publicerade projekt. Database UUID är fortfarande platshållare: behåll det verkliga ID:t från användarens fungerande GitHub-konfiguration.
- Befintliga publika beräkningsfiler ändrades inte; regressionstester passerar.

## 0.5.0

Första versionen med separat SD Arbetsrum, inloggningsskyddad motionsredigerare, privat D1-lagring, PDF-mallar, idébank och grundläggande kontohantering. Se äldre utvecklingsdokumentation.
