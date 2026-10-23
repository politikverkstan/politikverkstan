## 1.8.0 – 2026-10-24

- Ny, inloggningsskyddad vy `Mitt nästa sammanträde` med kommande möten från MeetingPlus och egna åtkomliga möten.
- Samlad dagordning med originalhandlingar, status för faktiskt sparade egna förberedelser, procentuell täckning och möjlighet att fortsätta arbetet vid ett senare tillfälle.
- Ett eget privat sammanträde skapas endast efter uttrycklig bekräftelse. Enskilda offentliga punkter läggs endast till när användaren själv väljer dem. Ett befintligt privat möte återanvänds.
- Egen förberedelse och uppföljning kan redigeras direkt i vyn med befintliga behörighetsstyrda endpoints, utan nya D1-tabeller eller automatisk delning.
- Befintlig navigationshistorik, källvarningar och mobilanpassning används. Progressindikatorn mäter **sparad text**, inte om ett ärende juridiskt eller politiskt är färdigbehandlat.
- Nya Node- och Chromium-regressionstester för återupptaget sammanträde och dubblettskydd.

## 1.7.1 – 2026-10-24

- Kalenderhämtning som uppdaterar `main` med `GITHUB_TOKEN` utlöser nu explicit hela CI-flödet via `workflow_dispatch`. Dispatch-körningar kan befordras direkt efter gröna tester; vanliga pushar använder `workflow_run`. Båda vägarna kräver godkänd **aktuell** `main`-commit och fast-forward.
- Versionsnummer visas i den skyddade Arbetsytan. Kalendern varnar om något organ saknar bekräftad uppdatering inom 48 timmar.
- Release- och driftchecklista tydliggör gränsskydd, Cloudflare-inställningar, databassäkerhetskopior, verkliga åtkomstprov och integritet. Dessa externa steg redovisas som ej utförda tills de kontrollerats.
- Ingen ny databasstruktur, ingen rättighetsutökning i applikationen och ingen automatisk export av personuppgifter.
- Nytt regressionsskydd för releasekedjans kopplingar och källåldersvarning.

## 1.7.0 – 2026-10-23 (omfattar 1.5–1.7)

- **1.5:** Hämtning av offentliga MeetingPlus-handlingar och konservativ avläsning av dagordningsrubriker. Endast källstyrkta punkter får föreslås för privata mötesförberedelser. Ändringsindikering och varning om källfel.
- **1.6:** Valbar, privat ärendekoppling från en egen mötesdagordningspunkt. Separat källöversikt och verifieringsvarning för antecknade kommunala beslut.
- **1.7:** Sju dokumenttyper i befintlig behörighetsstyrd dokumentlagring; typstyrd redigering, formell kontrolltext och PDF-export. Äldre motioner tolkas fortfarande som motioner.
- Ingen ändring av privata ACL eller D1-schema. Säkerhetstestning och fullständig browserregression krävs innan arbetsflödet befordras till `production`.

## 1.4.0 (inklusive 1.3.1) – 2026-10-23

- Delvis källverifierade fält skiljs från fullständigt verifierad sammansättning. Kommunfullmäktiges 35 mandat är källförda; okänt antal ersättare visas inte som ett känt tal.
- 57 uppdrag och organ finns kvar. Historiska reglementen och KS-beredning uppgraderas inte automatiskt till beslut för 2027–2030.
- Filter för delvis verifierade poster, källuppföljning och varning vid ännu ej verifierade nämndberäkningar.
- Läsande produktionstest av D1-migreringar 0001–0013 och integritet samt nya regressionstester.
- Produktionen måste granskas separat: Access, tvåanvändarprov, backup/återställning och publiceringsgrind. Se `RELEASE_1.3.1_1.4.md`.

# Ändringslogg – Politikverkstan Lekeberg

## 1.3.0 – Offentlig möteskälla till privat förberedelse

- Användaren kan välja **Förbered** på ett offentligt sammanträde och få ett osparat, privat mötesutkast med datum, tid, plats, instans och originalkälla förifyllda.
- Inget skapas i databasen förrän användaren själv sparar. Inget delas automatiskt. Privata personliga anteckningar och egna dagordningar påverkas inte av senare kommunala ändringar.
- Framåtriktad D1-migrering `0013_official_meeting_source.sql` lägger enbart till en valfri käll-URL på användarnas mötesposter; befintliga möten får tom sträng. Servern accepterar endast de fyra definierade MeetingPlus-organen med exakt samma datum.
- Läsrättigheter, revisionskontroll, radering och delning följer det befintliga `work_meetings`-API:t. Inga PDF-handlingar, privata uppgifter eller officiella beslutsstatusar importeras.
- Någon separat ursprunglig funktionsspecifikation för 1.3 har inte återfunnits; detta är en avgränsad fortsättning på de faktiskt beställda kalenderfunktionerna och ska inte förväxlas med en verifierad äldre roadmap.


## 1.2.0 – Källgranskning av organisationer och uppdrag

- Organisationernas befintliga källstatusar kan filtreras efter aktuell verifiering, historiskt dokumenterade uppgifter, saknad aktuell verifiering och valda organ utan aktuell verifiering.
- Det går att exportera en granskningslista (JSON) för samtliga 57 poster, inklusive uppgivet respektive dokumenterat platstal, källa, länk, granskningsdatum och status.
- Äldre reglementen och preliminära underlag får inte automatiskt status ”verifierad för 2026–2030”. Modellen beräknar hypotetiska utfall på tidigare kända uppgifter; rättsligt giltiga beslut måste kontrolleras.
- Publiceringskalendern från 1.0.2 och ärendeöversikten från 1.1.0 påverkas inte.


## 1.1.0 – Ärendecentrerat arbetsflöde

- Ny översikt över varje öppnat ärende med navigering till underlag, tillåtna sammanträdeskopplingar, öppna uppföljningar, internt ställningstagande och ändringshistorik.
- Saknad eller otillgänglig API-information visas som ”Laddar” eller ”Okänt”, aldrig som en obekräftad nolla. Mötens och ärendens befintliga behörighetskontroller återanvänds.
- Gränssnittet är responsivt. Ingen ny databasändring eller automatisk delning av privata uppgifter.
- 1.0.2:s officiella MeetingPlus-kalender ligger kvar fristående och stör inte ärendenas personliga möteskopplingar.


## 1.0.2 – Automatisk offentlig sammanträdeskalender

- Ny månadskalender på den skyddade sidan Sammanträden med offentlig information från Kommunfullmäktige, barn- och utbildningsnämnden, socialnämnden och kommunstyrelsen.
- Efter nätverksfel från Cloudflare Workers har MeetingPlus-importen flyttats till schemalagda GitHub Actions, som redan verifierats kunna läsa de fyra offentliga källorna. GitHub publicerar en validerad datakopia i Worker-bundlen två gånger dagligen, utan nya Cloudflare-hemligheter.
- Cloudflare Workern läser kalenderkopian utan utgående nätverksanrop. D1-migrering 0012 ligger kvar för kompatibilitet men används inte för den nya synkroniseringen.
- Källstatus och tidigare inlästa uppgifter bevaras vid tillfälliga hämtningsfel. Webbläsare och behörighetstester omfattar den nya kalendern.
- Ännu ingen automatisk nedladdning av handlingar eller dagordningar. [Driftguide 1.0.2](UPPGRADERING_1.0.2_CLOUDFLARE.md).


## 1.0.1 – Stabilisering och arbetsöversikt

- Arbetsöversikten räknar och listar nu öppna strukturerade ärendeuppföljningar utöver den personliga uppgiftslistan, utan att dubbelräkna enbart ärendestatus.
- Ny behörighetsstyrd läsning för uppföljningar på ägda ärenden och tilldelade uppföljningar i delade ärenden; återkallad delning ska inte läcka privata ärenden.
- Separat felhantering för ärendeuppföljningar: övrig information fortsätter visas vid ett partiellt API-fel och missvisande totalsiffror undviks.
- Utökade enhets- och webbläsartester för datasekretess, status, uppföljningsantal och återhämtning.
- Ingen ny databasstruktur och ingen migrering 0012. Baslinjen 0001–0011 och det kontrollerade Cloudflare-publiceringsflödet behålls.
- [Driftchecklista 1.0.1](UPPGRADERING_1.0.1_CLOUDFLARE.md).

## Navigering – förbättring efter 1.0.0

- En diskret **Tillbaka**-knapp har lagts i sidhuvudet på både den öppna portalen och den skyddade Arbetsytan.
- Webbläsarens/musens egna **Tillbaka** och **Framåt** fungerar mellan besökta vyer, utan att direkt lämna hela portalen.
- Arbetsytans historik följer även öppnade ärenden, möten och motioner utan att lägga dokumenttext i webbläsarens URL eller historikpost.
- Osparade ändringar hanteras av den befintliga navigeringskontrollen.
- Regressionstest för webbläsarhistorik har lagts till i Chromium-sviten. Ingen databasmigrering krävs.

## 1.0.0 – Spårbarhet och sammanhängande arbetsflöde

- Ärenden får databasstyrd historik över skapande, innehållsändringar, delning och ansvar. Händelser och ändringar skrivs i samma SQLite-transaktion via triggers. Historik för före-migreringsändringar kan inte återskapas.
- Ärendevyn visar behörighetskontrollerade sammanträdeskopplingar, dagordningsutfall, uppföljningar med ansvarig och tidsfrist samt detaljerad ändringshistorik.
- Särskild hantering av ställningstaganden: arbetsdiskussion, personligt, föreslaget gemensamt och uttryckligen förankrat gemensamt med källa och datum. Endast ärendeägaren kan markera internt förankrat.
- Gemensam sökingång i Arbetsytan för åtkomliga ärenden, sammanträden, motioner och dokument. Resultat filtreras server-side efter resursens behörighetsmodell.
- Publik startsida visar nu främst val av analysverktyg. Scenarioverkstaden finns som egen ingång; befintliga scenarier och beräkningar bevaras. Sidornas navigationsikoner har gjorts mer särskiljande. Beskrivningar av internt material på den publika startsidan har tonats ned.
- D1-migrering `0011_traceability.sql` lägger till granskningshändelser, uppföljningar, ställningstaganden och redaktörsmetadata. Den ändrar inga befintliga privata anteckningar.
- Nya Node-regressioner prövar historikens integritet, behörigheter, gemensam sökning, förankringskontroll och uppföljning. Produktionsmigrering och publicering sker inte automatiskt genom GitHub-ändringen.

**Begränsning:** Arbetsytans ställningstaganden och mötesutfall är internt arbetsmaterial, inte officiella kommunala beslut. Historiken innehåller avsiktligt inte privata dokument-ID:n eller personliga anteckningar. [Driftguide 1.0](UPPGRADERING_1.0_CLOUDFLARE.md).


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
