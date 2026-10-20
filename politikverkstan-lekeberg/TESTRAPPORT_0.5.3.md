# Testrapport – 0.5.3 (lokal testmiljö)

- `npm test`: PASS. 1 500 genererade gruppreferenser, 5 000 kandidatjämförelser och serverbaserade tester för Workers, behörighet och samarbete.
- `npm run test:browser`: PASS. Befintliga Chromium-tester av publik portal, arbetsrum, delning, idéer, PDF-export, layouter och mobilvy.
- En särskild lokal PDF-kontroll med egenritad testbild: PASS. Tvåsidig PDF, bild på första sidan, markerbar svensk text, undertecknare och sidfot.
- `node --check` för lokalt uppdaterade moduler: PASS.
- Ny tabell i `0005_branding.sql` utan destruktiva ändringar.

Ännu inte verifierat i användarens produktionskonto: verklig Cloudflare Access-session och deploystatus efter commits. SD:s officiella typsnitt är inte verifierat. PDF stöder inte full Unicode-teckentäckning och förhandsgranskningen är inte sidbrytningsidentisk.
