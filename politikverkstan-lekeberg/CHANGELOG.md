# Ändringslogg

## 0.5.0 — Politikverkstan Lekeberg

- Bevarad publik mandatmotor och tidigare simulationer.
- Namnbyte i gränssnittet till Politikverkstan Lekeberg; själva Worker-namnet `mandatportal` behålls.
- Ny djupblå/gul visuell profil, utan att byta partiernas individuella kartellfärger.
- Länk från publika portalen till skyddat SD Arbetsrum.
- Ny Cloudflare Worker-route `/arbetsrum` och nytt skyddat API `/api/private/*`.
- Serverbaserad D1-tillåten användarlista med rollerna admin och user, inaktivering, engångsbootstrap och hård ägarisolering av dokument.
- Motionsredigerare med bakgrund, motivering, att-satser, status, undertecknare, egna arbetsanteckningar, autosparning, versionshistorik och återställning.
- Två PDF-mallar i A4 utan AI-tjänst. PDF-filerna innehåller markerbar text och kan öppnas med standard-PDF-läsare.
- Manuell gemensam idébank, men ingen automatisk AI-generering.
- Migrering `0002_workroom.sql`, separat testsvit för privata API-funktioner och webbläsartester för dokumentexport.
- Befintliga webbläsartestets titelassertion ändrades från `Mandatportal` till `Politikverkstan` enbart för att avspegla avsiktligt namnbyte.

### Ännu inte färdigt

Livekonfiguration av Cloudflare Access och D1 i användarens konto, oberoende formgranskning av äldre originalmotioner, delning av privata dokument, AI-funktioner och fullständiga automatiska juridiska kontroller.
