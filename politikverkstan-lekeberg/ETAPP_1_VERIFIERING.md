# Etapp 1: källkvalitet, guidad mandatberäkning och driftkontroller
Datum: 2026-10-21 · Version: 0.6.0

## Omfattning
Etapp 1 förbättrar den **publika** delen av Politikverkstan. Inga privata motioner, filarkiv, konton eller API-behörigheter ska presenteras där. Den inloggade Arbetsytan och dess behörighetsmodell är oförändrade.

### 1. Guidad analys
- Tre frivilliga steg: välj nämnd, välj hypotetisk valteknisk gruppering, se utfall.
- Fyra organ med historiskt dokumenterade platstal visas i guiden: kommunstyrelsen, socialnämnden, barn- och utbildningsnämnden och valnämnden.
- Beräkningen använder den **befintliga** beräkningsmotorn. Inga nya valrättsliga antaganden har lagts till.
- Resultatet visar grupp för grupp säkra platser i **modellen**, förväntat värde och möjliga intervall. Osäkerheter och källstatus förklaras.
- Guiden ändrar inte det aktiva scenariot förrän användaren väljer **Visa i mandatmatrisen**.
- Det avancerade beräkningsläget är kvar.

### 2. Genomgång av organisationsregistret
Totalt **57 poster** i `src/organizations.json`. Deras befintliga status har behållits:
- **10 historiska**: de tillgängliga uppgifterna har åter kontrollerats mot det av fullmäktige fastställda reglementet daterat 2025-03-03, avsnitt 1.1 (PDF-sida 4). Detta är **inte** ett beslut om slutlig sammansättning 2026–2030.
- **40 okända**: endast preliminärt arbetsunderlag utan verifierad aktuell tillsättning eller platstal.
- **6 preliminära** och **1 förslag 2026**: förslagsuppgifter, inte slutligt verifierade för mandatperioden.
- För de tio historiska posterna finns nu kontroll-/källdatum, granskningsförklaring och länk till kommunens officiella styrdokumentssida.
- Även de andra posterna får ett tydligt fält med verifieringsbegränsningen i den publika organisationstabellen.
- Skillnaden mellan uppgivet platstal och separat dokumenterat Lekebergstal behålls; framför allt ska den samverkande Sydnärkes IT-nämndens tidigare totaluppgift **4+4** inte uppfattas som Lekebergs egna platser **1+1**.
- Inga platstal har ändrats utan tillräckliga nya beslutsbelägg.

**Källor**
1. Lekebergs kommuns officiella styrdokument: https://lekeberg.se/kommunochpolitik/planerochstyrdokument.4.711bc06b14820d116bc1b58.html?folder=19.711bc06b14820d116bc4a28
2. Kommunfullmäktiges ärende om ny bygg- och miljönämnd 2026-04-27: https://meetings.lekeberg.se/committees/kommunfullmaktige/mote-2026-04-27
3. Valmyndighetens valresultat 2026: https://www.val.se/valresultat-och-statistik/riksdags--region--och-kommunval/valresultat-2026
4. Källmaterialet till preliminära uppdrag: `Samtliga uppdrag kommande mandatperiod.xlsx` (arbetsunderlag, ej fastställt beslut).

**Fortsatt verifieringsbehov:** Kontrollera nya nämndreglementen, mandattid och exakt beslut om tillsättning med kommunsekreteraren, särskilt när ny nämndorganisation införs 2027. Styrk också partiernas mandatuppgifter direkt mot det slutliga kommunvalsbeslutet, inte enbart sekundära webbplatser. Uppdatera enskilda poster först när beslutsunderlag anger organ, platstal, tillämpligt datum och beslutets status.

### 3. Test och driftsättning
- `npm test` omfattar nu `test-stage1.mjs` utöver de tidigare motortesterna.
- `npm run test:browser` omfattar nu `test-guide-ui.py` för guidens alla steg och källmarkeringarna.
- `python build.py` genererar fortfarande `dist/index.html` och `index.html` från samma källfiler; inga ändringar krävs i Cloudflare D1 för etapp 1.
- **Utförd kontroll vid utveckling:** JavaScript-syntax, publicerat HTML-pakets överensstämmelse med källfiler och frånvaro av privata dokument-API:er i den publika HTML-filen.
- **Inte verifierat i denna miljö:** körning av fullständig Node-/Chromium-testsvit, drift och publicering i Cloudflare, HTTPS-/Access-konfiguration, rättighetskontroller med olika användare, återställning av D1 samt mobilvisning i verklig webbläsare.
- Ett försök att nå den tidigare angivna publika Cloudflare-URL:en från webbsökningsmiljön misslyckades. Det betyder *inte* att webbplatsen är nere.

**Innan etappen betraktas som produktionsklar:** kör `npm run build && npm test && npm run test:browser`; kontrollera faktisk publicerings-URL, guidens tre steg, mobilvy och mörkt tema, navigering till Arbetsytan och att ingen publik begäran hämtar privata handlingar. Ta säkerhetskopia av D1 före framtida migreringar. Den tidigare filarkivmigreringen `0006_files.sql` kan fortfarande behövas om 0.5.4 inte installerats.

## Säkerhets- och kvalitetsprinciper
- Beräknade sannolikheter är matematiska modellsvar, inte juridiskt säkerställda personvalsresultat.
- Uppgivet, historiskt dokumenterat, förslag och slutligt beslutat är olika sakförhållanden.
- Privata handlingar publiceras inte och skickas inte till öppen analys.
- Om källunderlag inte stöder en ändring av platstal behålls ursprungssiffran med varning tills beslut kan kontrolleras.
