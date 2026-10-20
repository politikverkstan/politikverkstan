# Politikverkstan Lekeberg — version 0.5.0 (5.0-funktioner i första etappen)

Vidareutveckling av den **befintliga** Mandatportalen: den publika kartellbyggaren och valmotorn har behållits. En ny, skyddad applikationsdel, **SD Arbetsrum**, har tillkommit.

## Vad fungerar

**Publikt, utan inloggning** (`/`, `dist/index.html`): drag-and-drop mellan partier/karteller, mandatmatris, kandidatbaserade valsedlar, lottningar, sannolikheter, beroende val, inflytande, förhandling, sammanslagningar, scenarier och export från den tidigare versionen.

**Privat efter Cloudflare Access-inloggning** (`/arbetsrum`): privat dokumentarkiv, skapa/redigera motion, autosparning, versionshistorik och återställning, manuell idébank, enklare kvalitetskontroll av att-satser, två PDF-mallar, användaradministration och inaktivering av konton. Inloggning görs genom Cloudflare Access, åtkomst beslutas separat med serverbaserad allow-list i D1.

**Dokumentens integritet:** En administratör hanterar användarna men får inte automatiskt åtkomst till andra användares privata motioner. Dokument hämtas och ändras endast efter kontroll av JWT-signatur, audience, issuer, aktiv kontobehörighet och ägarskap. Äldre statistik över publika kartellsimuleringar har inte kopplats till dokumenten.

## Bygg och kontrollera

```sh
python build.py
npm test
npm run test:browser
```

`build.py` genererar **`dist/index.html`** för publik åtkomst och en separat servermodul `worker/workroom-page.mjs` för skyddat arbetsrum. Ingen alternativ primär HTML-fil används. Den skyddade applikationen kan inte köras fullt ut genom att öppna `index.html` lokalt; den kräver Worker, Cloudflare Access och D1.

## Produktion

Se `INSTALLATION_CLOUDFLARE.md` för stegvis installation och `SAKERHET_OCH_BEGRANSNINGAR.md` för säkerhet, integritet och återstående arbete.

Projektet behåller Worker-namnet **`mandatportal`** för att bevara befintlig workers.dev-adress. Det ändrade varumärket på sidan är **Politikverkstan Lekeberg**. Uppdatera inte Worker-namnet om adressen ska vara oförändrad.

## Juridisk grund för motionsmallen

Lekebergs officiella e-tjänst och kommunens publicerade riktlinje beskriver: (1) kortfattad rubrik, (2) bakgrund och motivering, (3) ett eller flera självständiga och tydliga beslutsförslag i att-satser och (4) namn, parti och datum. Kravet på vanligen **1–2 att-satser** i arbetsrummet är en **skrivrekommendation**, inte en juridisk övre gräns.

Källor:
- https://minasidor.lekeberg.se/oversikt/overview/417
- https://lekeberg.se/download/18.3e9921517917d3f143d857/1619695665232/Riktlinje%20f%C3%B6r%20motioner%20och%20medborgarf%C3%B6rslag.pdf

Verktyget är **inte en officiell kommunal tjänst** och har inte någon AI-API-integration. Sakuppgifter, kommunal kompetens och rätt inlämningsförfarande måste kontrolleras av användaren. Originalen till historiska SD-motioner har inte genomgått en fullständig textjämförande formgranskning i denna etapp.

## Status

Funktionerna är implementerade och lokalt testade, **inte driftsatta i användarens Cloudflare-konto**. Verifiering i faktisk produktionsmiljö och extern säkerhetsgranskning återstår.
