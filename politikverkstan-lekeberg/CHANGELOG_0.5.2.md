# Ändringar i 0.5.2

- **Buggfix:** Den som skapat en gruppdelad motion ser den också under Våra motioner. Samma dokument-ID återanvänds, ingen duplicering.
- **Motionsarkiv:** Arkivera och återaktivera dokument; arkiverade dokument döljs från aktiva listor och är skrivskyddade tills de återställs.
- **Papperskorg:** Flytta, återställ, samt separat bekräftad permanent radering. Inga automatiska destruktiva gallringar.
- **Idéer:** Aktiva/Avslutade/Alla, direkt uppdaterade listor och statusräknare; serverlagrad statusändringshistorik för framtida byten.
- **Layout:** Två balanserade kortkolumner på normal desktop, fyra på mycket bred viewport och en på mobil; mer avstånd till Senaste utkast.
- **Integritet:** Inre padding, mellanrum och textbredd på alla tre informationspaneler.
- **D1:** `migrations/0004_lifecycle.sql`, som bevarar befintlig data.
- **Tester:** Nya API-kontroller för grupplistor, arkiv, åtkomst, papperskorg, purgning och idéstathistorik samt Chromium-layouttest.

## Medvetet ej implementerat

- Automatisk radering ur papperskorgen.
- Personlig dold-lista för andras motioner.
- Obegränsat antal samtidiga redaktörer i realtid. Existerande revisionskontroll behålls.
