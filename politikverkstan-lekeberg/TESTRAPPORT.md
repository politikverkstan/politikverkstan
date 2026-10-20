# Testrapport — Politikverkstan Lekeberg 0.5.0

Testmiljö: lokalt Node.js 22, Python 3.13, Chromium via Playwright och PyMuPDF.

**Automatiserade matematiska jämförelser:**
- 1 500 gruppbaserade jämförelsefall mot oberoende referensimplementation: GODKÄNDA.
- 5 000 kandidat- och gruppbaserade jämförelsefall samt särskilda kandidatfall: GODKÄNDA.

**Cloudflare Worker / behörighet:**
- Signerat JWT, fel audience, ogiltigt konto, engångsbootstrap, administratör/user, serverbaserad ägarkontroll, nekad åtkomst till andras dokument, inaktivering, optimistic revision/version conflict, återställning och idébank: GODKÄNDA i lokal anpassare med SQLite.
- Befintlig aggregationsstatistik, validering och privat adminpanel: GODKÄNDA i tidigare testsvit.

**Webbläsare:**
- Publik kartellbyggare, kandidatval, inflytande, förhandling, integritetsvy, mobilnavigering: GODKÄNDA.
- Arbetsrummets användargränssnitt med mockat, autentiserat API: skapa/redigera/spara motion, två mallar till PDF, mobilnavigering: GODKÄNDA.
- Exporterad provmotion granskad med PyMuPDF: giltig A4, markerbar och läsbar svensk text (inklusive å, ä, ö): GODKÄND.

**Kvarstående tester före skarp drift:**
- Riktig Cloudflare Access-policy för båda skyddade sökvägarna.
- D1-migrering och rättighetsprov i användarens eget konto.
- Fel-/lasttester och oberoende penetrationstest.
- Belastning och kontinuitet för autosparning från flera samtidiga klienter.
- Formell juridisk godkännandekontroll av motionsmall och dokumentens faktainnehåll.

Att testerna passerar innebär inte att juridiska specialregler, hela driftmiljön eller all säkerhet är formellt verifierad.
