# Testrapport – Politikverkstan 0.5.1

**Miljö:** lokal Node.js 22, SQLite via `node:sqlite`, Python 3.13, Chromium/Playwright och PyMuPDF. Tester gjordes med lokal D1-kompatibel anpassare och mockade Access-JWT-signaturer, inte med kundens produktionskonto.

### Regression (verifierade PASS)

- `node tests/test-engine.js`: 1 500 genererade gruppfördelningsfall mot oberoende referensfunktion samt tröskel- och lottningsfall.
- `node tests/test-candidates.js`: 5 000 genererade kandidat-/gruppjämförelser samt testfall för särskilda valsedelsfall.
- `node tests/test-worker.mjs`: tidigare Worker, statistik, signerat JWT och separat adminpanel.
- `node tests/test-private.mjs`: grundläggande privat inloggning, bootstrap, användarroller, äldre ägarisolering, versioner, kontoavaktivering.

### Nya tester (verifierade PASS)

- `node tests/test-collaboration.mjs`: migrerar riktig 0.5.0-struktur med sparad privat motion och idé; kontrollerar att innehållet bevaras och förblir privat, delning till särskilda användare, gruppåtkomst, olika behörighetsnivåer, kommentarer, versionskonflikter, återställning, återkallelse, inaktiverat konto, nekad admin-genväg, användarskapade idéer och behörighetsfiltrerade kopplingar mellan idé och motion.
- `python tests/test-collaboration-ui.py`: Chrome/Playwright med mockat API, delningsdialog, kommentarer, användarskapad idé, idékommentarer, skapa privat motion av idé samt separat visning av läsbehörigt dokument utan redigeringsknappar.
- `python tests/test-workroom-ui.py`: gammal motionsverkstad, A4-PDF i två mallar, svensk sökbar text, mobilmeny.
- `python tests/test-ui.py`, `test-candidate-ui.py`, `test-v4-ui.py`: tidigare publika UI-vyer samt mobil.

### Kvarstående / ej verifierat

- Verkligt installationsprov i Cloudflares produktions-D1, Access och HTTP-cache.
- Samtidighet och belastning mot verklig, geografiskt distribuerad D1-databas.
- Extern penetrationstestning och fullt säkerhets-/dataskyddsgodkännande före hantering av känsliga interna dokument.
- Systematiskt användartest av alla kombinationer av små mobilskärmar, mycket långa motioner och extrema dokumentvolymer.
- Fullständig legal kontroll av alla kommunala utnämningar i den publika delen. Matematisk testpassering är inte en juridisk garanti.

Den administrativa Cloudflare-konfigurationen, D1 UUID och Access AUD ingår inte som verkliga kontovärden i paketet.
