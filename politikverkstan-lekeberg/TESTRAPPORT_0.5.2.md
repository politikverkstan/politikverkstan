# Testrapport 0.5.2 – lokala kontroller

Bas: källkod från 0.5.1 ZIP i denna konversation. Ny migration kördes mot en kopia av det ursprungliga SQLite-schemat med äldre dokument och idé. Cloudflare-produktion har inte ändrats eller testats.

**Node-tester:**
- `test-engine.js`: PASS – 1 500 genererade gruppallokeringsfall och fasta referensfall.
- `test-candidates.js`: PASS – 5 000 genererade jämförelsefall och särskilda kandidatfall.
- `test-worker.mjs`: PASS – telemetry och säkerhetsgräns för administration.
- `test-private.mjs`: PASS – Access-token, befintliga privata dokument/roller.
- `test-collaboration.mjs`: PASS – aktiv gruppdelning för ägare och andra, arkivering, återställning, papperskorg, bekräftad purgning, behörigheter och idéstathistorik.

**Webbläsare (Chromium, lokal testdata):**
- `test-ui.py`: PASS – publika gränssnittet.
- `test-candidate-ui.py`: PASS – kandidatval.
- `test-v4-ui.py`: PASS – inflytande, förhandling, integritet och mobil navigation.
- `test-workroom-ui.py`: PASS – motionsskapande, PDF-export med text på svenska och mobil navigation.
- `test-collaboration-ui.py`: PASS – delning, kommentarer, idéer och utkast från idé.
- `test-layout-052.py`: PASS – ägarens gruppdelade motion syns, arkivering/återaktivering, idéstatus filtreras, grid och kortpadding samt mobil layout.

**Gränser:** Chromium UI-testerna använder ett mockat server-API. ACL och D1-logik testas separat med riktiga SQLite-frågor och signerat test-JWT; båda testtyperna är nödvändiga och ingen av dem motsvarar ett fullständigt produktionstest. `0.5.2` innehåller ingen schemagallring på tid.
